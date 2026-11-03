const Athlete = require('../models/Athlete');
const Counter = require('../models/Counter');
const Registration = require('../models/Registration');
const RegistrationControls = require('../models/RegistrationControls');

const getModalityAliases = (modality) => [
  modality.name,
  modality.slug,
  ...(modality.legacyNames || []),
  ...(modality.legacySlugs || []),
];

const getGlobalModalityLimit = (controls, modalitySlug) => {
  const entry = controls?.globalModalityLimits?.find((item) => item.modalitySlug === modalitySlug);
  return entry?.maxAthletes == null ? null : entry.maxAthletes;
};

const getModalityRegistrationCounts = async (modality) => {
  const aliases = getModalityAliases(modality);
  const [athleteIds, registrationIds, pendingAthleteIds, pendingRegistrationIds] = await Promise.all([
    Athlete.distinct('_id', {
      $or: [
        { modality: { $in: aliases } },
        { modalities: { $in: aliases } },
        { 'modalityRegistrations.modality': { $in: aliases } },
      ],
    }),
    Registration.distinct('athleteId', { modality: { $in: aliases } }),
    Athlete.distinct('_id', {
      approvalStatus: { $in: ['pending', 'rejected'] },
      $or: [
        { modality: { $in: aliases } },
        { modalities: { $in: aliases } },
        { 'modalityRegistrations.modality': { $in: aliases } },
      ],
    }),
    Registration.distinct('athleteId', { modality: { $in: aliases }, status: { $in: ['pending', 'rejected'] } }),
  ]);
  const registeredIds = new Set([...athleteIds, ...registrationIds].map(String));
  const pendingIds = new Set([...pendingAthleteIds, ...pendingRegistrationIds].map(String));
  return {
    registeredCount: registeredIds.size,
    pendingCount: [...pendingIds].filter((athleteId) => registeredIds.has(athleteId)).length,
  };
};

const countModalityRegistrations = async (modality) => (
  (await getModalityRegistrationCounts(modality)).registeredCount
);

const ensureCounter = async (modality) => {
  const counterId = `global-modality:${modality.slug}`;
  const existingCounter = await Counter.findById(counterId).lean();
  if (existingCounter) return existingCounter;

  const count = await countModalityRegistrations(modality);
  try {
    return await Counter.findOneAndUpdate(
      { _id: counterId },
      { $setOnInsert: { sequence: count } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Counter.findById(counterId).lean();
  }
};

const athleteHasModality = (athlete, aliases) => Boolean(athlete && [
  athlete.modality,
  ...(athlete.modalities || []),
  ...(athlete.modalityRegistrations || []).map((entry) => entry.modality),
].some((value) => aliases.some((alias) => String(value || '').trim().toLowerCase() === String(alias).trim().toLowerCase())));

const reserveGlobalModalityRegistration = async (athleteId, modality) => {
  if (modality.slug === 'corrida-5km') return { reserved: false };

  const controls = await RegistrationControls.findById('global').lean();
  const limit = getGlobalModalityLimit(controls, modality.slug);
  if (limit == null) return { reserved: false };

  const aliases = getModalityAliases(modality);
  const [athlete, existingRegistration] = await Promise.all([
    Athlete.findById(athleteId).select('modality modalities modalityRegistrations').lean(),
    Registration.exists({ athleteId, modality: { $in: aliases } }),
  ]);
  if (athleteHasModality(athlete, aliases) || existingRegistration) {
    return { reserved: false, alreadyCounted: true };
  }

  await ensureCounter(modality);
  const counter = await Counter.findOneAndUpdate(
    { _id: `global-modality:${modality.slug}`, sequence: { $lt: limit } },
    { $inc: { sequence: 1 } },
    { new: true }
  ).lean();
  return counter ? { reserved: true } : { reserved: false, full: true, limit };
};

const releaseGlobalModalityRegistration = async (athleteId, modality) => {
  if (!modality || modality.slug === 'corrida-5km') return false;
  const aliases = getModalityAliases(modality);
  const [athlete, existingRegistration] = await Promise.all([
    Athlete.findById(athleteId).select('modality modalities modalityRegistrations').lean(),
    Registration.exists({ athleteId, modality: { $in: aliases } }),
  ]);
  if (athleteHasModality(athlete, aliases) || existingRegistration) return false;

  const result = await Counter.updateOne(
    { _id: `global-modality:${modality.slug}`, sequence: { $gt: 0 } },
    { $inc: { sequence: -1 } }
  );
  return result.modifiedCount > 0;
};

module.exports = {
  countModalityRegistrations,
  getModalityRegistrationCounts,
  getGlobalModalityLimit,
  releaseGlobalModalityRegistration,
  reserveGlobalModalityRegistration,
};
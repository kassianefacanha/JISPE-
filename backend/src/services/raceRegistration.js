const Athlete = require('../models/Athlete');
const Registration = require('../models/Registration');
const RegistrationControls = require('../models/RegistrationControls');
const { defaultModalities } = require('../config/defaultModalities');

const raceRegistrationLimit = 3000;
const raceModality = defaultModalities.find((modality) => modality.slug === 'corrida-5km');
const raceAliases = [raceModality.name, raceModality.slug, ...(raceModality.legacyNames || []), ...(raceModality.legacySlugs || [])];

const hasRaceModality = (athlete) => [athlete.modality, ...(athlete.modalities || [])]
  .some((modality) => raceAliases.some((alias) => String(modality || '').trim().toLowerCase() === alias.toLowerCase()));

const getRaceRegistrationCount = async () => {
  const [athleteIds, registrationAthleteIds] = await Promise.all([
    Athlete.distinct('_id', {
      $or: [{ modality: { $in: raceAliases } }, { modalities: { $in: raceAliases } }],
    }),
    Registration.distinct('athleteId', { modality: { $in: raceAliases } }),
  ]);
  return new Set([...athleteIds, ...registrationAthleteIds].map(String)).size;
};

const ensureCounter = async () => {
  const count = await getRaceRegistrationCount();
  await RegistrationControls.findOneAndUpdate(
    { _id: 'global' },
    { $setOnInsert: { entityRegistrationOpen: true, athleteRegistrationOpen: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  await RegistrationControls.updateOne(
    { _id: 'global', raceRegistrationCount: { $exists: false } },
    { $set: { raceRegistrationCount: count } }
  );
};

const reserveRaceRegistration = async (athleteId) => {
  const existingAthlete = await Athlete.findById(athleteId).select('modality modalities').lean();
  if (existingAthlete && hasRaceModality(existingAthlete)) return { reserved: false, alreadyCounted: true };
  const existingRegistration = await Registration.exists({ athleteId, modality: { $in: raceAliases } });
  if (existingRegistration) return { reserved: false, alreadyCounted: true };

  await ensureCounter();
  const reservation = await RegistrationControls.findOneAndUpdate(
    { _id: 'global', raceRegistrationCount: { $lt: raceRegistrationLimit } },
    { $inc: { raceRegistrationCount: 1 } },
    { new: true }
  );
  return reservation ? { reserved: true, alreadyCounted: false } : { reserved: false, full: true };
};

const releaseRaceRegistration = async (athleteId) => {
  const [athlete, registration] = await Promise.all([
    Athlete.findById(athleteId).select('modality modalities').lean(),
    Registration.exists({ athleteId, modality: { $in: raceAliases } }),
  ]);
  if ((athlete && hasRaceModality(athlete)) || registration) return;
  await RegistrationControls.updateOne(
    { _id: 'global', raceRegistrationCount: { $gt: 0 } },
    { $inc: { raceRegistrationCount: -1 } }
  );
};

module.exports = {
  getRaceRegistrationCount,
  raceAliases,
  raceRegistrationLimit,
  releaseRaceRegistration,
  reserveRaceRegistration,
};
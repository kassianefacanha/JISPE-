const express = require('express');
const rateLimit = require('express-rate-limit');
const Athlete = require('../models/Athlete');
const Entity = require('../models/Entity');
const RegistrationControls = require('../models/RegistrationControls');
const { getRaceRegistrationCount, raceRegistrationLimit } = require('../services/raceRegistration');
const { generateMatricula } = require('../utils/matriculaGenerator');
const { isValidCPF } = require('../utils/cpfValidator');
const { isAthleteApproved } = require('../services/athleteApproval');
const { generateAthleteBadge } = require('../services/athleteBadge');
const { deleteReplacedAsset, getAssetUrl, isSameStoredAsset, storeAsset } = require('../services/r2Storage');
const { getAgeCategory } = require('../services/ageCategory');
const { getModalityCatalog } = require('../config/defaultModalities');
const Modality = require('../models/Modality');
const EntityModalityRule = require('../models/EntityModalityRule');
const { validateUploadedAsset } = require('../utils/uploadValidation');
const { raceAliases, releaseRaceRegistration, reserveRaceRegistration } = require('../services/raceRegistration');

const router = express.Router();
const badgeLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de validação. Tente novamente em 15 minutos.' },
});
const registrationLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de consulta. Tente novamente em 15 minutos.' },
});

const findAthleteByEmailAndCpf = async (emailValue, cpfValue) => {
  const email = String(emailValue || '').trim().toLowerCase();
  const cpf = String(cpfValue || '').replace(/\D/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isValidCPF(cpf)) {
    return { error: 'Informe um e-mail e um CPF válidos.' };
  }

  const athletes = await Athlete.find({ email })
    .select('fullName email cpf birthDate approvalStatus matricula photoUrl ageCategory modality modalities naipe entityId')
    .exec();
  const matches = athletes.filter((athlete) => String(athlete.cpf || '').replace(/\D/g, '') === cpf);
  if (!matches.length) return { error: 'Não foi possível localizar uma inscrição com os dados informados.', notFound: true };
  if (matches.length > 1) return { error: 'Há mais de uma inscrição com esses dados. Entre em contato com o suporte.', conflict: true };
  return { athlete: matches[0] };
};

const getModalityAliases = (modality) => [
  modality.name,
  modality.slug,
  ...(modality.legacyNames || []),
  ...(modality.legacySlugs || []),
];

const hasConflictingBinaryNaipe = (entries) => {
  const naipes = new Set(entries.map((entry) => entry.naipe));
  return naipes.has('masculino') && naipes.has('feminino');
};

router.get('/registration-status', async (req, res, next) => {
  try {
    const controls = await RegistrationControls.findById('global').lean();
    const raceRegistrationCount = await getRaceRegistrationCount(controls);
    res.json({
      success: true,
      entityRegistrationOpen: controls?.entityRegistrationOpen !== false,
      athleteRegistrationOpen: controls?.athleteRegistrationOpen !== false,
      selfAthleteRegistrationOpen: controls?.selfAthleteRegistrationOpen !== false,
      raceRegistrationOpen: raceRegistrationCount < raceRegistrationLimit,
      raceRegistrationCount,
      raceRegistrationLimit,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/entities', async (req, res, next) => {
  try {
    const entities = await Entity.find({ status: 'approved' })
      .select('_id name')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, entities });
  } catch (error) {
    next(error);
  }
});

router.post('/registration-status', registrationLookupLimiter, async (req, res, next) => {
  try {
    const result = await findAthleteByEmailAndCpf(req.body?.email, req.body?.cpf);
    if (result.error) {
      const status = result.notFound ? 404 : result.conflict ? 409 : 400;
      return res.status(status).json({ success: false, message: result.error });
    }

    const { athlete } = result;
    const approved = isAthleteApproved(athlete);
    return res.json({
      success: true,
      athlete: {
        fullName: athlete.fullName,
        approvalStatus: approved ? 'approved' : athlete.approvalStatus,
        modality: athlete.modality,
        modalities: athlete.modalities,
        modalityRegistrations: athlete.modalityRegistrations,
        naipe: athlete.naipe,
        photoUrl: await getAssetUrl(athlete.photoUrl),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/registration-status/update', registrationLookupLimiter, async (req, res, next) => {
  try {
    const result = await findAthleteByEmailAndCpf(req.body?.email, req.body?.cpf);
    if (result.error) {
      const status = result.notFound ? 404 : result.conflict ? 409 : 400;
      return res.status(status).json({ success: false, message: result.error });
    }

    const { athlete } = result;
    if (!isAthleteApproved(athlete)) {
      return res.status(403).json({
        success: false,
        message: 'A edição da modalidade e da foto está disponível somente para inscrições aprovadas.',
      });
    }

    const { modalityRegistrations, photoUrl } = req.body || {};
    if (!Array.isArray(modalityRegistrations) || !modalityRegistrations.length) {
      return res.status(400).json({ success: false, message: 'Selecione pelo menos uma modalidade.' });
    }

    const requestedEntries = modalityRegistrations.map((entry) => ({
      modality: String(entry?.modality || '').trim(),
      naipe: String(entry?.naipe || '').trim(),
    }));
    if (requestedEntries.some((entry) => !entry.modality || !entry.naipe)) {
      return res.status(400).json({ success: false, message: 'Informe uma modalidade e um naipe para cada inscrição.' });
    }
    if (hasConflictingBinaryNaipe(requestedEntries)) {
      return res.status(400).json({ success: false, message: 'O atleta não pode se inscrever nos naipes masculino e feminino ao mesmo tempo. O naipe misto pode ser combinado com qualquer um.' });
    }

    const assetError = photoUrl !== undefined
      && !isSameStoredAsset(photoUrl, athlete.photoUrl)
      ? validateUploadedAsset(photoUrl, 'photo')
      : null;
    if (assetError) return res.status(400).json({ success: false, message: assetError });

    const activeModalities = getModalityCatalog(await Modality.find({ active: true }).lean());
    const modalityDefinitions = requestedEntries.map((entry) => activeModalities.find((definition) => (
      getModalityAliases(definition).includes(entry.modality)
    )));
    if (modalityDefinitions.some((definition) => !definition)) {
      return res.status(400).json({ success: false, message: 'Selecione uma modalidade válida.' });
    }
    if (modalityDefinitions.some((definition, index) => !definition.genders?.includes(requestedEntries[index].naipe))) {
      return res.status(400).json({ success: false, message: 'O naipe selecionado não é permitido na modalidade correspondente.' });
    }

    const modalityEntries = modalityDefinitions.map((definition, index) => ({
      modality: definition.slug,
      naipe: requestedEntries[index].naipe,
    }));
    const modalityEntryKeys = modalityEntries.map(({ modality, naipe }) => `${modality}:${naipe}`);
    if (new Set(modalityEntryKeys).size !== modalityEntryKeys.length) {
      return res.status(400).json({ success: false, message: 'Não é possível repetir a mesma modalidade e o mesmo naipe.' });
    }
    const modalityNames = [...new Set(modalityDefinitions.map((definition) => definition.name))];

    const previousModalities = [athlete.modality, ...(athlete.modalities || [])];
    const newlySelectedModalities = modalityDefinitions.filter((definition) => (
      !previousModalities.some((name) => getModalityAliases(definition).includes(name))
    ));
    for (const definition of newlySelectedModalities) {
      const modalityRule = await EntityModalityRule.findOne({
        entityId: athlete.entityId,
        modalitySlug: definition.slug,
      }).lean();
      if (modalityRule?.enabled === false) {
        return res.status(403).json({ success: false, message: `O cadastro de atletas em ${definition.name} está bloqueado para o seu órgão.` });
      }

      const officialLimit = definition.maxTeamsPerEntity && definition.maxAthletesPerTeam
        ? definition.maxTeamsPerEntity * definition.maxAthletesPerTeam
        : null;
      const modalityLimit = modalityRule ? modalityRule.maxAthletes : officialLimit;
      const aliases = getModalityAliases(definition);
      const registeredCount = await Athlete.countDocuments({
        _id: { $ne: athlete._id },
        entityId: athlete.entityId,
        $or: [{ modality: { $in: aliases } }, { modalities: { $in: aliases } }],
      });
      if (modalityLimit != null && registeredCount >= modalityLimit) {
        return res.status(403).json({
          success: false,
          message: `Seu órgão atingiu o limite de ${modalityLimit} atletas para ${definition.name}.`,
        });
      }
    }

    const previousHadRace = previousModalities.some((name) => raceAliases.includes(name));
    const hasRace = modalityNames.some((name) => raceAliases.includes(name));
    const previousPhotoUrl = athlete.photoUrl;
    let raceReserved = false;
    if (isAthleteApproved(athlete) && hasRace && !previousHadRace) {
      const reservation = await reserveRaceRegistration(athlete._id);
      if (reservation.full) {
        return res.status(409).json({ success: false, message: 'As inscrições para a corrida foram encerradas: limite de 3.000 corredores atingido.' });
      }
      raceReserved = reservation.reserved;
    }

    const primaryModality = modalityDefinitions[0];
    let updated;
    try {
      athlete.modalityRegistrations = modalityDefinitions.map((definition, index) => ({
        modality: definition.name,
        naipe: requestedEntries[index].naipe,
      }));
      athlete.modality = primaryModality.name;
      athlete.modalities = modalityNames;
      athlete.naipe = requestedEntries[0].naipe;
      athlete.gender = requestedEntries[0].naipe;
      athlete.ageCategory = getAgeCategory(
        athlete.birthDate,
        primaryModality.name,
        primaryModality.categories || []
      );
      if (photoUrl !== undefined && !isSameStoredAsset(photoUrl, athlete.photoUrl)) {
        athlete.photoUrl = await storeAsset(photoUrl, `athletes/${athlete._id}/photo`, athlete.photoUrl);
      }
      await athlete.save();
      updated = athlete;
    } catch (error) {
      if (raceReserved) await releaseRaceRegistration(athlete._id);
      throw error;
    }

    if (isAthleteApproved(updated) && previousHadRace && !hasRace) {
      await releaseRaceRegistration(updated._id);
    }
    void deleteReplacedAsset(previousPhotoUrl, updated.photoUrl);

    return res.json({
      success: true,
      athlete: {
        fullName: updated.fullName,
        approvalStatus: isAthleteApproved(updated) ? 'approved' : updated.approvalStatus,
        modality: updated.modality,
        modalities: updated.modalities,
        modalityRegistrations: updated.modalityRegistrations,
        naipe: updated.naipe,
        photoUrl: await getAssetUrl(updated.photoUrl),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/registration-status/badge', registrationLookupLimiter, async (req, res, next) => {
  try {
    const result = await findAthleteByEmailAndCpf(req.body?.email, req.body?.cpf);
    if (result.error) {
      const status = result.notFound ? 404 : result.conflict ? 409 : 400;
      return res.status(status).json({ success: false, message: result.error });
    }

    const { athlete } = result;
    if (!isAthleteApproved(athlete)) {
      return res.status(403).json({ success: false, message: 'A carteirinha ficará disponível após a aprovação do cadastro pelo órgão.' });
    }

    if (!athlete.matricula) {
      athlete.matricula = await generateMatricula();
      await athlete.save();
    }

    const entity = await Entity.findById(athlete.entityId).select('name');
    const pdf = await generateAthleteBadge(athlete, entity?.name || 'Sem órgão');
    const normalizedMatricula = athlete.matricula.replace(/\s+/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carteirinha-${normalizedMatricula}.pdf`);
    return res.send(pdf);
  } catch (error) {
    return next(error);
  }
});

router.get('/validate/:matricula', badgeLookupLimiter, async (req, res, next) => {
  try {
    const rawMatricula = String(req.params.matricula || '').trim();
    const normalized = rawMatricula.replace(/\s+/g, '').trim();
    const formattedMatricula = normalized.replace(/^(\d{4})(\d{4})$/, '$1 $2');
    const matriculaCandidates = [...new Set([rawMatricula, normalized, formattedMatricula])];

    const athlete = await Athlete.findOne({ matricula: { $in: matriculaCandidates } })
      .select('fullName photoUrl matricula ageCategory modality naipe entityId approvalStatus')
      .populate('entityId', 'name')
      .lean();

    if (!athlete || !isAthleteApproved(athlete)) {
      return res.status(404).json({ success: false, message: 'Carteirinha não localizada' });
    }

    const entityName = athlete.entityId?.name || '';

    res.json({
      success: true,
      athlete: {
        fullName: athlete.fullName,
        photoUrl: await getAssetUrl(athlete.photoUrl),
        matricula: athlete.matricula,
        ageCategory: athlete.ageCategory,
        modality: athlete.modalities?.length ? athlete.modalities.join(', ') : athlete.modality,
        naipe: athlete.naipe,
        entity: entityName,
        status: 'Ativo',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

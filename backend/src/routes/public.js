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
const { getAssetUrl } = require('../services/r2Storage');

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
    .select('fullName email cpf approvalStatus matricula photoUrl ageCategory modality modalities naipe entityId')
    .exec();
  const matches = athletes.filter((athlete) => String(athlete.cpf || '').replace(/\D/g, '') === cpf);
  if (!matches.length) return { error: 'Não foi possível localizar uma inscrição com os dados informados.', notFound: true };
  if (matches.length > 1) return { error: 'Há mais de uma inscrição com esses dados. Entre em contato com o suporte.', conflict: true };
  return { athlete: matches[0] };
};

router.get('/registration-status', async (req, res, next) => {
  try {
    const controls = await RegistrationControls.findById('global').lean();
    const raceRegistrationCount = await getRaceRegistrationCount();
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

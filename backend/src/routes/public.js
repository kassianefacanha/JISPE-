const express = require('express');
const rateLimit = require('express-rate-limit');
const Athlete = require('../models/Athlete');
const RegistrationControls = require('../models/RegistrationControls');
const { getAssetUrl } = require('../services/r2Storage');

const router = express.Router();
const badgeLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas de validação. Tente novamente em 15 minutos.' },
});

router.get('/registration-status', async (req, res, next) => {
  try {
    const controls = await RegistrationControls.findById('global').lean();
    res.json({
      success: true,
      entityRegistrationOpen: controls?.entityRegistrationOpen !== false,
      athleteRegistrationOpen: controls?.athleteRegistrationOpen !== false,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/validate/:matricula', badgeLookupLimiter, async (req, res, next) => {
  try {
    const rawMatricula = String(req.params.matricula || '').trim();
    const normalized = rawMatricula.replace(/\s+/g, '').trim();
    const formattedMatricula = normalized.replace(/^(\d{4})(\d{4})$/, '$1 $2');
    const matriculaCandidates = [...new Set([rawMatricula, normalized, formattedMatricula])];

    const athlete = await Athlete.findOne({ matricula: { $in: matriculaCandidates } })
      .select('fullName photoUrl matricula ageCategory modality naipe entityId')
      .populate('entityId', 'name')
      .lean();

    if (!athlete) {
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
        modality: athlete.modality,
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

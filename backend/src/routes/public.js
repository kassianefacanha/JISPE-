const express = require('express');
const Athlete = require('../models/Athlete');
const Entity = require('../models/Entity');
const RegistrationControls = require('../models/RegistrationControls');

const router = express.Router();

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

router.get('/validate/:matricula', async (req, res, next) => {
  try {
    const rawMatricula = String(req.params.matricula || '').trim();
    const normalized = rawMatricula.replace(/\s+/g, '').trim();

    const candidates = await Athlete.find({ matricula: { $ne: null } }).populate('entityId', 'name').lean();
    const athlete = candidates.find((candidate) => (
      String(candidate.matricula || '').replace(/\s+/g, '') === normalized
    ));

    if (!athlete) {
      return res.status(404).json({ success: false, message: 'Carteirinha não localizada' });
    }

    const entityName = athlete.entityId && typeof athlete.entityId === 'object' ? athlete.entityId.name : await Entity.findById(athlete.entityId).then((entity) => entity?.name || '');

    res.json({
      success: true,
      athlete: {
        id: athlete._id,
        fullName: athlete.fullName,
        photoUrl: athlete.photoUrl || '',
        matricula: athlete.matricula,
        ageCategory: athlete.ageCategory,
        modality: athlete.modality,
        naipe: athlete.naipe,
        entity: entityName,
        entityId: athlete.entityId,
        email: athlete.email,
        status: 'Ativo',
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

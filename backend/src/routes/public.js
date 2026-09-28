const express = require('express');
const Athlete = require('../models/Athlete');
const Entity = require('../models/Entity');

const router = express.Router();

router.get('/validate/:matricula', async (req, res, next) => {
  try {
    const rawMatricula = String(req.params.matricula || '').trim();
    const normalized = rawMatricula.replace(/\s+/g, '').trim();

    const candidates = await Athlete.find({ matricula: { $ne: null } }).populate('entityId', 'name').lean();
    const athlete = candidates.find((candidate) => {
      const storedNormalized = String(candidate.matricula || '').replace(/\s+/g, '');
      const storedWithSpace = candidate.matricula && /^\d{4}\s\d{4}$/.test(candidate.matricula)
        ? candidate.matricula
        : storedNormalized.replace(/^(\d{4})(\d{4})$/, '$1 $2');

      return [candidate.matricula, storedNormalized, storedWithSpace, normalized, rawMatricula].some((value) => value && value === normalized)
        || [candidate.matricula, storedNormalized, storedWithSpace, normalized, rawMatricula].some((value) => value && value === rawMatricula)
        || [candidate.matricula, storedNormalized, storedWithSpace, normalized, rawMatricula].some((value) => value && value === storedWithSpace);
    });

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

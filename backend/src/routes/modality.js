const express = require('express');
const Modality = require('../models/Modality');
const { getModalityCatalog } = require('../config/defaultModalities');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const storedModalities = await Modality.find({ active: true }).sort({ name: 1 }).lean();
    const modalities = getModalityCatalog(storedModalities);
    res.json({ success: true, modalities });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

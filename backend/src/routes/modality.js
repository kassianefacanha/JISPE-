const express = require('express');
const Modality = require('../models/Modality');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const modalities = await Modality.find({ active: true }).sort({ name: 1 });
    res.json({ success: true, modalities });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

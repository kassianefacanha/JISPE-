const mongoose = require('mongoose');

const registrationControlsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
    entityRegistrationOpen: { type: Boolean, default: true },
    athleteRegistrationOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RegistrationControls', registrationControlsSchema);
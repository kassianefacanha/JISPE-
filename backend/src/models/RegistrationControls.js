const mongoose = require('mongoose');

const registrationControlsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
    entityRegistrationOpen: { type: Boolean, default: true },
    athleteRegistrationOpen: { type: Boolean, default: true },
    selfAthleteRegistrationOpen: { type: Boolean, default: true },
    raceRegistrationLimit: { type: Number, min: 1, default: 1500 },
    raceRegistrationCount: { type: Number, min: 0, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RegistrationControls', registrationControlsSchema);
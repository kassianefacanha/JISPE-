const mongoose = require('mongoose');

const modalitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    genders: [{ type: String, enum: ['masculino', 'feminino', 'misto'] }],
    categories: [{ type: String }],
    maxTeamsPerEntity: { type: Number, default: 1 },
    maxAthletesPerTeam: { type: Number, default: 10 },
    isCollective: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Modality', modalitySchema);

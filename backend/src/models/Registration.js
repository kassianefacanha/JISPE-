const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    athleteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Athlete', required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    modality: { type: String, required: true },
    gender: { type: String, enum: ['masculino', 'feminino'], required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Registration', registrationSchema);

const mongoose = require('mongoose');

const athleteSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    cpf: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    photoUrl: { type: String, default: '' },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    proofUrl: { type: String, default: '' },
    modality: { type: String, required: true, trim: true },
    modalities: { type: [{ type: String, trim: true }], default: undefined },
    naipe: { type: String, enum: ['masculino', 'feminino', 'misto'], required: true, default: 'masculino' },
    matricula: { type: String, unique: true, sparse: true },
    ageCategory: { type: String, default: 'adulto' },
    gender: { type: String, enum: ['masculino', 'feminino', 'misto'], required: true, default: 'masculino' },
  },
  { timestamps: true }
);

athleteSchema.index({ entityId: 1, cpf: 1 }, { unique: true });

module.exports = mongoose.model('Athlete', athleteSchema);

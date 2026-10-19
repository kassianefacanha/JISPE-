const mongoose = require('mongoose');

const fitnessDeclarationSchema = new mongoose.Schema(
  {
    acknowledgedAt: { type: Date, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
  },
  { _id: false }
);

const athleteSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    fitnessDeclaration: { type: fitnessDeclarationSchema, default: undefined },
    privacyConsent: {
      acceptedAt: Date,
      acceptedBy: String,
      acceptedByType: { type: String, enum: ['entity', 'admin', 'responsible'] },
      version: String,
    },
    cpf: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    birthDate: { type: Date, required: true },
    photoUrl: { type: String, default: '' },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    proofUrl: { type: String, default: '' },
    affiliationProofUrl: { type: String, default: '' },
    medicalCertificateUrl: { type: String, default: '' },
    modality: { type: String, required: true, trim: true },
    modalities: { type: [{ type: String, trim: true }], default: undefined },
    modalityRegistrations: [{
      modality: { type: String, required: true, trim: true },
      naipe: { type: String, enum: ['masculino', 'feminino', 'misto'], required: true },
    }],
    naipe: { type: String, enum: ['masculino', 'feminino', 'misto'], required: true, default: 'masculino' },
    matricula: { type: String, unique: true, sparse: true },
    ageCategory: { type: String, default: 'adulto' },
    gender: { type: String, enum: ['masculino', 'feminino', 'misto'], required: true, default: 'masculino' },
    isPcd: { type: Boolean, default: false },
    hasAllergy: { type: Boolean, default: false },
    allergyDetails: { type: String, trim: true, default: '' },
    hasSpecialCondition: { type: Boolean, default: false },
    specialConditionDetails: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

athleteSchema.index({ entityId: 1, cpf: 1 }, { unique: true });

module.exports = mongoose.model('Athlete', athleteSchema);

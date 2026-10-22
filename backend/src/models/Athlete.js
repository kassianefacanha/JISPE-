const mongoose = require('mongoose');

const fitnessDeclarationSchema = new mongoose.Schema(
  {
    acknowledgedAt: { type: Date, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    declaredBy: { type: String, default: '' },
    declaredByType: { type: String, enum: ['entity', 'admin', 'athlete'], default: 'entity' },
  },
  { _id: false }
);

const participationTermAcceptanceSchema = new mongoose.Schema(
  {
    acceptedAt: { type: Date, required: true },
    acceptedBy: { type: String, default: '' },
    acceptedByType: { type: String, enum: ['entity', 'admin', 'athlete'], default: 'entity' },
  },
  { _id: false }
);

const athleteSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: '' },
    fitnessDeclaration: { type: fitnessDeclarationSchema, default: undefined },
    participationTermAcceptance: { type: participationTermAcceptanceSchema, default: undefined },
    privacyConsent: {
      acceptedAt: Date,
      acceptedBy: String,
      acceptedByType: { type: String, enum: ['entity', 'admin', 'responsible', 'athlete'] },
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
    isExternalServant: { type: Boolean, default: false },
    linkedEntityName: { type: String, trim: true, default: '' },
    hasAllergy: { type: Boolean, default: false },
    allergyDetails: { type: String, trim: true, default: '' },
    hasSpecialCondition: { type: Boolean, default: false },
    specialConditionDetails: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

athleteSchema.index({ entityId: 1, cpf: 1 }, { unique: true });

module.exports = mongoose.model('Athlete', athleteSchema);

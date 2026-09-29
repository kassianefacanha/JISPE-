const mongoose = require('mongoose');

const entitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, required: true },
    responsible: {
      fullName: { type: String, required: true },
      cpf: { type: String, required: true },
      email: { type: String, required: true },
      photoUrl: { type: String, default: '' },
      proofUrl: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Entity', entitySchema);

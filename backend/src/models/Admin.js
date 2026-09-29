const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    sessionVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);

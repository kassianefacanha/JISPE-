const mongoose = require('mongoose');

const passwordChangeRequestSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending', required: true },
    requestedAt: { type: Date, default: Date.now, required: true },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

passwordChangeRequestSchema.index(
  { entityId: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('PasswordChangeRequest', passwordChangeRequestSchema);

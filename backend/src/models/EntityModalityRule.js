const mongoose = require('mongoose');

const entityModalityRuleSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Entity', required: true },
    modalitySlug: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    maxAthletes: { type: Number, default: null, min: 1 },
  },
  { timestamps: true }
);

entityModalityRuleSchema.index({ entityId: 1, modalitySlug: 1 }, { unique: true });

module.exports = mongoose.model('EntityModalityRule', entityModalityRuleSchema);
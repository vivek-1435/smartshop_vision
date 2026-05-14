const mongoose = require('mongoose');

const visionModelSchema = new mongoose.Schema(
  {
    shopId: { type: String, required: true, unique: true, index: true },
    labels: { type: [String], default: [] },
    // store embeddings as a 2D array of numbers
    embeddings: { type: [[Number]], default: [] },
    version: { type: Number, default: 2 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisionModel', visionModelSchema);

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    shopkeeper:    { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
    name:          { type: String, required: [true,'Name required'], trim: true, maxlength: 200 },
    price:         { type: Number, required: [true,'Price required'], min: 0, max: 1_000_000 },
    imageUrl:      { type: String, required: [true,'Image required'] },
    imagePublicId: { type: String },
    barcode:       { type: String, trim: true, sparse: true },
    category:      { type: String, trim: true, default: 'General', maxlength: 50 },
    unit:          { type: String, default: 'piece', enum: ['piece','litre','kg','set','pair','box','ml','gram'] },
    stock:         { type: Number, default: -1, min: -1 }, // -1 = unlimited
    isActive:      { type: Boolean, default: true },
    // Vision metadata
    aiTags:        [{ type: String, maxlength: 50 }],
    sampleCount:   { type: Number, default: 0 }, // mirrors on-device KNN sample count
  },
  { timestamps: true }
);

// Compound indexes
productSchema.index({ shopkeeper: 1, isActive: 1, name: 1 });
productSchema.index({ shopkeeper: 1, barcode: 1 }, { sparse: true });
productSchema.index({ shopkeeper: 1, name: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);

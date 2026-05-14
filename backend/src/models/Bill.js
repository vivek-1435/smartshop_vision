const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:     { type: String, required: true, maxlength: 200 },
  price:    { type: Number, required: true, min: 0 },
  qty:      { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const billSchema = new mongoose.Schema(
  {
    shopkeeper:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
    billNumber:     { type: Number, required: true },
    billCode:       { type: String, trim: true },
    items:          { type: [billItemSchema], validate: { validator: (v) => v.length > 0, message: 'Bill must have at least one item' } },
    subtotal:       { type: Number, required: true, min: 0 },
    gstRate:        { type: Number, default: 18, min: 0, max: 100 },
    gstAmount:      { type: Number, required: true, min: 0 },
    total:          { type: Number, required: true, min: 0 },
    paymentStatus:  { type: String, enum: ['pending','paid','partial','refunded'], default: 'pending', index: true },
    paymentMethod:  { type: String, enum: ['upi','cash','card','pending'], default: 'pending' },
    upiTransactionId: { type: String, trim: true },
    paidAt:         { type: Date },
    customerNote:   { type: String, maxlength: 500 },
    sessionId:      { type: String, trim: true }, // anonymous customer session
  },
  { timestamps: true }
);

// Compound indexes for fast dashboard queries
billSchema.index({ shopkeeper: 1, createdAt: -1 });
billSchema.index({ shopkeeper: 1, paymentStatus: 1, createdAt: -1 });

// Auto billCode on save
billSchema.pre('save', async function (next) {
  if (!this.billCode && this.billNumber) {
    try {
      const shop = await mongoose.model('Shopkeeper').findById(this.shopkeeper).lean();
      const prefix = shop?.shopName?.split(' ')[0]?.toUpperCase()?.slice(0, 8) || 'SHOP';
      this.billCode = `${prefix}-${String(this.billNumber).padStart(4, '0')}`;
    } catch (_) {
      this.billCode = `BILL-${this.billNumber}`;
    }
  }
  next();
});

// Helper: get next sequential bill number for a shop
billSchema.statics.nextBillNumber = async function (shopkeeperId) {
  const last = await this.findOne({ shopkeeper: shopkeeperId }).sort({ billNumber: -1 }).lean();
  return last ? last.billNumber + 1 : 1001;
};

module.exports = mongoose.model('Bill', billSchema);

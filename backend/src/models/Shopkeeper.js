const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const shopkeeperSchema = new mongoose.Schema(
  {
    shopName:          { type: String, required: [true,'Shop name required'], trim: true, maxlength: 100 },
    ownerName:         { type: String, required: [true,'Owner name required'], trim: true, maxlength: 100 },
    email:             { type: String, required: [true,'Email required'], unique: true, lowercase: true, trim: true, index: true },
    password:          { type: String, required: [true,'Password required'], minlength: 8, select: false },
    passwordChangedAt: { type: Date },
    upiId:             { type: String, required: [true,'UPI ID required'], trim: true },
    phone:             { type: String, trim: true },
    address:           { type: String, trim: true, maxlength: 300 },
    shopId:            { type: String, unique: true, index: true },
    gstNumber:         { type: String, trim: true, uppercase: true },
    logoUrl:           { type: String },
    isActive:          { type: Boolean, default: true, index: true },
    // Reset token fields (for forgot-password flow)
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// ── Pre-save hooks ────────────────────────────────────────────────
shopkeeperSchema.pre('save', async function (next) {
  // Hash password only if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  // Auto-generate shopId on first save
  if (this.isNew && !this.shopId) {
    const base = this.shopName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'shop';
    this.shopId = `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }
  next();
});

// ── Instance methods ──────────────────────────────────────────────
shopkeeperSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

shopkeeperSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min
  return token; // raw token sent to user
};

shopkeeperSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.passwordChangedAt;
  return obj;
};

// ── Virtual: billing stats (populated on demand) ──────────────────
shopkeeperSchema.virtual('bills', {
  ref: 'Bill',
  localField: '_id',
  foreignField: 'shopkeeper',
});

module.exports = mongoose.model('Shopkeeper', shopkeeperSchema);

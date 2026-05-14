const express = require('express');
const jwt = require('jsonwebtoken');
const Shopkeeper = require('../models/Shopkeeper');
const auth = require('../middleware/auth');
const { registerRules, loginRules } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendToken = (shopkeeper, statusCode, res) => {
  const token = signToken(shopkeeper._id);
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(statusCode).json({ token, shopkeeper: shopkeeper.toPublic() });
};

// POST /api/auth/register
router.post('/register', registerRules, async (req, res, next) => {
  try {
    const { shopName, ownerName, email, password, upiId, phone, address, gstNumber } = req.body;
    if (await Shopkeeper.findOne({ email })) return next(new AppError('Email already registered', 409));
    const shopkeeper = await Shopkeeper.create({ shopName, ownerName, email, password, upiId, phone, address, gstNumber });
    sendToken(shopkeeper, 201, res);
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', loginRules, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const shopkeeper = await Shopkeeper.findOne({ email }).select('+password');
    if (!shopkeeper || !(await shopkeeper.comparePassword(password)))
      return next(new AppError('Invalid email or password', 401));
    if (!shopkeeper.isActive) return next(new AppError('Account suspended', 403));
    sendToken(shopkeeper, 200, res);
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.cookie('jwt', '', { httpOnly: true, maxAge: 0 });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => res.json({ shopkeeper: req.shopkeeper }));

// PATCH /api/auth/profile
router.patch('/profile', auth, async (req, res, next) => {
  try {
    if (req.body.password) return next(new AppError('Use /change-password to update password', 400));
    const allowed = ['shopName', 'ownerName', 'upiId', 'phone', 'address', 'gstNumber'];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const updated = await Shopkeeper.findByIdAndUpdate(req.shopkeeper._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ shopkeeper: updated });
  } catch (err) { next(err); }
});

// PATCH /api/auth/change-password
router.patch('/change-password', auth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return next(new AppError('Both passwords required', 400));
    if (newPassword.length < 8) return next(new AppError('New password must be ≥ 8 chars', 400));
    const sk = await Shopkeeper.findById(req.shopkeeper._id).select('+password');
    if (!(await sk.comparePassword(currentPassword))) return next(new AppError('Current password incorrect', 401));
    sk.password = newPassword;
    await sk.save();
    sendToken(sk, 200, res);
  } catch (err) { next(err); }
});

module.exports = router;

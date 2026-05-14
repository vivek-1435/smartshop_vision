const jwt = require('jsonwebtoken');
const Shopkeeper = require('../models/Shopkeeper');
const { AppError } = require('./errorHandler');

const auth = async (req, res, next) => {
  try {
    // Accept token from header OR httpOnly cookie
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) return next(new AppError('Not authenticated. Please log in.', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const shopkeeper = await Shopkeeper.findById(decoded.id).select('-password').lean();

    if (!shopkeeper) return next(new AppError('User no longer exists', 401));
    if (!shopkeeper.isActive) return next(new AppError('Account suspended', 403));

    // Check if password was changed after token was issued
    if (shopkeeper.passwordChangedAt) {
      const changedAt = Math.floor(shopkeeper.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedAt) return next(new AppError('Password recently changed. Please log in again.', 401));
    }

    req.shopkeeper = shopkeeper;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired. Please log in again.', 401));
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token.', 401));
    next(err);
  }
};

module.exports = auth;

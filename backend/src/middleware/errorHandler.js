const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Cast Mongoose ObjectId errors
const handleCastErrorDB = (err) => new AppError(`Invalid ${err.path}: ${err.value}`, 400);

// Duplicate field errors (MongoDB 11000)
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  return new AppError(`${field} already exists. Please use a different value.`, 409);
};

// Mongoose validation errors
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new AppError(`Validation error: ${errors.join('. ')}`, 422);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);
const handleMulterError = (err) => new AppError(`File upload error: ${err.message}`, 400);

const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  // Log every error
  logger.error({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Transform known error types
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error.name === 'MulterError') error = handleMulterError(error);

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    error: error.message || 'Something went wrong',
    // Only send stack in development
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

// Catch unhandled promise rejections globally
process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

module.exports = { errorHandler, AppError };

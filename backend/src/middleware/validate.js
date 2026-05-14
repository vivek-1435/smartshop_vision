const { body, param, query, validationResult } = require('express-validator');

const validate = (rules) => async (req, res, next) => {
  await Promise.all(rules.map((r) => r.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

const registerRules = validate([
  body('shopName').trim().notEmpty().withMessage('Shop name is required').isLength({ max: 100 }).withMessage('Shop name max 100 chars'),
  body('ownerName').trim().notEmpty().withMessage('Owner name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('upiId').trim().notEmpty().withMessage('UPI ID is required').matches(/^[\w.\-@]+$/).withMessage('Invalid UPI ID format (e.g. name@okaxis)'),
  // phone: optional — accept any non-empty string (Indian numbers with/without spaces)
  body('phone').optional({ checkFalsy: true }).isString().withMessage('Invalid phone'),
  // gstNumber: optional — only validate length if actually provided
  body('gstNumber').optional({ checkFalsy: true }).isLength({ min: 15, max: 15 }).withMessage('GST number must be exactly 15 characters'),
]);

const loginRules = validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
]);

const productRules = validate([
  body('name').trim().notEmpty().withMessage('Product name required').isLength({ max: 200 }),
  body('price').isFloat({ min: 0, max: 1000000 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().isLength({ max: 50 }),
  body('unit').optional().isIn(['piece', 'litre', 'kg', 'set', 'pair', 'box', 'ml', 'gram']),
  body('stock').optional().isInt({ min: -1 }),
]);

const productUpdateRules = validate([
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('price').optional().isFloat({ min: 0, max: 1000000 }),
  body('name').optional().trim().isLength({ min: 1, max: 200 }),
]);

const billRules = validate([
  body('shopId').trim().notEmpty().withMessage('shopId required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.name').notEmpty().withMessage('Each item needs a name'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Each item needs a valid price'),
  body('items.*.qty').isInt({ min: 1 }).withMessage('Each item qty must be at least 1'),
]);

const analyticsRules = validate([
  query('period').optional().isIn(['week', 'month', 'year']).withMessage('period must be week, month, or year'),
]);

const mongoIdParam = (field = 'id') =>
  validate([param(field).isMongoId().withMessage(`Invalid ${field}`)]);

module.exports = {
  registerRules, loginRules, productRules,
  productUpdateRules, billRules, analyticsRules, mongoIdParam,
};
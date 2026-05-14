const express = require('express');
const multer  = require('multer');
const auth    = require('../middleware/auth');
const { productRules, productUpdateRules, mongoIdParam } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const { uploadBuffer, destroyAsync } = require('../utils/cloudinary');
const Product  = require('../models/Product');
const logger   = require('../utils/logger');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new AppError('Only image files are allowed', 400)),
});

// GET /api/products  (shopkeeper)
router.get('/', auth, async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const filter = { shopkeeper: req.shopkeeper._id, isActive: true };
    if (category) filter.category = category;
    if (search)   filter.$text = { $search: search };
    const products = await Product.find(filter)
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .lean();
    res.json({ products, total: products.length });
  } catch (err) { next(err); }
});

// GET /api/products/categories  (shopkeeper)
router.get('/categories', auth, async (req, res, next) => {
  try {
    const cats = await Product.distinct('category', { shopkeeper: req.shopkeeper._id, isActive: true });
    res.json({ categories: cats.sort() });
  } catch (err) { next(err); }
});

// GET /api/products/public/:shopId  (customer — no auth)
router.get('/public/:shopId', async (req, res, next) => {
  try {
    const Shopkeeper = require('../models/Shopkeeper');
    const shop = await Shopkeeper.findOne({ shopId: req.params.shopId, isActive: true }).lean();
    if (!shop) return next(new AppError('Shop not found', 404));
    const products = await Product.find({ shopkeeper: shop._id, isActive: true })
      .select('name price imageUrl category unit')
      .sort({ name: 1 }).lean();
    res.json({ products, shopName: shop.shopName });
  } catch (err) { next(err); }
});

// POST /api/products  (shopkeeper)
router.post('/', auth, upload.single('image'), productRules, async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('Product image is required', 400));
    const { name, price, category, unit, barcode, stock } = req.body;
    const folder   = `smartshop/${req.shopkeeper.shopId}/products`;
    const uploaded = await uploadBuffer(req.file.buffer, folder);
    const product  = await Product.create({
      shopkeeper: req.shopkeeper._id,
      name, price: parseFloat(price),
      imageUrl: uploaded.secure_url,
      imagePublicId: uploaded.public_id,
      category: category || 'General',
      unit: unit || 'piece',
      barcode: barcode || undefined,
      stock: stock != null ? parseInt(stock) : -1,
    });
    logger.info(`Product created: ${product._id} (${name})`);
    res.status(201).json({ product });
  } catch (err) { next(err); }
});

// PATCH /api/products/:id  (shopkeeper)
router.patch('/:id', auth, upload.single('image'), mongoIdParam('id'), productUpdateRules, async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shopkeeper: req.shopkeeper._id });
    if (!product) return next(new AppError('Product not found', 404));
    const allowed = ['name', 'price', 'category', 'unit', 'barcode', 'stock', 'sampleCount'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) product[k] = req.body[k]; });
    if (req.file) {
      destroyAsync(product.imagePublicId);
      const folder   = `smartshop/${req.shopkeeper.shopId}/products`;
      const uploaded = await uploadBuffer(req.file.buffer, folder);
      product.imageUrl      = uploaded.secure_url;
      product.imagePublicId = uploaded.public_id;
    }
    await product.save();
    res.json({ product });
  } catch (err) { next(err); }
});

// PATCH /api/products/:id/sample-count  — sync on-device KNN count
router.patch('/:id/sample-count', auth, mongoIdParam('id'), async (req, res, next) => {
  try {
    const { count } = req.body;
    if (typeof count !== 'number' || count < 0) return next(new AppError('count must be >= 0', 400));
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shopkeeper: req.shopkeeper._id },
      { sampleCount: count },
      { new: true }
    );
    if (!product) return next(new AppError('Product not found', 404));
    res.json({ product });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id  (shopkeeper — soft delete)
router.delete('/:id', auth, mongoIdParam('id'), async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shopkeeper: req.shopkeeper._id });
    if (!product) return next(new AppError('Product not found', 404));
    product.isActive = false;
    await product.save();
    destroyAsync(product.imagePublicId);
    res.json({ message: 'Product removed' });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const { billRules, mongoIdParam } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const Bill = require('../models/Bill');
const Shopkeeper = require('../models/Shopkeeper');

const router = express.Router();

// ── POST /api/bills  (customer – no auth, uses shopId) ────────────
router.post('/', billRules, async (req, res, next) => {
  try {
    const { shopId, items, gstRate = 18, customerNote, sessionId } = req.body;

    const shop = await Shopkeeper.findOne({ shopId, isActive: true }).lean();
    if (!shop) return next(new AppError('Shop not found', 404));

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const gstAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100;
    const total = Math.round((subtotal + gstAmount) * 100) / 100;

    const billNumber = await Bill.nextBillNumber(shop._id);

    const bill = await Bill.create({
      shopkeeper: shop._id,
      billNumber,
      items: items.map((i) => ({
        product: i.productId || undefined,
        name: String(i.name).slice(0, 200),
        price: parseFloat(i.price),
        qty: parseInt(i.qty),
        subtotal: Math.round(parseFloat(i.price) * parseInt(i.qty) * 100) / 100,
      })),
      subtotal,
      gstRate,
      gstAmount,
      total,
      customerNote,
      sessionId,
    });

    await bill.populate('shopkeeper', 'shopName upiId gstNumber address phone');
    res.status(201).json({ bill });
  } catch (err) { next(err); }
});

// ── GET /api/bills  (shopkeeper – auth required) ──────────────────
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, from, to, search } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const filter = { shopkeeper: req.shopkeeper._id };
    if (status) filter.paymentStatus = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    if (search) filter.billCode = new RegExp(search, 'i');

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Bill.countDocuments(filter),
    ]);

    res.json({ bills, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) { next(err); }
});

// ── GET /api/bills/:id  (public – customer sees own bill) ─────────
router.get('/:id', mongoIdParam('id'), async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('shopkeeper', 'shopName ownerName upiId gstNumber address phone')
      .lean();
    if (!bill) return next(new AppError('Bill not found', 404));
    res.json({ bill });
  } catch (err) { next(err); }
});

// ── PATCH /api/bills/:id/payment  (public – customer marks paid) ──
router.patch('/:id/payment', mongoIdParam('id'), async (req, res, next) => {
  try {
    const { paymentMethod = 'upi', upiTransactionId } = req.body;
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'paid', paymentMethod, upiTransactionId: upiTransactionId || undefined, paidAt: new Date() },
      { new: true, runValidators: true }
    ).populate('shopkeeper', 'shopName upiId');
    if (!bill) return next(new AppError('Bill not found', 404));
    res.json({ bill });
  } catch (err) { next(err); }
});

// ── PATCH /api/bills/:id/refund  (shopkeeper only) ────────────────
router.patch('/:id/refund', auth, mongoIdParam('id'), async (req, res, next) => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, shopkeeper: req.shopkeeper._id },
      { paymentStatus: 'refunded' },
      { new: true }
    );
    if (!bill) return next(new AppError('Bill not found', 404));
    res.json({ bill });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const { analyticsRules } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Shopkeeper = require('../models/Shopkeeper');
const dayjs = require('dayjs');

const router = express.Router();

// ── GET /api/shop/dashboard ───────────────────────────────────────
router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const shopId = req.shopkeeper._id;
    const now = dayjs();
    const todayStart  = now.startOf('day').toDate();
    const monthStart  = now.startOf('month').toDate();
    const yearStart   = now.startOf('year').toDate();

    const [todayBills, monthBills, yearBills, recentBills, totalProducts, pendingBills] = await Promise.all([
      Bill.find({ shopkeeper: shopId, createdAt: { $gte: todayStart } }).lean(),
      Bill.find({ shopkeeper: shopId, createdAt: { $gte: monthStart } }).lean(),
      Bill.find({ shopkeeper: shopId, createdAt: { $gte: yearStart } }).lean(),
      Bill.find({ shopkeeper: shopId }).sort({ createdAt: -1 }).limit(15).lean(),
      Product.countDocuments({ shopkeeper: shopId, isActive: true }),
      Bill.countDocuments({ shopkeeper: shopId, paymentStatus: 'pending' }),
    ]);

    const sum = (bills) => bills.reduce((s, b) => s + b.total, 0);

    res.json({
      stats: {
        todaySales:    sum(todayBills),
        todayBills:    todayBills.length,
        monthlySales:  sum(monthBills),
        monthlyBills:  monthBills.length,
        yearlySales:   sum(yearBills),
        yearlyBills:   yearBills.length,
        totalProducts,
        pendingBills,
      },
      recentBills,
      shopkeeper: req.shopkeeper,
    });
  } catch (err) { next(err); }
});

// ── GET /api/shop/qr ─────────────────────────────────────────────
router.get('/qr', auth, (req, res) => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
  const qrUrl = `${base}/scan?shop=${req.shopkeeper.shopId}`;
  res.json({ qrUrl, shopId: req.shopkeeper.shopId });
});

// ── GET /api/shop/public/:shopId  (customer) ─────────────────────
router.get('/public/:shopId', async (req, res, next) => {
  try {
    const shop = await Shopkeeper.findOne({ shopId: req.params.shopId, isActive: true })
      .select('shopName ownerName upiId gstNumber logoUrl address phone')
      .lean();
    if (!shop) return next(new AppError('Shop not found', 404));
    res.json({ shop });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const auth = require('../middleware/auth');
const { analyticsRules } = require('../middleware/validate');
const Bill = require('../models/Bill');
const dayjs = require('dayjs');

const router = express.Router();

router.get('/', auth, analyticsRules, async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const shopId = req.shopkeeper._id;
    const now = dayjs();

    let startDate, groupFormat, labels;
    if (period === 'week') {
      startDate = now.subtract(6, 'day').startOf('day');
      groupFormat = '%Y-%m-%d';
      labels = Array.from({ length: 7 }, (_, i) => now.subtract(6 - i, 'day').format('ddd'));
    } else if (period === 'month') {
      startDate = now.startOf('month');
      groupFormat = '%d';
      labels = Array.from({ length: now.daysInMonth() }, (_, i) => String(i + 1));
    } else {
      startDate = now.startOf('year');
      groupFormat = '%m';
      labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    }

    const matchStage = { shopkeeper: shopId, createdAt: { $gte: startDate.toDate() } };

    const [trend, topProducts, totals] = await Promise.all([
      Bill.aggregate([
        { $match: matchStage },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Bill.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', revenue: { $sum: '$items.subtotal' }, qty: { $sum: '$items.qty' }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
      ]),
      Bill.aggregate([
        { $match: matchStage },
        { $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalBills:   { $sum: 1 },
          avgBillValue: { $avg: '$total' },
          paidBills:    { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          totalGST:     { $sum: '$gstAmount' },
        }},
      ]),
    ]);

    res.json({
      period, labels, trend, topProducts,
      totals: totals[0] || { totalRevenue: 0, totalBills: 0, avgBillValue: 0, paidBills: 0, totalGST: 0 },
    });
  } catch (err) { next(err); }
});

module.exports = router;

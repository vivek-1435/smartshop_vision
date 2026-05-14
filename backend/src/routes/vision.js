const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const VisionModel = require('../models/VisionModel');
const { AppError } = require('../middleware/errorHandler');

// ── GET /api/vision/public/:shopId ──────────────────────────────
// Public endpoint for customer phones to fetch the trained AI model
router.get('/public/:shopId', async (req, res, next) => {
  try {
    const { shopId } = req.params;
    const model = await VisionModel.findOne({ shopId }).lean();
    if (!model) {
      return res.json({ labels: [], embeddings: [], version: 2 });
    }
    res.json({
      labels: model.labels,
      embeddings: model.embeddings,
      version: model.version,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/vision/sync ─────────────────────────────────────────
// Protected endpoint for shop owners to upload their trained model
router.post('/sync', auth, async (req, res, next) => {
  try {
    const shopId = req.shopkeeper.shopId;
    const { labels, embeddings, version } = req.body;

    if (!Array.isArray(labels) || !Array.isArray(embeddings)) {
      return next(new AppError('Invalid payload structure', 400));
    }

    await VisionModel.findOneAndUpdate(
      { shopId },
      { labels, embeddings, version: version || 2 },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Model synced successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

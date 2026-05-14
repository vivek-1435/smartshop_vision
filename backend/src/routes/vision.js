/**
 * Vision route — status only.
 * All inference runs on-device via TensorFlow.js + MobileNetV3 + KNN.
 * No images are sent to this server.
 */
const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    mode: 'on-device',
    engine: 'TensorFlow.js + MobileNetV3-Small + KNN classifier',
    storage: 'IndexedDB (per-shop, browser-local)',
    serverSideInference: false,
    message: 'Product images never leave the customer device.',
  });
});

module.exports = router;

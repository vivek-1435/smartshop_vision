const cloudinary = require('cloudinary').v2;
const logger = require('./logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} folder  - e.g. "smartshop/shopId/products"
 * @param {object} opts    - extra Cloudinary transform options
 * @returns {Promise<{secure_url: string, public_id: string}>}
 */
function uploadBuffer(buffer, folder, opts = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ width: 600, height: 600, crop: 'fill', quality: 'auto:good', fetch_format: 'auto' }],
        ...opts,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Soft-delete an asset from Cloudinary (non-blocking).
 * Errors are logged but not thrown — callers shouldn't fail because of cleanup.
 * @param {string} publicId
 */
async function destroyAsync(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    logger.warn(`Cloudinary destroy failed for ${publicId}: ${err.message}`);
  }
}

module.exports = { uploadBuffer, destroyAsync, cloudinary };

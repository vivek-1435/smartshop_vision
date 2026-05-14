/**
 * SmartShop Vision Engine
 * ─────────────────────────────────────────────────────────────────
 * Architecture:
 *   • Feature Extractor : MobileNetV3-Small (TensorFlow.js, ~2MB)
 *                         Strips the classification head → 1024-d embedding
 *   • Classifier        : KNN (K-Nearest Neighbour) on L2-normalised embeddings
 *                         No GPU training needed; new products added instantly
 *   • Storage           : IndexedDB via idb-keyval (embeddings + labels)
 *                         Model survives page reloads; per-shop namespace
 *
 * Why KNN over fine-tuned softmax?
 *   - Adding a new product = 1 forward pass, no re-training
 *   - Works well with as few as 3–5 images per product
 *   - Confidence = cosine similarity → interpretable threshold
 *
 * Flow:
 *   TrainModel page  → visionEngine.addSample(imageElement, label, shopId)
 *   Scanner page     → visionEngine.predict(imageElement, shopId) → { label, confidence }
 * ─────────────────────────────────────────────────────────────────
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import api from './api';

// ── Constants ────────────────────────────────────────────────────
const MODEL_URL =
  'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1';
const INPUT_SIZE = 224;           // MobileNetV3 input
const EMBEDDING_DIM = 1024;       // MobileNetV3-Small output
const K = 3;                      // KNN neighbours
const CONFIDENCE_THRESHOLD = 0.55; // min cosine similarity to accept
const DB_NAME = 'smartshop_vision';
const DB_VERSION = 1;

// ── Singleton state ──────────────────────────────────────────────
let _model = null;           // tf.GraphModel (feature extractor)
let _loadPromise = null;     // prevents double-load

// Per-shop KNN store: { [shopId]: { embeddings: Float32Array[], labels: string[] } }
const _stores = {};

// ── IndexedDB helpers ────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('embeddings');
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function dbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('embeddings', 'readonly');
    const req = tx.objectStore('embeddings').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('embeddings', 'readwrite');
    const req = tx.objectStore('embeddings').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('embeddings', 'readwrite');
    const req = tx.objectStore('embeddings').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Model loading ────────────────────────────────────────────────
export async function loadModel(onProgress) {
  if (_model) return _model;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    await tf.setBackend('webgl');
    await tf.ready();
    onProgress?.({ stage: 'Downloading MobileNetV3…', pct: 10 });

    _model = await tf.loadGraphModel(MODEL_URL, {
      fromTFHub: true,
      onProgress: (frac) => onProgress?.({ stage: 'Loading model weights…', pct: Math.round(10 + frac * 80) }),
    });

    // Warm-up pass — prevents first-inference lag
    onProgress?.({ stage: 'Warming up…', pct: 95 });
    const dummy = tf.zeros([1, INPUT_SIZE, INPUT_SIZE, 3]);
    const warmup = _model.predict(dummy);
    warmup.dispose();
    dummy.dispose();

    onProgress?.({ stage: 'Ready', pct: 100 });
    return _model;
  })();

  return _loadPromise;
}

export function isModelLoaded() {
  return _model !== null;
}

// ── Preprocessing ────────────────────────────────────────────────
function preprocessImage(imgEl) {
  return tf.tidy(() => {
    // Accept HTMLImageElement, HTMLVideoElement, HTMLCanvasElement, or ImageData
    const tensor = tf.browser.fromPixels(imgEl)
      .resizeBilinear([INPUT_SIZE, INPUT_SIZE])
      .toFloat()
      .div(255.0)              // [0,1]
      .expandDims(0);          // [1, 224, 224, 3]
    return tensor;
  });
}

// ── Feature extraction ───────────────────────────────────────────
async function extractEmbedding(imgEl) {
  if (!_model) throw new Error('Model not loaded. Call loadModel() first.');

  const input = preprocessImage(imgEl);
  const embedding = tf.tidy(() => {
    const raw = _model.predict(input);              // [1, 1024]
    const squeezed = raw.squeeze();                  // [1024]
    // L2-normalise → cosine similarity = dot product
    const norm = squeezed.norm();
    return squeezed.div(norm);
  });
  input.dispose();

  const data = await embedding.data();               // Float32Array
  embedding.dispose();
  return data;
}

// ── KNN store helpers ────────────────────────────────────────────
function getStore(shopId) {
  if (!_stores[shopId]) _stores[shopId] = { embeddings: [], labels: [] };
  return _stores[shopId];
}

function cosineSimilarity(a, b) {
  // Both are already L2-normalised → dot product = cosine similarity
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ── KNN classifier ───────────────────────────────────────────────
function knnPredict(queryEmbedding, store) {
  const { embeddings, labels } = store;
  if (embeddings.length === 0) return null;

  // Compute similarity to every stored embedding
  const scored = embeddings.map((emb, i) => ({
    label: labels[i],
    sim: cosineSimilarity(queryEmbedding, emb),
  }));

  // Sort descending, take top-K
  scored.sort((a, b) => b.sim - a.sim);
  const topK = scored.slice(0, Math.min(K, scored.length));

  // Majority vote weighted by similarity
  const votes = {};
  let totalWeight = 0;
  for (const { label, sim } of topK) {
    votes[label] = (votes[label] || 0) + sim;
    totalWeight += sim;
  }

  let bestLabel = null;
  let bestScore = 0;
  for (const [label, score] of Object.entries(votes)) {
    if (score > bestScore) { bestScore = score; bestLabel = label; }
  }

  const confidence = totalWeight > 0 ? bestScore / totalWeight : 0;
  return { label: bestLabel, confidence, topK };
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Train: add one sample image for a product label.
 * Call this multiple times with different images of the same product
 * to improve accuracy (recommended: 5–15 images per product).
 *
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} imgEl
 * @param {string} label   - product name (used as class id)
 * @param {string} shopId  - per-shop namespace
 */
export async function addSample(imgEl, label, shopId) {
  const emb = await extractEmbedding(imgEl);
  const store = getStore(shopId);
  store.embeddings.push(emb);
  store.labels.push(label);
  await persistStore(shopId);
  return emb;
}

/**
 * Remove all samples for a specific product label.
 */
export async function removeSamples(label, shopId) {
  const store = getStore(shopId);
  const keep = store.embeddings.map((_, i) => store.labels[i] !== label);
  store.embeddings = store.embeddings.filter((_, i) => keep[i]);
  store.labels = store.labels.filter((_, i) => keep[i]);
  await persistStore(shopId);
}

/**
 * Get sample counts per label.
 */
export function getSampleCounts(shopId) {
  const store = getStore(shopId);
  const counts = {};
  for (const label of store.labels) {
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

/**
 * Run inference on a single frame.
 * Returns null if confidence is below threshold or no samples trained.
 *
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} imgEl
 * @param {string} shopId
 * @returns {{ label: string, confidence: number, topK: Array } | null}
 */
export async function predict(imgEl, shopId) {
  const store = getStore(shopId);
  if (store.embeddings.length === 0) return null;

  const emb = await extractEmbedding(imgEl);
  const result = knnPredict(emb, store);
  if (!result || result.confidence < CONFIDENCE_THRESHOLD) return null;
  return result;
}

// ── Persistence (IndexedDB) ──────────────────────────────────────

let syncTimeout = null;
async function persistStore(shopId) {
  const store = getStore(shopId);
  // Serialise as plain object with typed arrays
  const data = {
    labels: store.labels,
    // Float32Arrays can't go directly into IDB in all browsers; convert to regular arrays
    embeddings: store.embeddings.map((e) => Array.from(e)),
    version: 2,
  };
  await dbPut(`shop_${shopId}`, JSON.stringify(data));

  // Sync to Cloud with a 2-second debounce to prevent network flooding during rapid captures
  if (shopId && shopId !== 'demo') {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      api.post('/vision/sync', data).catch(e => console.warn('Cloud sync failed:', e));
    }, 2000);
  }
}

/**
 * Load a shop's KNN store from IndexedDB.
 * Call once at startup / when switching shops.
 */
export async function loadStore(shopId) {
  try {
    // 1. Try to fetch the latest model from the cloud first
    if (shopId && shopId !== 'demo') {
      try {
        const res = await api.get(`/vision/public/${shopId}`);
        if (res.data && res.data.labels) {
          // Save cloud data to local IndexedDB for offline fallback
          await dbPut(`shop_${shopId}`, JSON.stringify(res.data));
        }
      } catch (e) {
        console.warn('Cloud load failed, falling back to local:', e);
      }
    }

    // 2. Load from local IndexedDB (which now has the latest cloud data, or offline fallback)
    const raw = await dbGet(`shop_${shopId}`);
    if (!raw) return;
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const store = getStore(shopId);
    store.labels = data.labels || [];
    store.embeddings = (data.embeddings || []).map((e) => new Float32Array(e));
  } catch (e) {
    console.warn('Vision: could not load store for shop', shopId, e);
  }
}

/**
 * Clear all trained data for a shop.
 */
export async function clearStore(shopId) {
  _stores[shopId] = { embeddings: [], labels: [] };
  await dbDelete(`shop_${shopId}`);
}

/**
 * Export the trained model as a downloadable JSON blob.
 * Useful for backup or syncing across devices.
 */
export function exportModel(shopId) {
  const store = getStore(shopId);
  const data = {
    shopId,
    exportedAt: new Date().toISOString(),
    labels: store.labels,
    embeddings: store.embeddings.map((e) => Array.from(e)),
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartshop-model-${shopId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import a previously exported model JSON.
 */
export async function importModel(shopId, jsonText) {
  const data = JSON.parse(jsonText);
  const store = getStore(shopId);
  store.labels = data.labels || [];
  store.embeddings = (data.embeddings || []).map((e) => new Float32Array(e));
  await persistStore(shopId);
  return store.labels.length;
}

// ── Augmentation helpers (used during training to improve accuracy) ─
/**
 * Generate augmented versions of an image for richer training data.
 * Returns array of ImageData (flip, brightness variants).
 */
export function augmentImage(imgEl) {
  const results = [];
  const size = INPUT_SIZE;

  const variants = [
    { flipH: false, brightness: 1.0 },
    { flipH: true,  brightness: 1.0 },
    { flipH: false, brightness: 0.85 },
    { flipH: false, brightness: 1.15 },
    { flipH: true,  brightness: 0.9 },
  ];

  for (const v of variants) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (v.flipH) {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = `brightness(${v.brightness})`;
    ctx.drawImage(imgEl, 0, 0, size, size);
    results.push(canvas);
  }
  return results;
}

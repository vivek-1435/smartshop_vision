/**
 * useVision — React hook wrapping the vision engine
 *
 * Handles:
 *  - Model loading with progress
 *  - Per-shop store loading from IndexedDB
 *  - Training: single image or full augmented set
 *  - Inference loop tied to a video element
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as VE from '../utils/visionEngine';

// ── useModelLoader ────────────────────────────────────────────────
export function useModelLoader() {
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [progress, setProgress] = useState({ stage: '', pct: 0 });
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (VE.isModelLoaded()) { setStatus('ready'); return; }
    setStatus('loading');
    setError(null);
    try {
      await VE.loadModel((p) => setProgress(p));
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  return { status, progress, error, load };
}

// ── useVisionTrainer ──────────────────────────────────────────────
export function useVisionTrainer(shopId) {
  const [sampleCounts, setSampleCounts] = useState({});
  const [training, setTraining] = useState(false);

  // Refresh sample counts from engine
  const refreshCounts = useCallback(() => {
    if (!shopId) return;
    setSampleCounts(VE.getSampleCounts(shopId));
  }, [shopId]);

  // Load persisted store for this shop
  useEffect(() => {
    if (!shopId) return;
    VE.loadStore(shopId).then(refreshCounts);
  }, [shopId, refreshCounts]);

  /**
   * Train on a single image (with optional augmentation).
   * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} imgEl
   * @param {string} label - product name
   * @param {boolean} augment - generate 5 augmented variants automatically
   */
  const trainOnImage = useCallback(async (imgEl, label, augment = true) => {
    if (!shopId || !label) return;
    setTraining(true);
    try {
      if (augment) {
        const variants = VE.augmentImage(imgEl);
        for (const v of variants) {
          await VE.addSample(v, label, shopId);
        }
      } else {
        await VE.addSample(imgEl, label, shopId);
      }
      refreshCounts();
    } finally {
      setTraining(false);
    }
  }, [shopId, refreshCounts]);

  /**
   * Train on multiple File objects (user uploads).
   * @param {File[]} files
   * @param {string} label
   * @param {boolean} augment
   * @param {(done, total) => void} onProgress
   */
  const trainOnFiles = useCallback(async (files, label, augment = true, onProgress) => {
    if (!shopId || !label || !files.length) return;
    setTraining(true);
    try {
      let done = 0;
      for (const file of files) {
        const img = await fileToImage(file);
        if (augment) {
          const variants = VE.augmentImage(img);
          for (const v of variants) await VE.addSample(v, label, shopId);
        } else {
          await VE.addSample(img, label, shopId);
        }
        done++;
        onProgress?.(done, files.length);
      }
      refreshCounts();
    } finally {
      setTraining(false);
    }
  }, [shopId, refreshCounts]);

  const removeSamples = useCallback(async (label) => {
    if (!shopId) return;
    await VE.removeSamples(label, shopId);
    refreshCounts();
  }, [shopId, refreshCounts]);

  const clearAll = useCallback(async () => {
    if (!shopId) return;
    await VE.clearStore(shopId);
    refreshCounts();
  }, [shopId, refreshCounts]);

  const exportModel = useCallback(() => {
    if (!shopId) return;
    VE.exportModel(shopId);
  }, [shopId]);

  const importModel = useCallback(async (jsonText) => {
    if (!shopId) return 0;
    const count = await VE.importModel(shopId, jsonText);
    refreshCounts();
    return count;
  }, [shopId, refreshCounts]);

  const totalSamples = Object.values(sampleCounts).reduce((s, n) => s + n, 0);
  const productCount = Object.keys(sampleCounts).length;

  return {
    sampleCounts, totalSamples, productCount,
    training,
    trainOnImage, trainOnFiles,
    removeSamples, clearAll,
    exportModel, importModel,
    refreshCounts,
  };
}

// ── useVisionScanner ──────────────────────────────────────────────
/**
 * Runs continuous inference on a video element.
 *
 * @param {Object} options
 * @param {string} options.shopId
 * @param {boolean} options.active - start/stop scanning
 * @param {number} options.intervalMs - inference interval (default 1500ms)
 * @param {(result) => void} options.onDetected - called when confident detection
 * @param {number} options.debounceMs - ignore same label for N ms (default 4000)
 *
 * @returns {{ videoRef, canvasRef, isScanning, lastResult, fps }}
 */
export function useVisionScanner({
  shopId,
  active = true,
  intervalMs = 1500,
  onDetected,
  debounceMs = 4000,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const lastLabelRef = useRef({ label: null, ts: 0 });
  const streamRef = useRef(null);

  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [fps, setFps] = useState(0);
  const frameTimesRef = useRef([]);

  // Start camera
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        if (mounted) setCameraError(e.message);
      }
    })();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Inference loop
  useEffect(() => {
    if (!active || !shopId) return;

    const runInference = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) return; // not enough data

      // Draw current frame to canvas
      const canvas = canvasRef.current;
      canvas.width = 224;
      canvas.height = 224;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 224, 224);

      setIsScanning(true);
      try {
        const result = await VE.predict(canvas, shopId);
        if (result) {
          setLastResult(result);
          // Debounce: don't fire same product repeatedly
          const now = Date.now();
          const last = lastLabelRef.current;
          if (result.label !== last.label || now - last.ts > debounceMs) {
            lastLabelRef.current = { label: result.label, ts: now };
            onDetected?.(result);
          }
        }
        // FPS tracking
        const now = Date.now();
        frameTimesRef.current.push(now);
        frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 5000);
        setFps(Math.round(frameTimesRef.current.length / 5));
      } catch (_) {}
      finally { setIsScanning(false); }
    };

    intervalRef.current = setInterval(runInference, intervalMs);
    return () => clearInterval(intervalRef.current);
  }, [active, shopId, intervalMs, onDetected, debounceMs]);

  return { videoRef, canvasRef, isScanning, lastResult, cameraError, fps };
}

// ── Helpers ───────────────────────────────────────────────────────
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

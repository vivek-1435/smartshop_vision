import { useRef, useEffect, useCallback, useState } from 'react';
import api from '../utils/api';

export function useCamera({ shopId, onDetected, intervalMs = 3000 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(err.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraReady(false);
  }, []);

  // Capture a frame and send to AI vision API
  const detectFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !shopId) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 640, 480);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    setIsDetecting(true);
    try {
      const { data } = await api.post('/vision/detect', { shopId, imageBase64, mimeType: 'image/jpeg' });
      if (data.detected && data.detected.confidence > 0.6) {
        onDetected(data.detected);
      }
    } catch (_) {}
    finally { setIsDetecting(false); }
  }, [shopId, onDetected]);

  // Start periodic detection when camera is ready
  useEffect(() => {
    if (cameraReady && shopId) {
      intervalRef.current = setInterval(detectFrame, intervalMs);
    }
    return () => clearInterval(intervalRef.current);
  }, [cameraReady, shopId, detectFrame, intervalMs]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return { videoRef, canvasRef, cameraError, isDetecting, cameraReady };
}

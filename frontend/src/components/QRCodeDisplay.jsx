import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({ value, size = 180, label, onDownload }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#f97316', light: '#13131a' },
    });
  }, [value, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'smartshop-qr.png';
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ borderRadius: 12, display: 'block', margin: '0 auto' }} />
      {label && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>{label}</p>}
      <button className="btn btn-secondary" style={{ marginTop: 10, fontSize: 12, padding: '8px 14px' }} onClick={handleDownload}>
        ⬇ Download QR
      </button>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    if (token) navigate('/dashboard');
  }, [token, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ width: 80, height: 80, background: '#f97316', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 700, fontSize: 30, color: '#fff', marginBottom: 28 }}>S</div>
      <h1 style={{ fontFamily: 'Syne', fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 12 }}>SmartShop<br/>Bill Calculator</h1>
      <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 40, maxWidth: 280 }}>
        AI-powered product scanning, instant bill generation, and UPI payments for your auto shop.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <button className="btn btn-primary btn-full" style={{ fontSize: 15, padding: '16px' }} onClick={() => navigate('/login')}>
          Shopkeeper Login →
        </button>
        <button className="btn btn-secondary btn-full" style={{ fontSize: 15, padding: '16px' }} onClick={() => navigate('/register')}>
          Register Your Shop
        </button>
        <div style={{ borderTop: '1px solid #2a2a3a', paddingTop: 16, marginTop: 4 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Customer? Scan the QR at shop entrance</p>
          <button className="btn btn-secondary btn-full" onClick={() => navigate('/scan?shop=demo')}>
            Demo Customer Mode
          </button>
        </div>
      </div>
    </div>
  );
}

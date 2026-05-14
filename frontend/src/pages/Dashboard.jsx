import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import BottomNav from '../components/BottomNav';
import QRCodeDisplay from '../components/QRCodeDisplay';
import dayjs from 'dayjs';

const fmt = (n) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function Dashboard() {
  const { shopkeeper } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/shop/dashboard'),
      api.get('/shop/qr'),
    ]).then(([dash, qr]) => {
      setStats(dash.data.stats);
      setRecent(dash.data.recentBills);
      setQrUrl(qr.data.qrUrl);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ background: '#13131a', borderBottom: '1px solid #2a2a3a', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Welcome back 👋</div>
            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700 }}>{shopkeeper?.shopName}</div>
          </div>
          <div style={{ width: 40, height: 40, background: '#f97316', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff' }}>
            {shopkeeper?.shopName?.[0] || 'S'}
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading dashboard...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Today', val: fmt(stats?.todaySales), color: '#22c55e' },
                { label: 'This Month', val: fmt(stats?.monthlySales), color: '#f97316' },
                { label: 'This Year', val: fmt(stats?.yearlySales), color: '#f1f5f9' },
                { label: 'Bills Today', val: stats?.todayBills || 0, color: '#3b82f6' },
              ].map((s) => (
                <div key={s.label} className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* QR Code */}
            <div className="card" style={{ marginBottom: 20, textAlign: 'center', padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Customer Entry QR</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>Customers scan this to start shopping</div>
              {qrUrl && <QRCodeDisplay value={qrUrl} size={160} />}
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, wordBreak: 'break-all' }}>{qrUrl}</div>
            </div>

            {/* Recent Bills */}
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent Bills</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.length === 0 && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No bills yet</div>}
              {recent.map((bill) => (
                <div key={bill._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{bill.billCode || `#${bill.billNumber}`}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {dayjs(bill.createdAt).format('DD MMM, hh:mm A')} · {bill.items?.length} items
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: '#22c55e' }}>₹{bill.total}</span>
                    <span className={`tag ${bill.paymentStatus === 'paid' ? 'tag-green' : 'tag-orange'}`}>{bill.paymentStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

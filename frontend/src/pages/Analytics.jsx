import { useEffect, useState } from 'react';
import api from '../utils/api';
import BottomNav from '../components/BottomNav';

const PERIODS = ['week', 'month', 'year'];

export default function Analytics() {
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics?period=${period}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [period]);

  const barData = () => {
    if (!data) return [];
    const trendMap = {};
    data.trend.forEach((t) => { trendMap[t._id] = t.revenue; });
    return data.labels.map((label, i) => {
      const key = period === 'week' ? data.trend[i]?._id : period === 'year' ? String(i + 1).padStart(2, '0') : String(i + 1).padStart(2, '0');
      return { label, value: trendMap[key] || 0 };
    });
  };

  const bars = barData();
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div>
      <div className="topbar">
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Analytics</span>
        <span className="tag tag-orange">Live</span>
      </div>

      <div className="page-body">
        {/* Period Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans', transition: 'all .2s',
                background: period === p ? '#f97316' : 'transparent',
                borderColor: period === p ? '#f97316' : '#2a2a3a',
                color: period === p ? '#fff' : '#94a3b8' }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading...</div> : (
          <>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6 }}>Revenue</div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, color: '#22c55e' }}>₹{Number(data?.totals?.totalRevenue || 0).toLocaleString('en-IN')}</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6 }}>Bills</div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700 }}>{data?.totals?.totalBills || 0}</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6 }}>Avg Bill</div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, color: '#f97316' }}>₹{Math.round(data?.totals?.avgBillValue || 0)}</div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6 }}>Paid</div>
                <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{data?.totals?.paidBills || 0}</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 14 }}>Revenue Trend</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: period === 'month' ? 3 : 6, height: 100 }}>
                {bars.map((b, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: '#f97316', opacity: 0.75, transition: 'height .5s ease', height: `${Math.round((b.value / maxVal) * 90) || 4}px`, minHeight: 4, alignSelf: 'flex-end' }} title={`₹${b.value}`} />
                    {period !== 'month' && <div style={{ fontSize: 9, color: '#94a3b8' }}>{b.label}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Top Products</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(data?.topProducts || []).slice(0, 8).map((p, i) => (
                <div key={p._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#f97316', width: 28 }}>#{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p._id}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.qty} sold</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>₹{p.revenue.toLocaleString('en-IN')}</div>
                </div>
              ))}
              {!data?.topProducts?.length && <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No sales data yet</div>}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { downloadBillPDF } from '../utils/billPDF';
import { useCart } from '../context/CartContext';
import QRCodeDisplay from '../components/QRCodeDisplay';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

export default function BillPage() {
  const { billId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (billId === 'demo' && location.state?.demoCart) {
      // Build synthetic bill from cart state
      const cart = location.state.demoCart;
      const shop = location.state.shop || { shopName: 'Demo Shop', upiId: 'demo@upi', gstNumber: '' };
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      const gstAmount = Math.round(subtotal * 0.18);
      setBill({
        _id: 'demo',
        billCode: 'DEMO-1001',
        billNumber: 1001,
        items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty, subtotal: i.price * i.qty })),
        subtotal, gstAmount, total: subtotal + gstAmount,
        gstRate: 18,
        paymentStatus: 'pending',
        createdAt: new Date(),
        shopkeeper: shop,
      });
      setLoading(false);
      clearCart();
      return;
    }
    api.get(`/bills/${billId}`)
      .then((r) => { setBill(r.data.bill); clearCart(); })
      .catch(() => toast.error('Bill not found'))
      .finally(() => setLoading(false));
  }, [billId]);

  const handleMarkPaid = async () => {
    try {
      if (billId !== 'demo') {
        await api.patch(`/bills/${billId}/payment`, { paymentMethod: 'upi' });
      }
      setPaid(true);
      toast.success('Payment confirmed!');
    } catch (err) {
      toast.error('Could not update payment status');
    }
  };

  const openUPI = () => {
    if (!bill?.shopkeeper?.upiId) { toast.error('UPI ID not available'); return; }
    const url = `upi://pay?pa=${bill.shopkeeper.upiId}&pn=${encodeURIComponent(bill.shopkeeper.shopName)}&am=${bill.total}&cu=INR&tn=Bill-${bill.billCode}`;
    window.location.href = url;
  };

  const handleDownload = () => {
    if (!bill) return;
    try { downloadBillPDF(bill); toast.success('Bill downloaded!'); }
    catch (e) { toast.error('Download failed: ' + e.message); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading bill...</div>;
  if (!bill) return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>Bill not found</div>;

  const shop = bill.shopkeeper;
  const upiQRUrl = `upi://pay?pa=${shop?.upiId}&pn=${encodeURIComponent(shop?.shopName || '')}&am=${bill.total}&cu=INR`;

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => navigate('/')}>← Home</button>
        <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>Your Bill</span>
        <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={handleDownload}>⬇ PDF</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 40 }}>
        {/* Shop Header */}
        <div className="card" style={{ textAlign: 'center', padding: 20, marginBottom: 16 }}>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700 }}>{shop?.shopName}</div>
          {shop?.address && <div style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0' }}>{shop.address}</div>}
          {shop?.gstNumber && <div style={{ fontSize: 11, color: '#94a3b8' }}>GST: {shop.gstNumber}</div>}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
            {bill.billCode} · {dayjs(bill.createdAt).format('DD MMM YYYY, hh:mm A')}
          </div>
        </div>

        {/* Items Table */}
        <div className="card" style={{ marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a3a' }}>
                {['Item', 'Qty', 'Total'].map((h) => (
                  <th key={h} style={{ textAlign: h === 'Total' ? 'right' : 'left', color: '#94a3b8', fontWeight: 500, padding: '0 0 8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e1e2e' }}>
                  <td style={{ padding: '8px 0' }}>
                    <div>{item.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>₹{item.price} × {item.qty}</div>
                  </td>
                  <td style={{ padding: '8px 0', color: '#94a3b8' }}>{item.qty}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 500 }}>₹{item.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '1px solid #2a2a3a', marginTop: 8, paddingTop: 8 }}>
            {[
              { label: 'Subtotal', value: `₹${bill.subtotal}`, color: '#f1f5f9' },
              { label: `GST (${bill.gstRate}%)`, value: `₹${bill.gstAmount}`, color: '#94a3b8' },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: r.color }}><span>{r.label}</span><span>{r.value}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#f97316', borderTop: '1px solid #2a2a3a', marginTop: 6 }}>
              <span>Total</span><span>₹{bill.total}</span>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        {paid || bill.paymentStatus === 'paid' ? (
          <div style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, color: '#22c55e', fontWeight: 500 }}>Payment Received!</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Thank you for shopping</div>
          </div>
        ) : (
          <div className="card">
            <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 14 }}>Pay Now</div>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>{shop?.upiId}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Scan QR or use UPI app · ₹{bill.total}</div>
              {shop?.upiId && <QRCodeDisplay value={upiQRUrl} size={120} />}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn btn-green btn-full" onClick={handleMarkPaid}>✓ Mark as Paid</button>
              <button className="btn btn-blue btn-full" onClick={openUPI}>Open UPI</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

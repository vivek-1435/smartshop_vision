import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useVisionScanner } from '../hooks/useVision';
import ModelLoader from '../components/ModelLoader';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Wrap in ModelLoader so MobileNet is ready before any scanning
export default function Scanner() {
  return <ModelLoader><ScannerInner /></ModelLoader>;
}

const DEMO_PRODUCTS = [
  { name: 'Engine Oil 1L', price: 350, category: 'Oils' },
  { name: 'Brake Pad Set', price: 680, category: 'Brakes' },
  { name: 'Air Filter', price: 220, category: 'Filters' },
  { name: 'Headlight Bulb H4', price: 180, category: 'Electricals' },
  { name: 'Wiper Blade', price: 150, category: 'Accessories' },
  { name: 'Coolant 1L', price: 280, category: 'Fluids' },
  { name: 'Spark Plug Set', price: 420, category: 'Ignition' },
  { name: 'Clutch Plate', price: 1200, category: 'Transmission' },
];

function ScannerInner() {
  const [params] = useSearchParams();
  const shopId = params.get('shop');
  const navigate = useNavigate();
  const { cart, setShopId, addItem, updateQty, removeItem, total } = useCart();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [detectInfo, setDetectInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [manualForm, setManualForm] = useState({ name: '', price: '' });
  const [showManualForm, setShowManualForm] = useState(false);
  const lastDetected = useRef('');

  useEffect(() => {
    if (!shopId) return;
    setShopId(shopId);
    Promise.all([
      api.get(`/shop/public/${shopId}`).catch(() => null),
      api.get(`/products/public/${shopId}`).catch(() => null),
    ]).then(([shopRes, prodRes]) => {
      if (shopRes) setShop(shopRes.data.shop);
      setProducts(prodRes?.data?.products?.length ? prodRes.data.products : DEMO_PRODUCTS);
    });
  }, [shopId, setShopId]);

  const handleDetected = useCallback((detected) => {
    if (detected.label === lastDetected.current) return;
    lastDetected.current = detected.label;
    setTimeout(() => { lastDetected.current = ''; }, 5000);
    // Map label back to product price from catalog
    const prod = products.find((p) => p.name === detected.label) || { name: detected.label, price: 0 };
    setDetectInfo(`Detected: ${detected.label} (${Math.round(detected.confidence * 100)}%)`);
    toast.success(`Added: ${detected.label}`, { duration: 2000 });
    addItem(prod);
    setTimeout(() => setDetectInfo(''), 3000);
  }, [addItem, products]);

  const { videoRef, canvasRef, isScanning, cameraError } = useVisionScanner({
    shopId: shopId === 'demo' ? null : shopId,
    active: true,
    intervalMs: 1500,
    onDetected: handleDetected,
    debounceMs: 5000,
  });

  const handleDone = async () => {
    if (cart.length === 0) { toast.error('Add some items first!'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/bills', {
        shopId: shopId === 'demo' ? 'demo' : shopId,
        items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty, productId: i._id })),
      });
      navigate(`/bill/${data.bill._id}`);
    } catch {
      navigate('/bill/demo', { state: { demoCart: cart, shop } });
    } finally {
      setSubmitting(false);
    }
  };

  const addManualProduct = () => {
    const name = manualForm.name.trim();
    const price = parseFloat(manualForm.price);
    if (!name || !price || price <= 0) { toast.error('Enter a valid name and price'); return; }
    addItem({ name, price });
    toast.success(`Added: ${name}`);
    setManualForm({ name: '', price: '' });
    setShowManualForm(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartItem = (name) => cart.find((i) => i.name === name);

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#0a0a0f', borderBottom: '1px solid #2a2a3a', position: 'sticky', top: 0, zIndex: 40 }}>
        <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => navigate('/')}>← Exit</button>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15 }}>{shop?.shopName || 'Scan Products'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Live</span>
        </div>
      </div>

      {/* Camera Viewport */}
      <div style={{ position: 'relative', width: '100%', height: 220, background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {cameraError ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            Camera unavailable — browse catalog below
          </div>
        ) : (
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div className="scan-box"><div className="scan-line" /></div>
        </div>
        {isScanning && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.75)', color: '#f97316', fontSize: 12, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            🔍 Scanning...
          </div>
        )}
        {detectInfo && (
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(34,197,94,.9)', color: '#fff', fontSize: 12, padding: '6px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
            ✓ {detectInfo}
          </div>
        )}
        {/* Cart badge */}
        {cart.length > 0 && (
          <div style={{ position: 'absolute', top: 10, right: 12, background: '#f97316', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            🛒 {cart.length} · ₹{total}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#13131a', borderBottom: '1px solid #2a2a3a', flexShrink: 0 }}>
        {[
          { id: 'catalog', label: '📦 Products' },
          { id: 'cart', label: `🛒 Cart${cart.length ? ` (${cart.length})` : ''}` },
          { id: 'manual', label: '✏️ Manual' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: '12px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, fontWeight: 500, transition: 'all .2s',
              color: activeTab === tab.id ? '#f97316' : '#94a3b8',
              borderBottom: activeTab === tab.id ? '2px solid #f97316' : '2px solid transparent' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* ── CATALOG TAB ── */}
        {activeTab === 'catalog' && (
          <div style={{ padding: 14 }}>
            <input className="input-field" placeholder="🔍 Search products..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 14, fontSize: 13 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredProducts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13 }}>No products found</div>
              )}
              {filteredProducts.map((p) => {
                const inCart = cartItem(p.name);
                return (
                  <div key={p.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📦</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.category || 'General'}</div>
                      <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600, marginTop: 2 }}>₹{p.price}</div>
                    </div>
                    {inCart ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => updateQty(p.name, inCart.qty - 1)}
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #2a2a3a', background: '#1e1e2e', color: '#f1f5f9', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: 'center', color: '#f97316' }}>{inCart.qty}</span>
                        <button onClick={() => updateQty(p.name, inCart.qty + 1)}
                          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #f97316', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => { addItem(p); toast.success(`Added: ${p.name}`, { duration: 1200 }); }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CART TAB ── */}
        {activeTab === 'cart' && (
          <div style={{ padding: 14 }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
                <div style={{ fontSize: 13 }}>Cart is empty</div>
                <button className="btn btn-secondary" style={{ marginTop: 14, fontSize: 13 }} onClick={() => setActiveTab('catalog')}>Browse Products</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px' }}>Cart ({cart.length} items)</span>
                  <button onClick={() => { if (confirm('Clear cart?')) cart.forEach((i) => removeItem(i.name)); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>Clear all</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {cart.map((item) => (
                    <div key={item.name} className="card slide-in" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>₹{item.price} each</div>
                        </div>
                        <button onClick={() => removeItem(item.name)}
                          style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 13, padding: '3px 8px', flexShrink: 0 }}>Remove</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => updateQty(item.name, item.qty - 1)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #2a2a3a', background: '#1e1e2e', color: '#f1f5f9', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontSize: 15, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                          <button onClick={() => updateQty(item.name, item.qty + 1)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #f97316', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                        <span style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: '#22c55e' }}>₹{item.price * item.qty}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>Order Summary</div>
                  {cart.map((i) => (
                    <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      <span>{i.name} × {i.qty}</span><span>₹{i.price * i.qty}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #2a2a3a', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#f97316' }}>
                    <span>Est. Total</span><span>₹{total}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>* Includes 18% GST</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MANUAL TAB ── */}
        {activeTab === 'manual' && (
          <div style={{ padding: 14 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 16 }}>
              Add any product that isn't in the catalog — just enter its name and price.
            </p>

            {/* Add Custom Product Form */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, color: '#f97316' }}>+ Add Custom Product</div>
              <div style={{ marginBottom: 12 }}>
                <label className="input-label">Product Name</label>
                <input className="input-field" placeholder="e.g. Oil Seal Kit" value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="input-label">Price (₹)</label>
                <input className="input-field" type="number" placeholder="0" min="0" value={manualForm.price}
                  onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })} />
              </div>
              <button className="btn btn-primary btn-full" onClick={addManualProduct}>Add to Cart</button>
            </div>

            {/* Cart items with remove in manual view */}
            {cart.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 10 }}>
                  Items in Cart — tap to remove
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cart.map((item) => (
                    <div key={item.name} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>₹{item.price} × {item.qty} = <span style={{ color: '#22c55e', fontWeight: 600 }}>₹{item.price * item.qty}</span></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => updateQty(item.name, item.qty - 1)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #2a2a3a', background: '#1e1e2e', color: '#f1f5f9', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.name, item.qty + 1)}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #f97316', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        <button onClick={() => { removeItem(item.name); toast(`Removed: ${item.name}`, { icon: '🗑' }); }}
                          style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: '#ef4444', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#13131a', borderTop: '1px solid #2a2a3a', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 50 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Total ({cart.length} items)</div>
          <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#f97316' }}>₹{total}</div>
        </div>
        <button onClick={handleDone} disabled={submitting || cart.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: cart.length > 0 ? '#f97316' : '#2a2a3a', color: '#fff', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, cursor: cart.length > 0 ? 'pointer' : 'not-allowed', transition: 'all .2s', opacity: cart.length > 0 ? 1 : .5 }}>
          {submitting ? 'Generating...' : '👍 Done & Bill'}
        </button>
      </div>
    </div>
  );
}

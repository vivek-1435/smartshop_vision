import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import BottomNav from '../components/BottomNav';
import ModelLoader from '../components/ModelLoader';
import { useVisionTrainer } from '../hooks/useVision';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function TrainModel() {
  return (
    <ModelLoader>
      <TrainModelInner />
    </ModelLoader>
  );
}

function TrainModelInner() {
  const { shopkeeper } = useAuth();
  const shopId = shopkeeper?.shopId || 'demo';
  const trainer = useVisionTrainer(shopId);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('upload');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', price: '', category: 'General', unit: 'piece' });
  const [savingNew, setSavingNew] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedCount, setCapturedCount] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/products')
      .then((r) => setProducts(r.data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      toast.error('Camera unavailable: ' + e.message);
      setMode('upload');
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
  }, [cameraStream]);

  useEffect(() => {
    if (mode === 'camera' && selected) startCamera();
    else stopCamera();
    return stopCamera;
  }, [mode, selected]);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !selected) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 224; canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, 224, 224);
    await trainer.trainOnImage(canvas, selected.name, true);
    setCapturedCount((n) => n + 1);
    toast.success('Frame captured & trained!', { duration: 1000 });
  }, [selected, trainer]);

  const handleFiles = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selected) return;
    setUploadProgress({ done: 0, total: files.length });
    await trainer.trainOnFiles(
      files, selected.name, true,
      (done, total) => setUploadProgress({ done, total })
    );
    setUploadProgress(null);
    toast.success(`Trained on ${files.length} image(s)!`);
    e.target.value = '';
  }, [selected, trainer]);

  const saveNewProduct = useCallback(async () => {
    if (!newForm.name || !newForm.price) { toast.error('Name and price required'); return; }
    setSavingNew(true);
    try {
      const res = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      const blob = await res.blob();
      const fd = new FormData();
      fd.append('image', blob, 'placeholder.png');
      fd.append('name', newForm.name);
      fd.append('price', newForm.price);
      fd.append('category', newForm.category);
      fd.append('unit', newForm.unit);
      const { data } = await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProducts((p) => [data.product, ...p]);
      setAddingNew(false);
      setSelected(data.product);
      setNewForm({ name: '', price: '', category: 'General', unit: 'piece' });
      toast.success('Product saved! Now train it with images.');
    } catch {
      const local = { _id: Date.now().toString(), ...newForm, price: parseFloat(newForm.price), imageUrl: null };
      setProducts((p) => [local, ...p]);
      setAddingNew(false);
      setSelected(local);
      setNewForm({ name: '', price: '', category: 'General', unit: 'piece' });
      toast('Saved locally (offline mode)', { icon: '⚠️' });
    } finally { setSavingNew(false); }
  }, [newForm]);

  const deleteProduct = async (prod) => {
    if (!confirm(`Remove "${prod.name}"?`)) return;
    try { await api.delete(`/products/${prod._id}`); } catch (_) {}
    await trainer.removeSamples(prod.name);
    setProducts((p) => p.filter((x) => x._id !== prod._id));
    if (selected?._id === prod._id) setSelected(null);
    toast.success('Product removed');
  };

  const qualityOf = (count) => count === 0 ? null : count < 5 ? 'low' : count < 15 ? 'ok' : 'good';
  const qualityColor = { low: '#f97316', ok: '#eab308', good: '#22c55e' };
  const qualityLabel = { low: 'Needs more images (aim for 10+)', ok: 'Acceptable', good: '✓ Well trained' };

  return (
    <div>
      <div className="topbar">
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Train Vision AI</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="tag tag-green" style={{ fontSize: 10 }}>On-Device</span>
          <button onClick={trainer.exportModel} style={{ background: 'none', border: '1px solid #2a2a3a', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', fontSize: 11, padding: '4px 8px' }}>⬇ Export</button>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Products', val: trainer.productCount },
            { label: 'Samples', val: trainer.totalSamples },
            { label: 'Model', val: trainer.totalSamples > 0 ? '● Active' : '○ Empty' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: s.label === 'Model' && trainer.totalSamples > 0 ? '#22c55e' : '#f1f5f9' }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Add product */}
        {!addingNew ? (
          <button className="btn btn-primary btn-full" style={{ marginBottom: 16 }} onClick={() => setAddingNew(true)}>+ Add New Product</button>
        ) : (
          <div className="card" style={{ marginBottom: 16, borderColor: '#f97316' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f97316', marginBottom: 12 }}>New Product</div>
            {[['name', 'Product Name', 'Engine Oil 1L', 'text'], ['price', 'Price (₹)', '350', 'number'], ['category', 'Category', 'Oils', 'text']].map(([key, label, ph, type]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label className="input-label">{label}</label>
                <input className="input-field" type={type} placeholder={ph} value={newForm[key]} onChange={(e) => setNewForm({ ...newForm, [key]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveNewProduct} disabled={savingNew}>{savingNew ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-secondary" onClick={() => setAddingNew(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Product list */}
        <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
          Product Catalog ({products.length})
        </div>

        {loadingProducts ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {products.map((p) => {
              const count = trainer.sampleCounts[p.name] || 0;
              const q = qualityOf(count);
              const isSelected = selected?._id === p._id;
              return (
                <div key={p._id} className="card"
                  style={{ borderColor: isSelected ? '#f97316' : '#2a2a3a', transition: 'border-color .2s', cursor: 'pointer' }}
                  onClick={() => setSelected(isSelected ? null : p)}>

                  {/* Product row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 44, height: 44, borderRadius: 8, background: '#1e1e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>₹{p.price}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: q ? qualityColor[q] : '#475569', marginBottom: 4 }}>
                        {count > 0 ? `${count} samples` : 'Untrained'}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteProduct(p); }}
                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, padding: 0 }}>🗑 Remove</button>
                    </div>
                  </div>

                  {/* Training panel */}
                  {isSelected && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2a3a' }} onClick={(e) => e.stopPropagation()}>
                      {/* Quality bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Training quality</span>
                          {q && <span style={{ fontSize: 11, color: qualityColor[q] }}>{qualityLabel[q]}</span>}
                        </div>
                        <div style={{ height: 5, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: q ? qualityColor[q] : '#2a2a3a', width: `${Math.min(100, (count / 20) * 100)}%`, transition: 'width .4s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{count}/20 recommended samples</div>
                      </div>

                      {/* Mode switch */}
                      <div style={{ display: 'flex', background: '#1e1e2e', borderRadius: 8, padding: 3, marginBottom: 12 }}>
                        {[['upload', '📁 Upload Photos'], ['camera', '📷 Live Camera']].map(([m, label]) => (
                          <button key={m} onClick={() => setMode(m)}
                            style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: mode === m ? '#f97316' : 'transparent', color: mode === m ? '#fff' : '#94a3b8', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 12, transition: 'all .2s' }}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Upload */}
                      {mode === 'upload' && (
                        <>
                          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFiles} />
                          <button className="btn btn-secondary btn-full" onClick={() => fileInputRef.current?.click()} disabled={trainer.training}>
                            {trainer.training ? '⏳ Training…' : '📁 Select Images'}
                          </button>
                          {uploadProgress && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Training {uploadProgress.done}/{uploadProgress.total} images…</div>
                              <div style={{ height: 4, background: '#1e1e2e', borderRadius: 2 }}>
                                <div style={{ height: '100%', background: '#f97316', borderRadius: 2, width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, transition: 'width .2s' }} />
                              </div>
                            </div>
                          )}
                          <p style={{ fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 1.5 }}>
                            Each photo generates 5 augmented variants automatically. Aim for 3–5 diverse photos.
                          </p>
                        </>
                      )}

                      {/* Camera */}
                      {mode === 'camera' && (
                        <div>
                          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 10 }}>
                            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            {capturedCount > 0 && (
                              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(34,197,94,.9)', color: '#fff', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
                                ✓ {capturedCount} captured
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" style={{ flex: 1, fontSize: 14, padding: '14px' }} onClick={captureFrame} disabled={trainer.training}>
                              📸 {trainer.training ? 'Training…' : 'Capture Frame'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => { setMode('upload'); setCapturedCount(0); }}>✕</button>
                          </div>
                          <p style={{ fontSize: 11, color: '#475569', marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>
                            Move the product to different angles while capturing
                          </p>
                        </div>
                      )}

                      {/* Clear samples */}
                      {count > 0 && (
                        <button onClick={() => { trainer.removeSamples(p.name); toast('Training data cleared', { icon: '🗑' }); }}
                          style={{ marginTop: 12, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0, display: 'block' }}>
                          Clear {count} training samples
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!loadingProducts && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>Add your first product above</div>
            )}
          </div>
        )}

        {/* Import */}
        <div className="card" style={{ margin: '20px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>📥 Import Model</div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 }}>Restore training data from an exported .json file.</p>
          <input type="file" accept=".json" id="import-json" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;
              const text = await file.text();
              const count = await trainer.importModel(text);
              toast.success(`Imported ${count} training samples`);
              e.target.value = '';
            }} />
          <button className="btn btn-secondary btn-full" onClick={() => document.getElementById('import-json').click()}>Import Model File</button>
        </div>

        {trainer.totalSamples > 0 && (
          <button onClick={() => { if (confirm('Delete ALL training data for this shop?')) { trainer.clearAll(); toast.success('Cleared'); } }}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.05)', color: '#ef4444', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 13 }}>
            🗑 Clear All Training Data
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

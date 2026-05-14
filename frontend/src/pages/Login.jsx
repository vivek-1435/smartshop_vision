import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (res.ok) { toast.success('Welcome back!'); navigate('/dashboard'); }
    else toast.error(res.error);
  };

  return (
    <div style={{ padding: 24, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar" style={{ padding: '0 0 16px' }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>SmartShop</span>
        <div style={{ width: 50 }} />
      </div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, margin: '28px 0 24px' }}>Sign In</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <label className="input-label">Email</label>
          <input className="input-field" type="email" placeholder="your@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="input-label">Password</label>
          <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button className="btn btn-primary btn-full" style={{ fontSize: 15, padding: 16 }} type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
        No account? <Link to="/register" style={{ color: '#f97316', textDecoration: 'none' }}>Register your shop</Link>
      </p>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    shopName: '', ownerName: '', email: '',
    password: '', upiId: '', phone: '', gstNumber: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    // Clear error for that field as user types
    if (fieldErrors[k]) setFieldErrors({ ...fieldErrors, [k]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    const res = await register(form);
    if (res.ok) {
      toast.success('Shop registered!');
      navigate('/dashboard');
    } else {
      // If server returned field-level details, show them inline
      if (res.details && res.details.length > 0) {
        const errs = {};
        res.details.forEach((d) => { errs[d.field] = d.msg; });
        setFieldErrors(errs);
        toast.error(res.details[0].msg);
      } else {
        toast.error(res.error || 'Registration failed');
      }
    }
  };

  const fields = [
    { key: 'shopName',   label: 'Shop Name',            placeholder: 'Sharma Auto Parts',  required: true },
    { key: 'ownerName',  label: 'Owner Name',            placeholder: 'Rajesh Sharma',       required: true },
    { key: 'email',      label: 'Email',                 placeholder: 'you@email.com',       type: 'email', required: true },
    { key: 'upiId',      label: 'UPI ID',                placeholder: 'yourname@okaxis',     required: true },
    { key: 'phone',      label: 'Phone (optional)',      placeholder: '+91 98765 43210' },
    { key: 'gstNumber',  label: 'GST Number (optional)', placeholder: '03ABCDE1234F1Z5' },
    { key: 'password',   label: 'Password (min 6 chars)',placeholder: '••••••••',            type: 'password', required: true },
  ];

  return (
    <div style={{ padding: '24px', minHeight: '100dvh', paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>← Back</Link>
        <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>SmartShop</span>
        <div style={{ width: 50 }} />
      </div>

      <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Register Shop</h2>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, lineHeight: 1.5 }}>
        Fill in your shop details to get started.
      </p>

      <form onSubmit={handleSubmit}>
        {fields.map((f) => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label className="input-label">{f.label}</label>
            <input
              className="input-field"
              type={f.type || 'text'}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={set(f.key)}
              required={f.required}
              style={{ borderColor: fieldErrors[f.key] ? '#ef4444' : undefined }}
            />
            {fieldErrors[f.key] && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                ⚠ {fieldErrors[f.key]}
              </div>
            )}
          </div>
        ))}

        {/* Password hint */}
        <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, marginTop: -8 }}>
          Minimum 6 characters
        </p>

        <button
          className="btn btn-primary btn-full"
          style={{ fontSize: 15, padding: 16, marginTop: 4 }}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register Shop →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
        Already registered?{' '}
        <Link to="/login" style={{ color: '#f97316', textDecoration: 'none' }}>Sign in</Link>
      </p>
    </div>
  );
}
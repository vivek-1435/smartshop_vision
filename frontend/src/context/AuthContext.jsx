import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ss_token'));
  const [shopkeeper, setShopkeeper] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ss_shop') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setToken(data.token);
      setShopkeeper(data.shopkeeper);
      localStorage.setItem('ss_token', data.token);
      localStorage.setItem('ss_shop', JSON.stringify(data.shopkeeper));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      // Strip empty optional fields so server optional() validators don't trigger
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== '')
      );
      const { data } = await api.post('/auth/register', payload);
      setToken(data.token);
      setShopkeeper(data.shopkeeper);
      localStorage.setItem('ss_token', data.token);
      localStorage.setItem('ss_shop', JSON.stringify(data.shopkeeper));
      return { ok: true };
    } catch (err) {
      const respData = err.response?.data || {};
      return {
        ok: false,
        error: respData.error || 'Registration failed',
        details: respData.details || [],   // field-level errors array
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setShopkeeper(null);
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_shop');
  };

  const updateShopkeeper = (updates) => {
    const updated = { ...shopkeeper, ...updates };
    setShopkeeper(updated);
    localStorage.setItem('ss_shop', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ token, shopkeeper, loading, login, register, logout, updateShopkeeper }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
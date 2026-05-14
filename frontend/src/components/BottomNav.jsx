import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { icon: '🏠', label: 'Home', path: '/dashboard' },
  { icon: '📊', label: 'Analytics', path: '/analytics' },
  { icon: '🧠', label: 'Train AI', path: '/train' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="bottom-nav">
      {NAV.map((item) => (
        <button
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
      <button className="nav-item" onClick={logout}>
        <span className="nav-icon">🚪</span>
        Logout
      </button>
    </div>
  );
}

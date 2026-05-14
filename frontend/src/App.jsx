import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Lazy-load heavy pages so TF.js doesn't block initial paint
const Landing    = lazy(() => import('./pages/Landing'));
const Login      = lazy(() => import('./pages/Login'));
const Register   = lazy(() => import('./pages/Register'));
const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Analytics  = lazy(() => import('./pages/Analytics'));
const TrainModel = lazy(() => import('./pages/TrainModel'));
const Scanner    = lazy(() => import('./pages/Scanner'));
const BillPage   = lazy(() => import('./pages/BillPage'));

function PageLoader() {
  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' }}>
      <div style={{ display:'flex', gap:8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:'#f97316', animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="app-shell">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"          element={<Landing />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/train"     element={<PrivateRoute><TrainModel /></PrivateRoute>} />
          <Route path="/scan"      element={<Scanner />} />
          <Route path="/bill/:billId" element={<BillPage />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import './index.css';

const toastOptions = {
  style: {
    background: '#13131a', color: '#f1f5f9',
    border: '1px solid #2a2a3a', borderRadius: '10px',
    fontFamily: 'DM Sans', fontSize: '14px',
  },
  success: { iconTheme: { primary: '#22c55e', secondary: '#13131a' }, duration: 2500 },
  error:   { iconTheme: { primary: '#ef4444', secondary: '#13131a' }, duration: 4000 },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <OfflineBanner />
            <App />
            <Toaster position="top-center" toastOptions={toastOptions} />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

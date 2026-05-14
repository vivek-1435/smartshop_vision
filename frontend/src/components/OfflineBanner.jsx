import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, zIndex: 9999,
      background: '#ef4444', color: '#fff',
      padding: '10px 16px', textAlign: 'center',
      fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans',
    }}>
      📡 You're offline — scanning and billing work, syncing paused
    </div>
  );
}

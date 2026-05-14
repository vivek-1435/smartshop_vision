import { useEffect } from 'react';
import { useModelLoader } from '../hooks/useVision';

/**
 * Renders a loading screen while MobileNetV3 downloads.
 * Once ready, renders children.
 */
export default function ModelLoader({ children }) {
  const { status, progress, error, load } = useModelLoader();

  useEffect(() => { load(); }, [load]);

  if (status === 'ready') return children;

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center', background: '#0a0a0f',
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🧠</div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        {status === 'error' ? 'Model Load Failed' : 'Loading Vision Model'}
      </h2>

      {status === 'error' ? (
        <>
          <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{error}</p>
          <button className="btn btn-primary" onClick={load}>Retry</button>
        </>
      ) : (
        <>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Downloading MobileNetV3 (~2 MB)<br />
            This only happens once — then it's cached forever.
          </p>

          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 280, background: '#1e1e2e', borderRadius: 8, height: 8, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              height: '100%', background: '#f97316', borderRadius: 8,
              width: `${progress.pct}%`, transition: 'width .3s ease',
            }} />
          </div>

          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            {progress.stage || 'Initialising…'} {progress.pct > 0 ? `(${progress.pct}%)` : ''}
          </p>

          {/* Animated dots */}
          <div style={{ display: 'flex', gap: 6, marginTop: 24 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: '50%', background: '#f97316',
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
          <style>{`
            @keyframes pulse {
              0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </>
      )}

      <p style={{ fontSize: 11, color: '#475569', marginTop: 32, lineHeight: 1.5 }}>
        Model runs 100% on-device.<br />No images are sent to any server.
      </p>
    </div>
  );
}

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    // In production you'd send this to Sentry / LogRocket
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center', background: '#0a0a0f',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#f1f5f9' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6, maxWidth: 280 }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
          style={{ padding: '12px 24px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 14, fontWeight: 500 }}>
          Return to Home
        </button>
        {import.meta.env.DEV && (
          <pre style={{ marginTop: 24, textAlign: 'left', fontSize: 11, color: '#ef4444', background: '#1e1e2e', padding: 12, borderRadius: 8, maxWidth: '100%', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
        )}
      </div>
    );
  }
}

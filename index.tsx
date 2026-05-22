
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './MainApp';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.hostname === 'localhost') {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch((error) => {
      console.error('No se pudo limpiar service workers en local:', error);
    });
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Error inesperado en la aplicación.' };
  }

  componentDidCatch(error: Error) {
    console.error('App crash captured by RootErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0a09', color: '#fff', padding: 24 }}>
          <div style={{ maxWidth: 420, background: '#1c1917', border: '1px solid #44403c', borderRadius: 24, padding: 24 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>Recorre Argentina</h1>
            <p style={{ marginTop: 12, marginBottom: 0, fontWeight: 600 }}>La app encontró un error al iniciar.</p>
            <p style={{ marginTop: 8, marginBottom: 16, opacity: 0.85 }}>{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#047857', color: '#fff', border: 0, borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

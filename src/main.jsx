import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LicenseGate } from './components/LicenseGate.jsx'

function Root() {
  // In browser dev mode: skip license gate entirely
  // In Electron: check license via IPC
  const isElectron = typeof window !== 'undefined' && !!window.phantomAPI?.isElectron;

  const [licensed, setLicensed] = useState(!isElectron);
  const [checking, setChecking] = useState(isElectron);

  useEffect(() => {
    if (!isElectron) return;
    window.phantomAPI.getLicenseStatus().then(status => {
      setLicensed(status.licensed);
      setChecking(false);
    }).catch(() => {
      setLicensed(false);
      setChecking(false);
    });
  }, [isElectron]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#05070d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(176,38,255,0.2)', borderTop: '3px solid #b026ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!licensed) {
    return <LicenseGate onLicensed={() => setLicensed(true)} />;
  }

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

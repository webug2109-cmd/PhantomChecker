import { useState, useEffect } from 'react';
import { Shield, Key, AlertCircle, CheckCircle2, Cpu, RefreshCw } from 'lucide-react';

export function LicenseGate({ onLicensed }) {
  const [key, setKey] = useState('');
  const [machineId, setMachineId] = useState('');
  const [status, setStatus] = useState(null); // null | 'validating' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch machine ID from Electron IPC (or API fallback for dev)
    const load = async () => {
      try {
        if (window.phantomAPI?.getMachineId) {
          const id = await window.phantomAPI.getMachineId();
          setMachineId(id);
        } else {
          // Dev fallback — fetch from API server
          const res = await fetch('/api/machine-id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const data = await res.json();
          setMachineId(data.machineId || 'unavailable');
        }
      } catch {
        setMachineId('unavailable');
      }
    };
    load();
  }, []);

  const handleValidate = async () => {
    const cleaned = key.trim().toUpperCase();
    if (!cleaned) { setStatus('error'); setErrorMsg('Please enter your license key.'); return; }

    setStatus('validating');
    setErrorMsg('');

    try {
      let result;
      if (window.phantomAPI?.validateLicense) {
        result = await window.phantomAPI.validateLicense(cleaned);
      } else {
        // Dev fallback
        await new Promise(r => setTimeout(r, 800));
        result = { valid: false, reason: 'Electron IPC not available in browser mode.' };
      }

      if (result.valid) {
        setStatus('success');
        setTimeout(() => onLicensed?.(), 1200);
      } else {
        setStatus('error');
        setErrorMsg(result.reason || 'Invalid license key.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Validation error: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleCopyMachineId = async () => {
    if (!machineId || machineId === 'unavailable') return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(machineId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleValidate();
  };

  // Auto-format as user types: insert dashes at PHANTOM-XXXX-XXXX-XXXX-XXXX
  const handleKeyInput = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setKey(val);
    setStatus(null);
    setErrorMsg('');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#05070d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '20px'
    }}>
      {/* Ambient glow blobs */}
      <div style={{ position: 'fixed', top: '20%', left: '15%', width: '340px', height: '340px', background: 'radial-gradient(circle, rgba(176,38,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '15%', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 0 80px rgba(176,38,255,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset'
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(0,229,255,0.2))',
            border: '1px solid rgba(176,38,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 32px rgba(176,38,255,0.3)'
          }}>
            <Shield size={30} color="#b026ff" />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Phantom Checker
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#8b9bb4', margin: 0 }}>
            Enter your license key to activate
          </p>
        </div>

        {/* Machine ID box */}
        <div style={{
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', color: '#8b9bb4', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <Cpu size={12} /> Your Machine ID
            </span>
            <button
              onClick={handleCopyMachineId}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem', color: copied ? '#00ff9d' : '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {copied ? <><CheckCircle2 size={11} /> Copied!</> : 'Copy ID'}
            </button>
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem',
            color: '#00e5ff', wordBreak: 'break-all', lineHeight: 1.6,
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {machineId
              ? <span>{machineId.slice(0, 32)}…</span>
              : <span style={{ color: '#8b9bb4', display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={11} style={{ animation: 'spin 1.5s linear infinite' }} /> Loading…</span>
            }
          </div>
          <p style={{ fontSize: '0.62rem', color: '#4a5568', margin: '8px 0 0', lineHeight: 1.5 }}>
            Send this ID to the keygen operator to receive your machine-locked key.
          </p>
        </div>

        {/* Key Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', color: '#8b9bb4', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            License Key
          </label>
          <div style={{ position: 'relative' }}>
            <Key size={15} color="#8b9bb4" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={key}
              onChange={handleKeyInput}
              onKeyDown={handleKeyDown}
              placeholder="PHANTOM-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${status === 'error' ? 'rgba(248,113,113,0.5)' : status === 'success' ? 'rgba(0,255,157,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '12px', padding: '12px 14px 12px 40px',
                color: '#fff', fontSize: '0.78rem',
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none', transition: 'border-color 0.2s',
                letterSpacing: '0.04em'
              }}
            />
          </div>
        </div>

        {/* Error / Success Message */}
        {status === 'error' && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '16px'
          }}>
            <AlertCircle size={14} color="#f87171" style={{ marginTop: '1px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#f87171', lineHeight: 1.4 }}>{errorMsg}</span>
          </div>
        )}

        {status === 'success' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '16px'
          }}>
            <CheckCircle2 size={14} color="#00ff9d" />
            <span style={{ fontSize: '0.75rem', color: '#00ff9d' }}>License activated! Loading checker…</span>
          </div>
        )}

        {/* Activate Button */}
        <button
          onClick={handleValidate}
          disabled={status === 'validating' || status === 'success'}
          style={{
            width: '100%', padding: '13px',
            background: status === 'success'
              ? 'linear-gradient(135deg, #00ff9d, #00e5ff)'
              : 'linear-gradient(135deg, #b026ff, #7c3aed)',
            border: 'none', borderRadius: '12px',
            color: '#fff', fontSize: '0.85rem', fontWeight: 700,
            cursor: status === 'validating' || status === 'success' ? 'default' : 'pointer',
            opacity: status === 'validating' ? 0.7 : 1,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            letterSpacing: '0.03em',
            boxShadow: '0 4px 24px rgba(176,38,255,0.35)'
          }}
        >
          {status === 'validating'
            ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Validating…</>
            : status === 'success'
            ? <><CheckCircle2 size={15} /> Activated!</>
            : <><Shield size={15} /> Activate License</>
          }
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.62rem', color: '#4a5568', marginTop: '20px', lineHeight: 1.5 }}>
          This software is machine-locked. Keys cannot be shared or transferred.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

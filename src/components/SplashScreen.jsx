import { useState, useEffect } from 'react';
import { Ghost, Zap, Shield, Sparkles, ArrowRight, Play } from 'lucide-react';

export function SplashScreen({ onDismiss }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Phantom Engine v3.8...');

  useEffect(() => {
    const steps = [
      { p: 25, text: 'Mounting IMAP TLS Socket Drivers...' },
      { p: 55, text: 'Loading Multi-Protocol Proxies & Canadian Domains...' },
      { p: 85, text: 'Connecting Telegram Relay & Keyword Target Engine...' },
      { p: 100, text: 'High-CPM Engine Ready.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setProgress(steps[currentStep].p);
        setStatusText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onDismiss();
        }, 450);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [onDismiss]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 50% 45%, rgba(18, 12, 38, 0.95) 0%, rgba(4, 5, 10, 0.98) 100%)',
      backdropFilter: 'blur(25px)',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      {/* Ambient background particles and glow aura */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(176,38,255,0.18) 0%, rgba(0,229,255,0.12) 50%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        padding: '36px 32px',
        borderRadius: '24px',
        background: 'rgba(10, 14, 26, 0.85)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.9), 0 0 45px rgba(0, 229, 255, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        animation: 'splashPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        {/* Ghost Avatar Container */}
        <div style={{ position: 'relative', marginBottom: '22px' }}>
          <div style={{
            position: 'absolute',
            inset: '-14px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,229,255,0.4) 0%, rgba(176,38,255,0.3) 60%, transparent 80%)',
            filter: 'blur(16px)',
            animation: 'pulse 2s infinite'
          }} />
          <div style={{
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            padding: '4px',
            background: 'linear-gradient(135deg, #00e5ff, #b026ff)',
            boxShadow: '0 0 35px rgba(0, 229, 255, 0.5), inset 0 0 20px rgba(176, 38, 255, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'ghostFloat 3.5s ease-in-out infinite'
          }}>
            <img
              src="/phantom-ghost.png"
              alt="Phantom Ghost"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // Fallback to vector icon if image fails
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Title & Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span className="badge-ca" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
            🇨🇦 CA / 🇺🇸 USA
          </span>
          <span style={{
            fontSize: '0.65rem',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'rgba(0, 255, 157, 0.12)',
            border: '1px solid rgba(0, 255, 157, 0.3)',
            color: '#00ff9d',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700
          }}>
            v3.8 PHANTOM EDITION
          </span>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          letterSpacing: '-0.5px',
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, #ffffff 20%, #c4b5fd 60%, #00e5ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 30px rgba(0, 229, 255, 0.3)'
        }}>
          PHANTOM <span style={{ color: '#00e5ff', WebkitTextFillColor: '#00e5ff' }}>CHECKER</span>
        </h1>

        <p style={{
          fontSize: '0.8rem',
          color: '#8b9bb4',
          fontFamily: "'JetBrains Mono', monospace",
          margin: '0 0 24px 0',
          lineHeight: 1.5,
          maxWidth: '380px'
        }}>
          High-Speed Dual Engine &bull; IMAP & OWA Protocol Telemetry &bull; Instant Target Forwarding
        </p>

        {/* Progress Bar */}
        <div style={{ width: '100%', marginBottom: '14px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#8b9bb4',
            marginBottom: '6px'
          }}>
            <span style={{ color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Zap size={12} /> {statusText}
            </span>
            <span style={{ color: '#00ff9d', fontWeight: 700 }}>{progress}%</span>
          </div>

          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '999px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #b026ff, #00e5ff, #00ff9d)',
              borderRadius: '999px',
              transition: 'width 0.35s ease',
              boxShadow: '0 0 15px rgba(0, 229, 255, 0.8)'
            }} />
          </div>
        </div>

        {/* Skip / Enter Action */}
        <button
          onClick={onDismiss}
          className="glass-btn glass-btn-green"
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 0 25px rgba(0, 255, 157, 0.3)',
            cursor: 'pointer'
          }}
        >
          <Play size={16} fill="currentColor" />
          ENTER PHANTOM CHECKER STUDIO
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

import { Ghost, ShieldCheck, Mail, Key, Database, Terminal, Cpu, Flag, HardDrive, Play, Square, RefreshCw, Shield, Zap } from 'lucide-react';

export function Header({ activeTab, setActiveTab, stats, isRunning, onStart, onStop, onClear }) {
  return (
    <header style={{
      width: '100%',
      background: 'rgba(6, 8, 14, 0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Top Bar */}
      <div style={{ width: '100%', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(176,38,255,0.35), rgba(0,229,255,0.25))',
            border: '1px solid rgba(176,38,255,0.4)',
            boxShadow: '0 0 24px rgba(176,38,255,0.4)'
          }}>
            <Ghost size={24} color="#00e5ff" />
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              width: '12px', height: '12px', borderRadius: '50%',
              background: '#b026ff', boxShadow: '0 0 10px #b026ff',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px',
                background: 'linear-gradient(to right, #ffffff, #d8b4fe, #00e5ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                PHANTOM <span style={{ color: '#00e5ff', WebkitTextFillColor: '#00e5ff', fontWeight: 900 }}>CHECKER</span>
              </h1>
              <span className="badge-ca" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flag size={12} color="#ff0055" fill="#ff0055" /> CA / USA
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>v3.8 PHANTOM EDITION</span><span>•</span>
              <span style={{ color: '#00e5ff' }}>HIGH-CPM ENGINE READY</span>
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!isRunning ? (
            <button onClick={onStart} disabled={stats.totalLoaded === 0}
              className="glass-btn glass-btn-green"
              style={{ fontWeight: 700, fontSize: '0.8rem', opacity: stats.totalLoaded === 0 ? 0.5 : 1 }}>
              <Play size={16} fill="currentColor" /> START CHECKER
            </button>
          ) : (
            <button onClick={onStop} className="glass-btn glass-btn-danger" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
              <Square size={16} fill="currentColor" /> STOP ENGINE
            </button>
          )}
          <button onClick={onClear} className="glass-btn" style={{ fontSize: '0.75rem', color: '#8b9bb4' }}>
            <RefreshCw size={14} /> CLEAR
          </button>
        </div>

        {/* Metrics Pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px 16px', borderRadius: '14px', fontSize: '0.75rem',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#00ff9d" />
            <span style={{ color: '#8b9bb4' }}>CPM:</span>
            <span style={{ color: '#00ff9d', fontWeight: 800 }}>{stats.cpm}</span>
          </div>
          <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={16} color="#b026ff" />
            <span style={{ color: '#8b9bb4' }}>CPS:</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{stats.cps} req/s</span>
          </div>
          <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={16} color="#00e5ff" />
            <span style={{ color: '#8b9bb4' }}>LOADED:</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{stats.totalLoaded}</span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{
        width: '100%', padding: '6px 24px 0',
        display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.05)'
      }}>
        {[
          { id: 'checker', icon: <Terminal size={16} color="#00ff9d" />, label: 'CHECKER STUDIO', badge: stats.totalLoaded > 0 ? stats.totalLoaded : null, badgeColor: '#00ff9d' },
          { id: 'proxies', icon: <Shield size={16} color="#b026ff" />, label: 'MULTI-PROTOCOL PROXIES', badge: stats.proxyCount > 0 ? `${stats.proxyCount} ${stats.proxyMode !== 'none' ? 'ACTIVE' : ''}` : null, badgeColor: '#b026ff' },
          { id: 'mail-viewer', icon: <Mail size={16} color="#00e5ff" />, label: 'LIVE MAIL VIEWER', badge: stats.canadianHits > 0 ? `${stats.canadianHits} CA` : null, badgeColor: '#00e5ff' },
          { id: 'keyword-targets', icon: <Key size={16} color="#ff0055" />, label: 'TARGET KEYWORD SEARCH', badge: `${stats.targetHitsCount} MATCHES`, badgeColor: '#ff0055' },
          { id: 'canadian-domains', icon: <Database size={16} color="#ffb700" />, label: 'DOMAINS & IMAP INTEL', badge: 'USA + CA', badgeColor: '#ffb700' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`window-tab ${activeTab === tab.id ? 'active' : ''}`}>
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{
                background: `${tab.badgeColor}20`, color: tab.badgeColor,
                padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem',
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700
              }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    </header>
  );
}

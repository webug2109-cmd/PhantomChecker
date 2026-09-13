import {
  Terminal, Shield, Mail, Key, Database, Play, Square, RefreshCw,
  Zap, Cpu, HardDrive, Wifi, Activity, CheckCircle2, ChevronRight
} from 'lucide-react';

export function Sidebar({
  activeTab,
  setActiveTab,
  stats = {},
  isRunning = false,
  onStart,
  onStop,
  onClear,
  onShowSplash,
  useLiveSocket = true
}) {
  const totalLoaded = stats?.totalLoaded || 0;
  const proxyCount = stats?.proxyCount || 0;
  const validHits = stats?.validHits || 0;
  const canadianHits = stats?.canadianHits || 0;
  const targetHitsCount = stats?.targetHitsCount || 0;
  const checked = stats?.checked || 0;
  const cpm = stats?.cpm || 0;
  const cps = stats?.cps || '0.0';

  const engineNav = [
    {
      id: 'checker',
      icon: Terminal,
      color: '#00ff9d',
      title: 'Checker Studio',
      subtitle: 'Bulk IMAP & Combo Engine',
      badge: totalLoaded > 0 ? `${totalLoaded}` : null,
      badgeColor: '#00ff9d'
    },
    {
      id: 'proxies',
      icon: Shield,
      color: '#b026ff',
      title: 'Proxy Rotation',
      subtitle: 'SOCKS4/5 & HTTP Gateway',
      badge: proxyCount > 0 ? `${proxyCount}` : null,
      badgeColor: '#b026ff'
    },
    {
      id: 'mail-viewer',
      icon: Mail,
      color: '#00e5ff',
      title: 'Live Mail Viewer',
      subtitle: 'Interactive IMAP Client',
      badge: validHits > 0 ? `${validHits} Hits` : null,
      badgeColor: '#00e5ff'
    }
  ];

  const intelNav = [
    {
      id: 'keyword-targets',
      icon: Key,
      color: '#ff0055',
      title: 'Target Keywords',
      subtitle: 'Brand & Service Scanner',
      badge: targetHitsCount > 0 ? `${targetHitsCount}` : null,
      badgeColor: '#ff0055'
    },
    {
      id: 'canadian-domains',
      icon: Database,
      color: '#ffb700',
      title: 'Domains & IMAP Intel',
      subtitle: 'USA + CA ISP Database',
      badge: 'INTEL',
      badgeColor: '#ffb700'
    }
  ];

  const progressPercent = totalLoaded > 0 
    ? Math.min(100, Math.round((checked / totalLoaded) * 100))
    : 0;

  return (
    <aside style={{
      width: '270px',
      minWidth: '270px',
      maxWidth: '270px',
      height: '100vh',
      background: 'rgba(8, 10, 16, 0.96)',
      backdropFilter: 'blur(25px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 12px',
      zIndex: 100,
      position: 'relative',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      boxSizing: 'border-box',
      gap: '12px'
    }}>
      {/* ── Brand Header ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        <div
          onClick={onShowSplash}
          title="Click to open intro splash"
          style={{
            position: 'relative',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            padding: '2px',
            background: 'linear-gradient(135deg, #00e5ff, #b026ff)',
            boxShadow: '0 0 16px rgba(0, 229, 255, 0.35)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <img
            src="/phantom-ghost.png"
            alt="Phantom Ghost"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isRunning ? '#00ff9d' : '#b026ff',
            boxShadow: `0 0 8px ${isRunning ? '#00ff9d' : '#b026ff'}`
          }} />
        </div>

        <div style={{ overflow: 'hidden' }}>
          <h1 style={{
            fontSize: '0.96rem',
            fontWeight: 900,
            letterSpacing: '-0.3px',
            margin: 0,
            whiteSpace: 'nowrap',
            background: 'linear-gradient(to right, #ffffff, #c4b5fd, #00e5ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            PHANTOM <span style={{ color: '#00e5ff', WebkitTextFillColor: '#00e5ff' }}>CHECKER</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span className="badge-ca" style={{ fontSize: '0.56rem', padding: '1px 5px' }}>
              🇨🇦 / 🇺🇸
            </span>
            <span style={{
              fontSize: '0.62rem',
              color: isRunning ? '#00ff9d' : '#8b9bb4',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700
            }}>
              {isRunning ? '● ACTIVE RUN' : 'v3.8 PRO READY'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Section A: Core Engine Navigation ─────────────────────────────── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          fontSize: '0.6rem',
          fontWeight: 800,
          color: '#64748b',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.8px',
          padding: '2px 8px',
          textTransform: 'uppercase'
        }}>
          Core Engine
        </div>

        {engineNav.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-tab-btn ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 10px',
                borderRadius: '10px',
                background: isActive ? 'linear-gradient(90deg, rgba(0,255,157,0.12), rgba(0,0,0,0.4))' : 'rgba(255,255,255,0.02)',
                border: isActive ? `1px solid ${tab.color}50` : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '15%',
                  bottom: '15%',
                  width: '3px',
                  borderRadius: '0 4px 4px 0',
                  background: tab.color,
                  boxShadow: `0 0 10px ${tab.color}`
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${tab.color}18`,
                  border: `1px solid ${tab.color}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} color={tab.color} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                    {tab.title}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {tab.subtitle}
                  </span>
                </div>
              </div>

              {tab.badge && (
                <span style={{
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  background: `${tab.badgeColor}20`,
                  color: tab.badgeColor,
                  border: `1px solid ${tab.badgeColor}40`,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Section B: Intel & Recon Navigation ──────────────────────────── */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{
          fontSize: '0.6rem',
          fontWeight: 800,
          color: '#64748b',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.8px',
          padding: '2px 8px',
          textTransform: 'uppercase'
        }}>
          Intel & Target Recon
        </div>

        {intelNav.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sidebar-tab-btn ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 10px',
                borderRadius: '10px',
                background: isActive ? 'linear-gradient(90deg, rgba(255,0,85,0.12), rgba(0,0,0,0.4))' : 'rgba(255,255,255,0.02)',
                border: isActive ? `1px solid ${tab.color}50` : '1px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '15%',
                  bottom: '15%',
                  width: '3px',
                  borderRadius: '0 4px 4px 0',
                  background: tab.color,
                  boxShadow: `0 0 10px ${tab.color}`
                }} />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${tab.color}18`,
                  border: `1px solid ${tab.color}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} color={tab.color} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap' }}>
                    {tab.title}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {tab.subtitle}
                  </span>
                </div>
              </div>

              {tab.badge && (
                <span style={{
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  background: `${tab.badgeColor}20`,
                  color: tab.badgeColor,
                  border: `1px solid ${tab.badgeColor}40`,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Section C: Socket & Network Health Monitor ────────────────────── */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '12px',
        padding: '9px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '0.68rem',
        fontFamily: "'JetBrains Mono', monospace"
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#8b9bb4', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Wifi size={12} color="#00ff9d" /> IPC BRIDGE
          </span>
          <span style={{
            color: useLiveSocket ? '#00ff9d' : '#8b9bb4',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: useLiveSocket ? '#00ff9d' : '#8b9bb4',
              boxShadow: useLiveSocket ? '0 0 6px #00ff9d' : 'none'
            }} />
            {useLiveSocket ? 'ONLINE' : 'STANDBY'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>PROTOCOL:</span>
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>RAW TCP / TLS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>LATENCY:</span>
          <span style={{ color: '#00e5ff', fontWeight: 700 }}>&lt; 1ms LOCAL</span>
        </div>
      </div>

      {/* ── Section D: Engine Command Deck & Telemetry ────────────────────── */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Main Action Buttons */}
        {!isRunning ? (
          <button
            onClick={onStart}
            disabled={stats.totalLoaded === 0}
            className="glass-btn glass-btn-green"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              opacity: stats.totalLoaded === 0 ? 0.45 : 1,
              cursor: stats.totalLoaded === 0 ? 'not-allowed' : 'pointer',
              boxShadow: stats.totalLoaded > 0 ? '0 0 16px rgba(0, 255, 157, 0.25)' : 'none'
            }}
          >
            <Play size={14} fill="currentColor" />
            START CHECKER
          </button>
        ) : (
          <button
            onClick={onStop}
            className="glass-btn glass-btn-danger"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px 14px',
              fontSize: '0.8rem',
              fontWeight: 800,
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)'
            }}
          >
            <Square size={14} fill="currentColor" />
            STOP ENGINE
          </button>
        )}

        <button
          onClick={onClear}
          className="glass-btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '6px 10px',
            fontSize: '0.7rem',
            color: '#8b9bb4'
          }}
        >
          <RefreshCw size={11} />
          Reset Data & Logs
        </button>

        {/* Live Telemetry Panel */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '9px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.7rem',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          {/* Progress Bar */}
          {stats.totalLoaded > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#8b9bb4', marginBottom: '3px' }}>
                <span>PROGRESS</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ff9d, #00e5ff)',
                  boxShadow: '0 0 8px #00ff9d',
                  transition: 'width 0.2s ease'
                }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b9bb4', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={12} color="#00ff9d" /> SPEED:
            </span>
            <span style={{ color: '#00ff9d', fontWeight: 800, whiteSpace: 'nowrap' }}>{cpm} CPM</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b9bb4', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Cpu size={12} color="#b026ff" /> RATE:
            </span>
            <span style={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{cps} req/s</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b9bb4', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={12} color="#00e5ff" /> LOADED:
            </span>
            <span style={{ color: '#00e5ff', fontWeight: 700, whiteSpace: 'nowrap' }}>{totalLoaded}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#8b9bb4' }}>HITS:</span>
            <span style={{ color: '#00ff9d', fontWeight: 800, whiteSpace: 'nowrap', fontSize: '0.68rem' }}>
              {validHits} {canadianHits > 0 ? `(${canadianHits} 🇨🇦)` : ''}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

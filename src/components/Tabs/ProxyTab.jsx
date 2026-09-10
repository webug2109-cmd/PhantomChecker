import { useState, useRef, useMemo } from 'react';
import { 
  Shield, Upload, FileText, CheckCircle2, XCircle, RefreshCw, 
  Download, Zap, Filter, Cpu, Play, Check, Trash2, Globe
} from 'lucide-react';

export function ProxyTab({ 
  proxies = [], 
  setProxies, 
  proxyMode = 'none', 
  setProxyMode, 
  onLoadSampleProxies, 
  onClearProxies 
}) {
  const fileInputRef = useRef(null);
  const [pasteText, setPasteText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  // Parse raw text lines into structured Proxy objects
  const parseProxyText = (text, defaultProtocol = 'socks5') => {
    const lines = text.split(/\r?\n/);
    const parsed = [];

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;

      let protocol = defaultProtocol;
      let host = '', port = '', user = '', pass = '';

      // Check protocol prefix e.g. socks5://
      const protoMatch = line.match(/^(socks5|socks4|https|http):\/\//i);
      if (protoMatch) {
        protocol = protoMatch[1].toLowerCase();
        line = line.substring(protoMatch[0].length);
      }

      // Format: user:pass@host:port
      if (line.includes('@')) {
        const [auth, target] = line.split('@');
        const [u, p] = auth.split(':');
        const [h, pt] = target.split(':');
        user = u || '';
        pass = p || '';
        host = h || '';
        port = pt || '';
      } else {
        const parts = line.split(':');
        if (parts.length === 2) {
          // host:port
          host = parts[0];
          port = parts[1];
        } else if (parts.length === 4) {
          // host:port:user:pass
          host = parts[0];
          port = parts[1];
          user = parts[2];
          pass = parts[3];
        }
      }

      if (host && port && !isNaN(Number(port))) {
        parsed.push({
          id: `px-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          raw: line,
          protocol: protocol || 'socks5',
          host: host.trim(),
          port: Number(port.trim()),
          user: user.trim(),
          pass: pass.trim(),
          status: 'untested', // untested | working | bad | testing
          latencyMs: null,
          error: null
        });
      }
    }

    return parsed;
  };

  const handleFileUpload = (files) => {
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (text) {
          const newProxies = parseProxyText(text);
          setProxies(prev => [...prev, ...newProxies]);
        }
      };
      reader.readAsText(files[i]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const newProxies = parseProxyText(pasteText);
    setProxies(prev => [...prev, ...newProxies]);
    setPasteText('');
    setShowPasteModal(false);
  };

  const handleTestAllProxies = async () => {
    if (proxies.length === 0 || isTesting) return;
    setIsTesting(true);
    setTestProgress(0);

    const CONCURRENCY = 15;
    let completed = 0;
    const total = proxies.length;

    const proxyQueue = [...proxies];

    const worker = async () => {
      while (proxyQueue.length > 0) {
        const px = proxyQueue.shift();
        if (!px) break;

        setProxies(curr => curr.map(p => p.id === px.id ? { ...p, status: 'testing' } : p));

        try {
          const res = await fetch('/api/test-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proxy: px, timeout: 5000 })
          });
          const data = await res.json();

          setProxies(curr => curr.map(p => {
            if (p.id === px.id) {
              return {
                ...p,
                status: data.success ? 'working' : 'bad',
                latencyMs: data.latencyMs || null,
                error: data.error || null
              };
            }
            return p;
          }));
        } catch (err) {
          setProxies(curr => curr.map(p => p.id === px.id ? { ...p, status: 'bad', error: err.message } : p));
        }

        completed++;
        setTestProgress(Math.round((completed / total) * 100));
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
    await Promise.all(workers);
    setIsTesting(false);
  };

  const stats = useMemo(() => {
    const total = proxies.length;
    const working = proxies.filter(p => p.status === 'working').length;
    const bad = proxies.filter(p => p.status === 'bad').length;
    const socks5 = proxies.filter(p => p.protocol.includes('socks5')).length;
    const socks4 = proxies.filter(p => p.protocol.includes('socks4')).length;
    const http = proxies.filter(p => p.protocol.includes('http')).length;

    return { total, working, bad, socks5, socks4, http };
  }, [proxies]);

  const filteredProxies = useMemo(() => {
    return proxies.filter(p => {
      if (protocolFilter === 'working' && p.status !== 'working') return false;
      if (protocolFilter === 'socks5' && !p.protocol.includes('socks5')) return false;
      if (protocolFilter === 'socks4' && !p.protocol.includes('socks4')) return false;
      if (protocolFilter === 'http' && !p.protocol.includes('http')) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return p.host.toLowerCase().includes(q) || String(p.port).includes(q) || p.protocol.toLowerCase().includes(q);
      }
      return true;
    });
  }, [proxies, protocolFilter, searchTerm]);

  const handleExportProxies = (onlyWorking = false) => {
    const list = onlyWorking ? proxies.filter(p => p.status === 'working') : proxies;
    if (list.length === 0) return;

    const formatted = list.map(p => {
      const auth = p.user ? `${p.user}:${p.pass}@` : '';
      return `${p.protocol}://${auth}${p.host}:${p.port}`;
    }).join('\n');

    const blob = new Blob([formatted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = onlyWorking ? 'working_proxies.txt' : 'all_proxies.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Control Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* Load Proxies Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} color="#00ff9d" /> LOAD PROXIES
            </h3>
            <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(0,255,157,0.1)', color: '#00ff9d', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(0,255,157,0.3)' }}>
              HTTP / SOCKS4 / SOCKS5
            </span>
          </div>

          <div style={{
            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '14px',
            padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.3)'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#8b9bb4', marginBottom: '12px' }}>
              Formats: host:port, host:port:user:pass, socks5://...
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button onClick={() => fileInputRef.current?.click()} className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem', padding: '8px 12px' }}>
                <FileText size={14} /> File / Folder
              </button>
              <button onClick={() => setShowPasteModal(true)} className="glass-btn glass-btn-purple" style={{ fontSize: '0.75rem', padding: '8px 12px' }}>
                <Zap size={14} /> Paste Text
              </button>
            </div>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept=".txt,.csv,.log"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button onClick={onLoadSampleProxies}
              style={{ fontSize: '0.72rem', color: '#00e5ff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={12} /> Load Free Test Proxies
            </button>
          </div>
        </div>

        {/* Proxy Mode Configuration */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="#b026ff" /> PROXY ROTATION MODE
            </h3>
            <span style={{ fontSize: '0.65rem', color: proxyMode !== 'none' ? '#00ff9d' : '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
              {proxyMode.toUpperCase()}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'none', name: 'Direct Connection (No Proxy)', desc: 'Connects directly to IMAP servers from local IP' },
              { id: 'rotating', name: 'Round-Robin Rotating', desc: 'Cycles through proxy list sequentially for every check' },
              { id: 'random', name: 'Random Selection', desc: 'Picks a random proxy from list for every check' }
            ].map(m => (
              <label key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: '10px',
                background: proxyMode === m.id ? 'rgba(176,38,255,0.15)' : 'rgba(0,0,0,0.3)',
                border: proxyMode === m.id ? '1px solid rgba(176,38,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: proxyMode === m.id ? '#00ff9d' : '#fff' }}>{m.name}</div>
                  <div style={{ fontSize: '0.65rem', color: '#8b9bb4' }}>{m.desc}</div>
                </div>
                <input 
                  type="radio" 
                  name="proxyMode" 
                  checked={proxyMode === m.id} 
                  onChange={() => setProxyMode(m.id)}
                  style={{ accentColor: '#b026ff', cursor: 'pointer' }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Live Proxy Metrics & Health Tester */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} color="#00e5ff" /> PROXY HEALTH TESTER
            </h3>
            <button 
              onClick={handleTestAllProxies} 
              disabled={proxies.length === 0 || isTesting}
              className="glass-btn glass-btn-green"
              style={{ fontSize: '0.72rem', padding: '4px 10px', opacity: proxies.length === 0 || isTesting ? 0.5 : 1 }}
            >
              <Play size={12} fill="currentColor" /> {isTesting ? `Testing (${testProgress}%)` : 'Test Proxies'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.6rem', color: '#8b9bb4' }}>TOTAL</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{stats.total}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,255,157,0.2)' }}>
              <div style={{ fontSize: '0.6rem', color: '#8b9bb4' }}>WORKING</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00ff9d', fontFamily: "'JetBrains Mono', monospace" }}>{stats.working}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>
              <div style={{ fontSize: '0.6rem', color: '#8b9bb4' }}>BAD / DEAD</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>{stats.bad}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleExportProxies(true)} className="glass-btn glass-btn-green" style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem' }}>
              <Download size={12} /> Export Alive
            </button>
            <button onClick={() => handleExportProxies(false)} className="glass-btn" style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', color: '#8b9bb4' }}>
              <Download size={12} /> Export All
            </button>
            <button onClick={onClearProxies} className="glass-btn glass-btn-danger" style={{ fontSize: '0.72rem', padding: '6px 10px' }} title="Clear Proxy List">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Proxies Data Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="Filter by IP, port, protocol..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="glass-input" 
              style={{ fontSize: '0.75rem', width: '240px' }} 
            />
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'working', label: 'Working' },
                { id: 'socks5', label: 'SOCKS5' },
                { id: 'socks4', label: 'SOCKS4' },
                { id: 'http', label: 'HTTP/S' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setProtocolFilter(tab.id)}
                  style={{
                    background: protocolFilter === tab.id ? '#b026ff' : 'none',
                    color: protocolFilter === tab.id ? '#fff' : '#8b9bb4',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontWeight: protocolFilter === tab.id ? 700 : 400
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
            Showing <span style={{ color: '#fff', fontWeight: 700 }}>{filteredProxies.length}</span> of {proxies.length} Proxies
          </div>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead style={{ background: '#0b0e17', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                {['Status', 'Protocol', 'IP / Host', 'Port', 'Auth Credentials', 'Latency / Error'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProxies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#8b9bb4' }}>
                    <Globe size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No proxies match filter. Load proxy list or change rotation settings.
                  </td>
                </tr>
              ) : (
                filteredProxies.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    
                    {/* Status */}
                    <td style={{ padding: '8px 12px' }}>
                      {p.status === 'working' && <span style={{ background: 'rgba(0,255,157,0.1)', color: '#00ff9d', border: '1px solid rgba(0,255,157,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> ALIVE</span>}
                      {p.status === 'bad' && <span style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> DEAD</span>}
                      {p.status === 'testing' && <span style={{ background: 'rgba(176,38,255,0.2)', color: '#b026ff', border: '1px solid rgba(176,38,255,0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', animation: 'pulse 1.5s infinite' }}>TESTING...</span>}
                      {p.status === 'untested' && <span style={{ color: '#8b9bb4', fontSize: '0.65rem' }}>UNTESTED</span>}
                    </td>

                    {/* Protocol */}
                    <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', color: p.protocol.includes('socks') ? '#00e5ff' : '#b026ff', fontWeight: 700 }}>
                      {p.protocol}
                    </td>

                    {/* Host */}
                    <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.host}
                    </td>

                    {/* Port */}
                    <td style={{ padding: '8px 12px', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.port}
                    </td>

                    {/* Auth */}
                    <td style={{ padding: '8px 12px', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.user ? `${p.user}:••••••` : <span style={{ color: 'rgba(255,255,255,0.2)' }}>None</span>}
                    </td>

                    {/* Latency / Error */}
                    <td style={{ padding: '8px 12px', fontSize: '0.7rem' }}>
                      {p.latencyMs ? (
                        <span style={{ color: p.latencyMs < 1000 ? '#00ff9d' : '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
                          {p.latencyMs}ms
                        </span>
                      ) : p.error ? (
                        <span style={{ color: '#f87171' }}>{p.error}</span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Modal */}
      {showPasteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass-panel" style={{ width: '500px', padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>
              Paste Proxies List
            </h3>
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`127.0.0.1:8080\nuser:pass@192.168.1.1:1080\nsocks5://1.2.3.4:1080\n1.2.3.4:1080:user:pass`}
              className="glass-input"
              style={{ width: '100%', marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowPasteModal(false)} className="glass-btn" style={{ fontSize: '0.75rem' }}>
                Cancel
              </button>
              <button onClick={handlePasteSubmit} className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem' }}>
                Add Proxies
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

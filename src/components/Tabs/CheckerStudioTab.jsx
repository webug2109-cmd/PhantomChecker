import { useRef, useState, useCallback, useMemo } from 'react';
import { 
  Upload, FolderPlus, FileText, CheckCircle2, ShieldAlert, Flag, Filter, 
  Download, Zap, RefreshCw, Globe, ExternalLink, Copy, Check, Clock, Shield
} from 'lucide-react';
import { getWebmailUrl, getProviderName } from '../../data/canadianDomains.js';

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 14;
const OVERSCAN = 4;
const TABLE_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

export function CheckerStudioTab({
  combos, stats, onFileUpload, onFolderUpload, onLoadSampleCombos,
  onExportHits, filterOnlyCanadian, setFilterOnlyCanadian,
  threads, setThreads, timeoutSec, setTimeoutSec, onInspectMail,
  useLiveSocket, setUseLiveSocket, proxyMode, proxyCount, setActiveTab,
  parsingStatus
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportFormat, setExportFormat] = useState('txt');
  const [copiedId, setCopiedId] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onFileUpload(e.dataTransfer.files);
  };

  const handleCopyCombo = (item) => {
    const text = item.raw || `${item.email}:${item.password}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Optimized for 100k - 1M+ lists: avoid O(N) array allocation if no search/filters active
  const displayedCombos = useMemo(() => {
    if (!filterOnlyCanadian && statusFilter === 'all' && !searchTerm) {
      return combos;
    }
    const q = searchTerm ? searchTerm.toLowerCase().trim() : '';
    return combos.filter(item => {
      if (filterOnlyCanadian && !item.isCanadian) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (q) {
        return item.email.toLowerCase().includes(q) || item.domain.toLowerCase().includes(q);
      }
      return true;
    });
  }, [combos, filterOnlyCanadian, statusFilter, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Streaming Progress Bar for Large Files */}
      {parsingStatus && (
        <div className="glass-panel" style={{
          padding: '14px 20px', borderLeft: '4px solid #00e5ff',
          background: 'linear-gradient(90deg, rgba(0,229,255,0.12), rgba(176,38,255,0.06))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ animation: 'spin 1.5s linear infinite' }}>
              <RefreshCw size={18} color="#00e5ff" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                Streaming & Indexing Large File: <span style={{ color: '#00e5ff' }}>{parsingStatus.fileName}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#8b9bb4' }}>
                {parsingStatus.loadedCount?.toLocaleString()} combos parsed ({parsingStatus.percent}% of file) • Smooth non-blocking stream
              </div>
            </div>
          </div>
          <div style={{ width: '180px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${parsingStatus.percent}%`, height: '100%', background: 'linear-gradient(90deg, #00e5ff, #00ff9d)', transition: 'width 0.2s' }} />
          </div>
        </div>
      )}
      {/* Top Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        
        {/* File Upload Panel */}
        <div className="glass-panel" style={{ padding: '24px' }} onDragOver={handleDragOver} onDrop={handleDrop}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} color="#00ff9d" /> LOAD COMBOS FILE / FOLDER
            </h3>
            <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(0,255,157,0.1)', color: '#00ff9d', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(0,255,157,0.3)' }}>
              TXT / CSV
            </span>
          </div>

          <div style={{
            border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '14px',
            padding: '24px', textAlign: 'center', background: 'rgba(0,0,0,0.3)'
          }}>
            <p style={{ fontSize: '0.75rem', color: '#8b9bb4', marginBottom: '12px' }}>
              Drag & Drop combo files here or select below
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => fileInputRef.current?.click()} className="glass-btn glass-btn-purple" style={{ fontSize: '0.75rem', padding: '8px 12px' }}>
                <FileText size={16} /> Select File
              </button>
              <button onClick={() => folderInputRef.current?.click()} className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem', padding: '8px 12px' }}>
                <FolderPlus size={16} /> Load Folder
              </button>
            </div>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept=".txt,.csv,.combo"
              onChange={(e) => e.target.files && onFileUpload(e.target.files)} />
            <input type="file" ref={folderInputRef} style={{ display: 'none' }} webkitdirectory="" directory="" multiple
              onChange={(e) => e.target.files && onFolderUpload(e.target.files)} />
          </div>

          <div style={{ marginTop: '14px' }}>
            <button onClick={onLoadSampleCombos}
              style={{ fontSize: '0.75rem', color: '#00e5ff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={12} /> Load Verified Canadian Hits & ISP List
            </button>
          </div>
        </div>

        {/* High CPM Engine & Proxy Configuration Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#b026ff" /> ENGINE PERFORMANCE (CPM)
            </h3>
            <span className="badge-ca">HIGH SPEED</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Live IMAP Socket Mode Toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: '12px',
              background: useLiveSocket ? 'rgba(0,255,157,0.1)' : 'rgba(0,0,0,0.4)',
              border: useLiveSocket ? '1px solid rgba(0,255,157,0.4)' : '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={16} color={useLiveSocket ? '#00ff9d' : '#8b9bb4'} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: useLiveSocket ? '#00ff9d' : '#fff' }}>
                    Live IMAP Socket (Port 993 TLS)
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#8b9bb4' }}>
                    Direct socket connections to imap.bell.net, videotron, cogeco
                  </div>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={useLiveSocket} 
                onChange={(e) => setUseLiveSocket(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#00ff9d', cursor: 'pointer' }} 
              />
            </label>

            {/* Proxy Quick Access Pill */}
            <div 
              onClick={() => setActiveTab && setActiveTab('proxies')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)',
                border: proxyMode !== 'none' ? '1px solid rgba(176,38,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={16} color={proxyMode !== 'none' ? '#b026ff' : '#8b9bb4'} />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: proxyMode !== 'none' ? '#b026ff' : '#fff' }}>
                    Multi-Protocol Proxies ({proxyCount})
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#8b9bb4' }}>
                    Mode: {proxyMode.toUpperCase()} (HTTP, HTTPS, SOCKS4, SOCKS5)
                  </div>
                </div>
              </div>
              <button className="glass-btn glass-btn-purple" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Manage</button>
            </div>

            {/* Concurrency Threads (1 - 200) */}
            <div style={{ padding: '8px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: '#8b9bb4' }}>Concurrency Workers</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00ff9d', fontWeight: 800 }}>{threads} Threads</span>
              </div>
              <input type="range" min="1" max="200" value={threads} onChange={(e) => setThreads(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#b026ff', cursor: 'pointer' }} />
            </div>

            {/* Connection Timeout Setting */}
            <div style={{ padding: '8px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span style={{ color: '#8b9bb4', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Connection Timeout</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00e5ff', fontWeight: 700 }}>{timeoutSec}s</span>
              </div>
              <input type="range" min="3" max="15" value={timeoutSec} onChange={(e) => setTimeoutSec(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#00e5ff', cursor: 'pointer' }} />
            </div>
          </div>
        </div>

        {/* Metrics & Exporter Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#00ff9d" /> LIVE METRICS COUNTER
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { label: 'CHECKS PER MIN (CPM)', val: stats.cpm, color: '#00ff9d', borderColor: 'rgba(0,255,157,0.4)', badge: 'SPEED' },
              { label: 'VALID HITS', val: stats.validHits, color: '#00ff9d', borderColor: 'rgba(0,255,157,0.3)' },
              { label: 'CAPTURED HITS', val: stats.capturedHits ?? 0, color: '#00e5ff', borderColor: 'rgba(0,229,255,0.4)', badge: 'FULL' },
              { label: 'CANADIAN HITS', val: stats.canadianHits, color: '#b026ff', borderColor: 'rgba(176,38,255,0.4)' },
              { label: 'INVALID / BAD', val: stats.invalid, color: '#f87171', borderColor: 'rgba(255,255,255,0.1)' }
            ].map((m, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${m.borderColor}`, padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'flex', justifyContent: 'space-between' }}>
                  <span>{m.label}</span>
                  {m.badge && <span style={{ color: '#00ff9d', fontWeight: 800 }}>{m.badge}</span>}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value)}
                className="glass-input" 
                style={{ fontSize: '0.72rem', background: '#090b10', flex: 1 }}
              >
                <option value="txt">Format: email:pass</option>
                <option value="txt_full">Format: email:pass:host:port</option>
                <option value="captures">Format: Captures Only</option>
                <option value="csv">Format: CSV</option>
                <option value="json">Format: JSON</option>
              </select>
              <button onClick={() => onExportHits(exportFormat)} className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                <Download size={14} /> Export Hits
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="text" placeholder="Search email, domain..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="glass-input" style={{ fontSize: '0.75rem', width: '260px' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-input" style={{ fontSize: '0.75rem', width: '140px', background: '#090b10' }}>
              <option value="all">All Status</option>
              <option value="valid">Valid Hits</option>
              <option value="invalid">Invalid</option>
              <option value="2fa">2FA / Security</option>
            </select>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
            Showing <span style={{ color: '#fff', fontWeight: 700 }}>{displayedCombos.length}</span> of {combos.length} Combos
          </div>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: `${TABLE_HEIGHT}px`, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead style={{ background: '#0b0e17', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                {['Status', 'Email Address', 'Password', 'Live Provider & IMAP', 'Targets Detected', 'Captures', 'Live Actions'].map(h => (
                  <th key={h} style={{ padding: '12px', textAlign: h === 'Live Actions' ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedCombos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#8b9bb4' }}>
                    <FileText size={32} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 8px', display: 'block' }} />
                    No combos loaded. Drag & drop a file or click "Load Verified Canadian Hits".
                  </td>
                </tr>
              ) : (() => {
                const totalItems = displayedCombos.length;
                const totalHeight = totalItems * ROW_HEIGHT;
                const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
                const endIdx = Math.min(totalItems, Math.ceil((scrollTop + TABLE_HEIGHT) / ROW_HEIGHT) + OVERSCAN);
                const topPad = startIdx * ROW_HEIGHT;
                const bottomPad = Math.max(0, totalHeight - endIdx * ROW_HEIGHT);

                const rows = [];
                if (topPad > 0) {
                  rows.push(<tr key="__top_spacer__"><td colSpan={7} style={{ height: `${topPad}px`, padding: 0, border: 'none' }} /></tr>);
                }
                for (let i = startIdx; i < endIdx; i++) {
                  const item = displayedCombos[i];
                  const webmail = getWebmailUrl(item.email);
                  const provider = getProviderName(item.email);

                  rows.push(
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', height: `${ROW_HEIGHT}px` }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      
                      {/* Status */}
                      <td style={{ padding: '10px 12px' }}>
                        {item.status === 'valid' && <span className="badge-valid" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> VALID</span>}
                        {item.status === 'invalid' && <span style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem' }}>INVALID</span>}
                        {item.status === '2fa' && <span style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ShieldAlert size={12} /> 2FA</span>}
                        {item.status === 'checking' && <span style={{ background: 'rgba(176,38,255,0.2)', color: '#b026ff', border: '1px solid rgba(176,38,255,0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', animation: 'pulse 1.5s infinite' }}>CHECKING...</span>}
                        {item.status === 'idle' && <span style={{ color: '#8b9bb4', fontSize: '0.65rem' }}>QUEUED</span>}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.email}
                          {item.isCanadian && <span className="badge-ca" style={{ fontSize: '0.6rem', padding: '1px 4px' }}>CA</span>}
                        </span>
                      </td>

                      {/* Password / Copy */}
                      <td style={{ padding: '10px 12px', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                        <button
                          onClick={() => handleCopyCombo(item)}
                          style={{
                            background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem'
                          }}
                          title="Click to copy combo"
                        >
                          •••••••• {copiedId === item.id ? <Check size={12} color="#00ff9d" /> : <Copy size={11} />}
                        </button>
                      </td>

                      {/* Provider & IMAP config */}
                      <td style={{ padding: '10px 12px', fontSize: '0.7rem' }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{provider}</div>
                        <div style={{ color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace" }}>
                          {item.imapHost ? `${item.imapHost}:${item.imapPort}` : '—'}
                        </div>
                      </td>

                      {/* Target Keywords */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {item.matchedKeywords?.length > 0 ? item.matchedKeywords.map((kw, ki) => (
                            <span key={ki} style={{ background: 'rgba(176,38,255,0.2)', border: '1px solid rgba(176,38,255,0.4)', color: '#b026ff', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>{kw}</span>
                          )) : <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>}
                        </div>
                      </td>

                      {/* Full Captures: membership tiers + payment methods */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(item.captures?.services || []).map((s, si) => (
                            <span key={`svc-${si}`} style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                              {s.tier ? `${s.label} ${s.tier}` : s.label}
                            </span>
                          ))}
                          {(item.captures?.payments || []).map((p, pi) => (
                            <span key={`pay-${pi}`} style={{ background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.35)', color: '#00ff9d', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace" }}>
                              {p.label}
                            </span>
                          ))}
                          {(!item.captures || ((item.captures.services || []).length === 0 && (item.captures.payments || []).length === 0)) && (
                            <span style={{ color: 'rgba(255,255,255,0.15)' }}>-</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          {webmail && (
                            <a
                              href={webmail}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="glass-btn glass-btn-green"
                              style={{ fontSize: '0.68rem', padding: '4px 8px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title={`Open live webmail for ${item.email}`}
                            >
                              <Globe size={11} /> Live Webmail <ExternalLink size={10} />
                            </a>
                          )}

                          <button
                            onClick={() => onInspectMail(item.email)}
                            className="glass-btn glass-btn-purple"
                            style={{ fontSize: '0.68rem', padding: '4px 8px', fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            Inspect Mail
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                if (bottomPad > 0) {
                  rows.push(<tr key="__bottom_spacer__"><td colSpan={7} style={{ height: `${bottomPad}px`, padding: 0, border: 'none' }} /></tr>);
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

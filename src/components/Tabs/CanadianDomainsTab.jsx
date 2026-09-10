import { useState, useMemo } from 'react';
import { DOMAINS_DATABASE } from '../../data/canadianDomains.js';
import { Database, Search, ShieldCheck, Globe, ExternalLink, Flag } from 'lucide-react';

export function CanadianDomainsTab() {
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL'); // 'ALL' | 'USA' | 'CANADA' | 'GLOBAL'

  const usaCount = useMemo(() => DOMAINS_DATABASE.filter(d => d.country === 'USA').length, []);
  const caCount = useMemo(() => DOMAINS_DATABASE.filter(d => d.country === 'CANADA').length, []);
  const globalCount = useMemo(() => DOMAINS_DATABASE.filter(d => d.country === 'GLOBAL').length, []);

  const filtered = useMemo(() => {
    return DOMAINS_DATABASE.filter(item => {
      if (countryFilter !== 'ALL' && item.country !== countryFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        item.domain.toLowerCase().includes(q) ||
        item.provider.toLowerCase().includes(q) ||
        item.imapHost.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q)) ||
        item.country.toLowerCase().includes(q)
      );
    });
  }, [query, countryFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '22px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        borderLeft: '4px solid #00ff9d',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={22} color="#00ff9d" /> MAIL DOMAINS & LIVE IMAP INTEL
            </h2>
            <span className="badge-ca" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              🇺🇸 USA + 🇨🇦 CANADA + 🌐 GLOBAL
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#8b9bb4', maxWidth: '650px', lineHeight: 1.5 }}>
            Comprehensive directory of USA major telecommunication ISPs, Canadian regional providers, and global mail portals with pre-configured SSL/TLS IMAP server resolution (Port 993).
          </p>
        </div>

        {/* Counter Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(0,0,0,0.45)', padding: '10px 16px', borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.25)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>🇺🇸 USA DOMAINS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>{usaCount}</div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.45)', padding: '10px 16px', borderRadius: '12px',
            border: '1px solid rgba(255, 0, 85, 0.25)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>🇨🇦 CA DOMAINS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ff0055' }}>{caCount}</div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.45)', padding: '10px 16px', borderRadius: '12px',
            border: '1px solid rgba(0, 255, 157, 0.25)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>TOTAL INDEXED</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00ff9d' }}>{DOMAINS_DATABASE.length}</div>
          </div>
        </div>
      </div>

      {/* Explorer Controls & Filters */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', width: '340px' }}>
            <input 
              type="text" 
              placeholder="Search domain (comcast, att, sympatico), ISP, or IMAP host..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)} 
              className="glass-input" 
              style={{ fontSize: '0.78rem', paddingLeft: '34px', width: '100%' }} 
            />
            <Search size={15} color="#8b9bb4" style={{ position: 'absolute', left: '11px', top: '12px' }} />
            {query && (
              <button 
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: '10px', top: '8px', background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Region Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: `All (${DOMAINS_DATABASE.length})`, icon: Globe, color: '#ffffff' },
              { id: 'USA', label: `🇺🇸 USA Domains (${usaCount})`, icon: Flag, color: '#38bdf8' },
              { id: 'CANADA', label: `🇨🇦 Canadian Domains (${caCount})`, icon: Flag, color: '#ff0055' },
              { id: 'GLOBAL', label: `🌐 Global & Tech (${globalCount})`, icon: Globe, color: '#00ff9d' }
            ].map(tab => {
              const isActive = countryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCountryFilter(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: "'JetBrains Mono', monospace",
                    background: isActive ? 'rgba(0, 255, 157, 0.16)' : 'rgba(0,0,0,0.3)',
                    border: isActive ? '1px solid #00ff9d' : '1px solid rgba(255,255,255,0.08)',
                    color: isActive ? '#00ff9d' : '#8b9bb4',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SSL indicator */}
          <span style={{ fontSize: '0.72rem', color: '#00ff9d', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={16} /> PORT 993 SSL/TLS AUTO-RESOLVED
          </span>
        </div>

        {/* Domains Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: '#8b9bb4' }}>
              <Database size={36} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
              No domains matched "{query}" in {countryFilter}.
            </div>
          ) : filtered.map((item, idx) => {
            const isUsa = item.country === 'USA';
            const isCa = item.country === 'CANADA';

            return (
              <div 
                key={idx} 
                style={{
                  padding: '16px 18px', 
                  borderRadius: '14px', 
                  background: 'rgba(0,0,0,0.38)',
                  border: '1px solid rgba(255,255,255,0.08)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  transition: 'all 0.15s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isUsa ? 'rgba(56, 189, 248, 0.5)' : isCa ? 'rgba(255, 0, 85, 0.5)' : 'rgba(0, 255, 157, 0.5)';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.55)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.background = 'rgba(0,0,0,0.38)';
                }}
              >
                <div>
                  {/* Top Domain & Flag Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe size={15} color={isUsa ? '#38bdf8' : isCa ? '#ff0055' : '#00ff9d'} /> 
                      {item.domain}
                    </span>
                    
                    <span style={{
                      fontSize: '0.62rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: isUsa ? 'rgba(56, 189, 248, 0.15)' : isCa ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 255, 157, 0.15)',
                      color: isUsa ? '#38bdf8' : isCa ? '#ff0055' : '#00ff9d',
                      border: `1px solid ${isUsa ? 'rgba(56, 189, 248, 0.3)' : isCa ? 'rgba(255, 0, 85, 0.3)' : 'rgba(0, 255, 157, 0.3)'}`
                    }}>
                      {isUsa ? '🇺🇸 USA' : isCa ? '🇨🇦 CANADA' : '🌐 GLOBAL'}
                    </span>
                  </div>

                  {/* Provider Name */}
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600, marginBottom: '12px' }}>
                    {item.provider}
                  </div>

                  {/* IMAP Config Box */}
                  <div style={{
                    background: '#070a12', padding: '10px 12px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.72rem',
                    fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: '5px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#8b9bb4' }}>IMAP Host:</span>
                      <span style={{ color: '#00ff9d', fontWeight: 700 }}>{item.imapHost}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#8b9bb4' }}>Port / Security:</span>
                      <span style={{ color: '#00e5ff' }}>{item.imapPort} (SSL/TLS)</span>
                    </div>
                  </div>
                </div>

                {/* Footer Notes & Webmail Link */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                    {item.notes ? `• ${item.notes}` : `• ${item.provider}`}
                  </span>

                  {item.webmailUrl && (
                    <a 
                      href={item.webmailUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="glass-btn"
                      style={{ fontSize: '0.65rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#38bdf8' }}
                      title={`Open webmail portal for ${item.domain}`}
                    >
                      Webmail <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

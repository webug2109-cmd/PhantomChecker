import { useState, useRef, useMemo } from 'react';
import { 
  Key, Plus, Trash2, Tag, Search, Zap, Upload, FileText, 
  RefreshCw, CheckCircle2, Mail, ShieldCheck, Database, Cpu 
} from 'lucide-react';
import { TASK_KEYWORD_PACKS, generateDomainKeywords } from '../../data/keywordPacks.js';

export function KeywordTargetTab({ keywords = [], onAddKeyword, onAddBatchKeywords, onRemoveKeyword, onClearKeywords }) {
  const fileInputRef = useRef(null);
  const [newWord, setNewWord] = useState('');
  const [category, setCategory] = useState('Banking');
  const [bulkCategory, setBulkCategory] = useState('Bulk Target');
  const [filterQuery, setFilterQuery] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Domain Generator State
  const [generatorDomain, setGeneratorDomain] = useState('');
  const [generatorCategory, setGeneratorCategory] = useState('E-Commerce');
  const [loadedPackId, setLoadedPackId] = useState(null);

  const previewGenerated = useMemo(() => {
    return generateDomainKeywords(generatorDomain, generatorCategory);
  }, [generatorDomain, generatorCategory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    onAddKeyword(newWord.trim(), category);
    setNewWord('');
  };

  const handleFileUpload = (files) => {
    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (text) {
          const lines = text.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
          if (onAddBatchKeywords) {
            onAddBatchKeywords(lines, bulkCategory);
          } else {
            lines.forEach(kw => onAddKeyword(kw, bulkCategory));
          }
        }
      };
      reader.readAsText(files[i]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (onAddBatchKeywords) {
      onAddBatchKeywords(lines, bulkCategory);
    } else {
      lines.forEach(kw => onAddKeyword(kw, bulkCategory));
    }
    setPasteText('');
    setShowPasteModal(false);
  };

  const handleLoadPack = (pack) => {
    if (onAddBatchKeywords) {
      onAddBatchKeywords(pack.keywords);
    } else {
      pack.keywords.forEach(item => onAddKeyword(item.kw, item.cat));
    }
    setLoadedPackId(pack.id);
    setTimeout(() => setLoadedPackId(null), 2000);
  };

  const handleApplyDomainGenerator = (e) => {
    e.preventDefault();
    if (previewGenerated.length === 0) return;
    if (onAddBatchKeywords) {
      onAddBatchKeywords(previewGenerated);
    } else {
      previewGenerated.forEach(item => onAddKeyword(item.kw, item.cat));
    }
    setGeneratorDomain('');
  };

  const filtered = keywords.filter(k =>
    (k.keyword || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (k.category || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', borderLeft: '4px solid #00e5ff', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Key size={20} color="#00e5ff" /> TARGET WEBSITE & ACCOUNT KEYWORD MANAGER
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#8b9bb4' }}>
            Target specific transactional senders (e.g. <code>noreply@domain</code>, <code>order@domain</code>, <code>help@domain</code>) to detect registered accounts, orders, and balances.
          </p>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#8b9bb4' }}>ACTIVE TARGETS</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#00e5ff' }}>{keywords.length}</div>
          </div>
          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />
          <div>
            <div style={{ color: '#8b9bb4' }}>MATCHED HITS</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#00ff9d' }}>{keywords.reduce((a, c) => a + (c.hitsCount || 0), 0)}</div>
          </div>
          {keywords.length > 0 && onClearKeywords && (
            <>
              <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />
              <button onClick={onClearKeywords} className="glass-btn glass-btn-danger" style={{ fontSize: '0.72rem', padding: '6px 10px' }} title="Clear All Keywords">
                <Trash2 size={13} /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task-Specific Presets Packs Grid */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="#00e5ff" /> TASK-SPECIFIC TARGET PACKS
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#8b9bb4', marginTop: '2px' }}>
              Pre-configured domain-specific senders (<code>noreply@</code>, <code>help@</code>, <code>order@</code>) for common inspection tasks.
            </p>
          </div>
          <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#8b9bb4', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px' }}>
            Click to load into scanner
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {TASK_KEYWORD_PACKS.map(pack => (
            <div key={pack.id} style={{
              background: 'rgba(0,0,0,0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)',
              padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px',
              transition: 'border-color 0.2s, transform 0.15s'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{pack.title}</span>
                  <span style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: pack.color, background: `${pack.color}15`, border: `1px solid ${pack.color}40`, padding: '2px 8px', borderRadius: '6px' }}>
                    {pack.keywords.length} Senders
                  </span>
                </div>
                <p style={{ fontSize: '0.7rem', color: '#8b9bb4', lineHeight: 1.4, marginBottom: '10px' }}>
                  {pack.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {pack.keywords.slice(0, 3).map((k, i) => (
                    <span key={i} style={{ fontSize: '0.62rem', fontFamily: "'JetBrains Mono', monospace", color: '#d1d5db', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                      {k.kw}
                    </span>
                  ))}
                  {pack.keywords.length > 3 && (
                    <span style={{ fontSize: '0.62rem', color: '#8b9bb4', padding: '2px 4px' }}>
                      +{pack.keywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleLoadPack(pack)}
                className="glass-btn"
                style={{
                  width: '100%', justifyContent: 'center', fontSize: '0.72rem', padding: '8px',
                  color: loadedPackId === pack.id ? '#00ff9d' : '#fff',
                  borderColor: loadedPackId === pack.id ? 'rgba(0,255,157,0.5)' : undefined
                }}
              >
                {loadedPackId === pack.id ? (
                  <><CheckCircle2 size={13} color="#00ff9d" /> Added to Targets</>
                ) : (
                  <><Plus size={13} color={pack.color} /> Load {pack.title} Pack</>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Left Column: Domain Sender Generator + Single/Batch Import */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Target Domain Generator */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#00ff9d" /> DOMAIN SENDER GENERATOR
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#8b9bb4', marginBottom: '14px' }}>
              Enter any platform domain to auto-generate <code>noreply@</code>, <code>order@</code>, <code>help@</code>, and <code>support@</code> senders.
            </p>

            {/* Quick Popular Target Chips */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.65rem', color: '#8b9bb4', marginBottom: '6px', fontWeight: 600 }}>
                QUICK PLATFORM PRESETS:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[
                  { label: 'Amazon.ca', domain: 'amazon.ca', cat: 'E-Commerce' },
                  { label: 'Amazon.com', domain: 'amazon.com', cat: 'E-Commerce' },
                  { label: 'PayPal', domain: 'paypal.com', cat: 'Banking' },
                  { label: 'Interac', domain: 'payments.interac.ca', cat: 'Banking' },
                  { label: 'Apple', domain: 'apple.com', cat: 'E-Commerce' },
                  { label: 'eBay', domain: 'ebay.com', cat: 'E-Commerce' },
                  { label: 'Coinbase', domain: 'coinbase.com', cat: 'Crypto' },
                  { label: 'Steam', domain: 'steampowered.com', cat: 'Gaming' },
                  { label: 'Uber', domain: 'uber.com', cat: 'E-Commerce' },
                  { label: 'Netflix', domain: 'netflix.com', cat: 'Gaming' }
                ].map(chip => (
                  <button
                    key={chip.domain}
                    type="button"
                    onClick={() => {
                      setGeneratorDomain(chip.domain);
                      setGeneratorCategory(chip.cat);
                    }}
                    style={{
                      background: generatorDomain.toLowerCase().includes(chip.domain.toLowerCase()) ? 'rgba(0, 255, 157, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: generatorDomain.toLowerCase().includes(chip.domain.toLowerCase()) ? '1px solid #00ff9d' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: generatorDomain.toLowerCase().includes(chip.domain.toLowerCase()) ? '#00ff9d' : '#cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.66rem',
                      cursor: 'pointer',
                      fontFamily: "'JetBrains Mono', monospace"
                    }}
                  >
                    +{chip.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleApplyDomainGenerator} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: '4px' }}>
                  TARGET PLATFORM DOMAIN(S)
                </label>
                <input
                  type="text"
                  placeholder="e.g. amazon, ebay.com, paypal, uber.com (comma separated)"
                  value={generatorDomain}
                  onChange={(e) => setGeneratorDomain(e.target.value)}
                  className="glass-input"
                  style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                <select
                  value={generatorCategory}
                  onChange={(e) => setGeneratorCategory(e.target.value)}
                  className="glass-input"
                  style={{ fontSize: '0.72rem', background: '#0a0d16' }}
                >
                  <option value="E-Commerce">E-Commerce / Retail</option>
                  <option value="Banking">Banking / Financial</option>
                  <option value="Crypto">Crypto Exchange</option>
                  <option value="Gaming">Gaming / Entertainment</option>
                  <option value="Telecom">Telecom / ISP</option>
                  <option value="Security">Security / Auth</option>
                  <option value="Custom">Custom Target</option>
                </select>
              </div>

              {previewGenerated.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,255,157,0.2)', fontSize: '0.68rem', color: '#8b9bb4' }}>
                  <div style={{ color: '#00ff9d', fontWeight: 700, marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Preview ({previewGenerated.length} senders to generate):</span>
                    <span style={{ color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace" }}>Instant Generator</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '85px', overflowY: 'auto' }}>
                    {previewGenerated.map((p, idx) => (
                      <span key={idx} style={{ color: '#fff', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {p.kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={previewGenerated.length === 0}
                className="glass-btn glass-btn-green"
                style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '9px', opacity: previewGenerated.length === 0 ? 0.5 : 1 }}
              >
                <Plus size={14} /> Generate & Add {previewGenerated.length > 0 ? `(${previewGenerated.length}) Senders` : ''}
              </button>
            </form>
          </div>

          {/* Add Single Keyword Form */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} color="#00e5ff" /> ADD SINGLE KEYWORD / SENDER
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: '4px' }}>KEYWORD OR EMAIL SENDER</label>
                <input
                  type="text"
                  placeholder="e.g. noreply@target.com, help@uber.com"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="glass-input"
                  style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace" }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="glass-input"
                  style={{ fontSize: '0.72rem', background: '#0a0d16' }}
                >
                  <option value="E-Commerce">E-Commerce</option>
                  <option value="Banking">Banking</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Telecom">Telecom / ISP</option>
                  <option value="Security">Security / Auth</option>
                  <option value="Custom">Custom Target</option>
                </select>
              </div>
              <button type="submit" className="glass-btn glass-btn-purple" style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '9px' }}>
                + Add Single Target
              </button>
            </form>
          </div>

          {/* File & Bulk Import Panel */}
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} color="#b026ff" /> BATCH LOAD FROM FILE / TEXT
            </h3>
            
            <div style={{
              border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '14px',
              padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', marginBottom: '12px'
            }}>
              <p style={{ fontSize: '0.7rem', color: '#8b9bb4', marginBottom: '10px' }}>
                Load .TXT or .CSV file containing keywords (one per line)
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <button onClick={() => fileInputRef.current?.click()} className="glass-btn glass-btn-green" style={{ fontSize: '0.72rem', padding: '7px 12px' }}>
                  <FileText size={13} /> Select File
                </button>
                <button onClick={() => setShowPasteModal(true)} className="glass-btn glass-btn-purple" style={{ fontSize: '0.72rem', padding: '7px 12px' }}>
                  <Zap size={13} /> Paste List
                </button>
              </div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept=".txt,.csv,.log"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
            </div>

            <div>
              <label style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: '4px' }}>BULK CATEGORY TAG</label>
              <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}
                className="glass-input" style={{ fontSize: '0.72rem', background: '#0a0d16' }}>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Banking">Banking</option>
                <option value="Crypto">Crypto</option>
                <option value="Gaming">Gaming</option>
                <option value="Bulk Target">Bulk Target List</option>
              </select>
            </div>
          </div>

        </div>

        {/* Right Column: Active Keywords Grid */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Search active targets..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="glass-input"
                style={{ fontSize: '0.75rem', paddingLeft: '32px' }}
              />
              <Search size={14} color="#8b9bb4" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
              Showing <span style={{ color: '#fff', fontWeight: 700 }}>{filtered.length}</span> of {keywords.length} Targets
            </div>
          </div>

          {keywords.length === 0 ? (
            /* Clean Empty State: Let the user decide */
            <div style={{
              flex: 1, minHeight: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', padding: '36px', textAlign: 'center', background: 'rgba(0,0,0,0.2)'
            }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '16px', background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px'
              }}>
                <Key size={26} color="#00e5ff" />
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                No Target Keywords Loaded
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#8b9bb4', maxWidth: '420px', lineHeight: 1.5, marginBottom: '20px' }}>
                Select a task pack above (e.g. <b>E-Commerce</b>, <b>Banking</b>, <b>Crypto</b>), generate senders for a target domain, or add your custom keywords.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {TASK_KEYWORD_PACKS.slice(0, 3).map(pack => (
                  <button
                    key={pack.id}
                    onClick={() => handleLoadPack(pack)}
                    className="glass-btn"
                    style={{ fontSize: '0.72rem', padding: '8px 14px', borderColor: `${pack.color}40`, color: pack.color }}
                  >
                    + Load {pack.title}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
              {filtered.map((item) => (
                <div key={item.id} style={{
                  padding: '12px 14px', borderRadius: '12px', background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.keyword}>
                        {item.keyword}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.62rem', background: 'rgba(176,38,255,0.2)', color: '#b026ff', padding: '1px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                        {item.category}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: item.hitsCount > 0 ? '#00ff9d' : '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Zap size={11} color={item.hitsCount > 0 ? '#00ff9d' : '#8b9bb4'} /> {item.hitsCount} hits
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveKeyword(item.id)}
                    style={{
                      color: '#8b9bb4', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px',
                      transition: 'color 0.2s, background 0.2s', flexShrink: 0
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#8b9bb4'; e.currentTarget.style.background = 'none'; }}
                    title="Delete target keyword"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              Paste Target Senders / Keywords
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#8b9bb4', marginBottom: '12px' }}>
              Paste one target per line (e.g. <code>noreply@domain.com</code> or <code>help@domain.com</code>):
            </p>
            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`noreply@amazon.ca\nhelp@coinbase.com\norder@walmart.com\nnotify@payments.interac.ca\nsupport@steampowered.com`}
              className="glass-input"
              style={{ width: '100%', marginBottom: '16px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowPasteModal(false)} className="glass-btn" style={{ fontSize: '0.75rem' }}>
                Cancel
              </button>
              <button onClick={handlePasteSubmit} className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem' }}>
                Import Targets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

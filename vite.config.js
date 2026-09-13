import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { verifyImapCredentials, fetchAllRealFolders, deleteRealImapMessage, forwardRealEmail, massForwardRealEmails, testProxyConnection } from './src/server/imapService.js'

const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024; // 50 MB payload ceiling for batch email relay

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    let received = 0
    req.on('data', chunk => {
      received += chunk.length
      if (received > MAX_PAYLOAD_BYTES) {
        req.destroy()
        reject(new Error('Payload size exceeds 50 MB limit'))
        return
      }
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

async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length)
  let index = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
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

          // Endpoint: /api/check-imap-batch (Concurrent batch check with bounded concurrency pool)
          if (req.url === '/api/check-imap-batch' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { items } = body
              if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing, empty, or oversized items array (max 200)' }))
                return
              }

              const results = await mapConcurrent(items, 16, async item => {
                const checkResult = await verifyImapCredentials({
                  host: item.host,
                  port: Number(item.port) || 993,
                  user: item.email,
                  pass: item.password,
                  timeout: Number(item.timeout) || 8000,
                  proxy: item.proxy || null
                })
                return { id: item.id, email: item.email, ...checkResult }
              })

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
              const { host, port, smtpHost, smtpPort, email, password, to, cc, bcc, subject, note, origBodyText, origBodyHtml, origSender, origDate, messageId, isReply, attachments, proxy } = body
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
                cc: cc || '',
                bcc: bcc || '',
                subject: subject || (isReply ? 'Re: Email Message' : 'Fwd: Email Message'),
                note,
                origBodyText: origBodyText || '',
                origBodyHtml: origBodyHtml || '',
                origSender: origSender || '',
                origDate: origDate || '',
                messageId: messageId || '',
                isReply: Boolean(isReply),
                attachments: attachments || [],
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

          // Endpoint: /api/mass-forward-mail
          if (req.url === '/api/mass-forward-mail' && req.method === 'POST') {
            try {
              const body = await parseJsonBody(req)
              const { host, port, smtpHost, smtpPort, email, password, recipients, webhookUrl, messages, note, proxy } = body
              const result = await massForwardRealEmails({
                host,
                port: Number(port) || 993,
                smtpHost,
                smtpPort: Number(smtpPort) || 587,
                user: email,
                pass: password,
                recipients: recipients || [],
                webhookUrl: webhookUrl || '',
                messages: messages || [],
                note: note || '',
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

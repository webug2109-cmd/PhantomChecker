import { Buffer } from 'node:buffer';

/**
 * Strips non-base64 formatting characters
 * @param {string} input 
 * @returns {string}
 */
export function sanitizeBase64Candidate(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^A-Za-z0-9+/=]/g, '');
}

/**
 * Tests whether a given string is a valid base64 payload that decodes to printable text.
 * Supports international Unicode (Cyrillic, CJK, Arabic, etc.), detects truncated boundaries,
 * handles unpadded Base64, and prevents memory exhaustion.
 * 
 * @param {string} candidate 
 * @param {number} maxPayloadBytes Default 10MB
 * @returns {{ isValid: boolean, decoded: string | null }}
 */
export function attemptBase64Decode(candidate, maxPayloadBytes = 10 * 1024 * 1024) {
  if (typeof candidate !== 'string') return { isValid: false, decoded: null };

  let clean = sanitizeBase64Candidate(candidate);
  if (clean.length < 4) return { isValid: false, decoded: null };

  // 1. Normalize unpadded Base64 (RFC 4648 §3.2)
  const remainder = clean.length % 4;
  if (remainder === 1) {
    return { isValid: false, decoded: null }; // Invalid Base64 length
  } else if (remainder === 2) {
    clean += '==';
  } else if (remainder === 3) {
    clean += '=';
  }

  // 2. Memory protection guard
  if (clean.length > maxPayloadBytes * 1.4) {
    return { isValid: false, decoded: null };
  }

  try {
    const buf = Buffer.from(clean, 'base64');
    if (buf.length === 0) return { isValid: false, decoded: null };

    // 3. Reject dirty padding bits / mid-string padding corruption
    const reEncoded = buf.toString('base64');
    if (reEncoded !== clean && clean.replace(/=+$/, '') !== reEncoded.replace(/=+$/, '')) {
      return { isValid: false, decoded: null };
    }

    // 4. Decode UTF-8 with fatal boundary check (rejects truncated multi-byte sequences)
    let decodedText;
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decodedText = decoder.decode(buf);
    } catch {
      return { isValid: false, decoded: null };
    }

    // 5. Zero-allocation control character & null byte check
    let controlCount = 0;
    const len = decodedText.length;
    for (let i = 0; i < len; i++) {
      const code = decodedText.charCodeAt(i);
      // Null byte strictly indicates binary/corrupt data
      if (code === 0) return { isValid: false, decoded: null };

      // Non-printable control codes: 0x01-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F, 0x80-0x9F
      if (
        (code <= 0x08) ||
        (code === 0x0B) ||
        (code === 0x0C) ||
        (code >= 0x0E && code <= 0x1F) ||
        (code === 0x7F) ||
        (code >= 0x80 && code <= 0x9F)
      ) {
        controlCount++;
        if (controlCount / len > 0.10) {
          return { isValid: false, decoded: null };
        }
      }
    }

    if (controlCount / Math.max(len, 1) > 0.10) {
      return { isValid: false, decoded: null };
    }

    return { isValid: true, decoded: decodedText };
  } catch {
    return { isValid: false, decoded: null };
  }
}

/**
 * Recursively unpacks nested base64 or obfuscated data wrappers.
 * @param {string} rawContent 
 * @param {number} maxDepth 
 * @returns {{ depth: number, finalPayload: string, trace: string[] }}
 */
export function unrollObfuscatedPayload(rawContent, maxDepth = 5) {
  if (typeof rawContent !== 'string') {
    return { depth: 0, finalPayload: '', trace: [] };
  }

  let current = rawContent.trim();
  let depth = 0;
  const trace = [];

  while (depth < maxDepth) {
    const attempt = attemptBase64Decode(current);
    if (!attempt.isValid || !attempt.decoded || attempt.decoded === current) {
      break;
    }

    depth++;
    trace.push(`Unpacked Base64 Layer ${depth} (Input len: ${current.length} -> Output len: ${attempt.decoded.length})`);
    current = attempt.decoded.trim();
  }

  return { depth, finalPayload: current, trace };
}

/**
 * Scans an email body or headers for embedded obfuscated payloads.
 * @param {string} rawEmailBody 
 * @param {Array<{ key: string, value: string }>} headers 
 * @returns {object}
 */
export function analyzeAndRecoverObfuscatedEmail(rawEmailBody = '', headers = []) {
  const safeBody = typeof rawEmailBody === 'string' ? rawEmailBody : '';
  const results = {
    recoveredContent: safeBody,
    wasObfuscated: false,
    layersUnpacked: 0,
    forensicAttribution: {
      originIps: [],
      clientMailer: 'Unknown',
      dkimSignatures: [],
      senderRoute: [],
    },
    originIps: [],
    threatIndicators: [],
    unpackTrace: [],
  };

  if (headers) {
    const headerEntries = [];
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (!h) continue;
        if (typeof h === 'object' && h.key) {
          headerEntries.push({ key: String(h.key).toLowerCase(), value: String(h.value || '') });
        } else if (typeof h === 'string') {
          const colonIdx = h.indexOf(':');
          if (colonIdx !== -1) {
            headerEntries.push({ key: h.slice(0, colonIdx).trim().toLowerCase(), value: h.slice(colonIdx + 1).trim() });
          }
        }
      }
    } else if (typeof headers === 'object') {
      if (typeof headers.forEach === 'function') {
        headers.forEach((val, key) => {
          if (Array.isArray(val)) {
            val.forEach(v => headerEntries.push({ key: String(key).toLowerCase(), value: String(v) }));
          } else {
            headerEntries.push({ key: String(key).toLowerCase(), value: String(val) });
          }
        });
      } else {
        for (const [key, val] of Object.entries(headers)) {
          if (Array.isArray(val)) {
            val.forEach(v => headerEntries.push({ key: String(key).toLowerCase(), value: String(v) }));
          } else {
            headerEntries.push({ key: String(key).toLowerCase(), value: String(val) });
          }
        }
      }
    }

    for (const h of headerEntries) {
      const name = h.key;
      const val = h.value;

      if (name === 'received') {
        results.forensicAttribution.senderRoute.push(val);
        const ipMatches = val.match(/\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g);
        if (ipMatches) {
          results.forensicAttribution.originIps.push(...ipMatches);
        }
      } else if (name === 'x-mailer' || name === 'user-agent') {
        results.forensicAttribution.clientMailer = val;
      } else if (name === 'dkim-signature') {
        results.forensicAttribution.dkimSignatures.push(val);
      }
    }
  }

  results.forensicAttribution.originIps = [...new Set(results.forensicAttribution.originIps)];
  results.originIps = results.forensicAttribution.originIps;

  // Primary body unroll
  const directUnroll = unrollObfuscatedPayload(safeBody);
  if (directUnroll.depth > 0) {
    results.wasObfuscated = true;
    results.layersUnpacked = directUnroll.depth;
    results.recoveredContent = directUnroll.finalPayload;
    results.unpackTrace = directUnroll.trace;
  } else {
    // Scan inline chunks with word/token boundary assertions (min 16 chars = 12 bytes)
    const chunkRegex = /(?<![A-Za-z0-9+/])(?:[A-Za-z0-9+/]{4}){4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?(?![A-Za-z0-9+/=])/g;
    let modifiedBody = safeBody;
    let inlineMatchesFound = 0;
    let maxInlineDepth = 0;

    modifiedBody = modifiedBody.replace(chunkRegex, (match) => {
      // Recursively unroll inline matches
      const unrolled = unrollObfuscatedPayload(match);
      if (unrolled.depth > 0) {
        inlineMatchesFound++;
        maxInlineDepth = Math.max(maxInlineDepth, unrolled.depth);
        results.unpackTrace.push(...unrolled.trace);
        return `\n[--- RECOVERED OBFUSCATED PAYLOAD START ---]\n${unrolled.finalPayload}\n[--- RECOVERED OBFUSCATED PAYLOAD END ---]\n`;
      }
      return match;
    });

    if (inlineMatchesFound > 0) {
      results.wasObfuscated = true;
      results.layersUnpacked = maxInlineDepth;
      results.recoveredContent = modifiedBody;
      results.threatIndicators.push(`Extracted ${inlineMatchesFound} hidden inline base64 blocks`);
    }
  }

  if (results.layersUnpacked > 1) {
    results.threatIndicators.push(`Multi-layer nesting evasion: ${results.layersUnpacked} recursive base64 layers unpacked`);
  }

  const contentLower = results.recoveredContent.toLowerCase();
  if (contentLower.includes('bitcoin') || contentLower.includes('wallet') || contentLower.includes('private key') || contentLower.includes('ransom')) {
    results.threatIndicators.push('Cryptocurrency extortion / ransom keywords detected in recovered payload');
  }
  if (contentLower.includes('powershell') || contentLower.includes('cmd.exe') || contentLower.includes('wscript') || contentLower.includes('eval(')) {
    results.threatIndicators.push('Suspicious script or shell command execution artifacts detected');
  }

  return results;
}

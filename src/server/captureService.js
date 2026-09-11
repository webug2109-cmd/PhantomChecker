/**
 * Phantom Checker — Full-Capture Extraction Engine
 *
 * Analyzes parsed mailbox content and extracts:
 *  - membership services and their tier (Netflix=Premium, Spotify=Family...)
 *  - payment methods attached to the account (VISA*4242, PayPal, Apple Pay...)
 *
 * Pure functions, no Node APIs: imported by the Vite middleware, the Electron
 * main process, and the React bundle.
 */

import { CAPTURE_SERVICES, GENERIC_TIERS, titleCaseTier, hasCaptures } from '../data/capturePatterns.js';

// ─── Payment method patterns ──────────────────────────────────────────────────

const CARD_PATTERNS = [
  // "Visa ending in 4242", "Mastercard •••• 1234", "Amex ****5678"
  {
    re: /\b(visa|mastercard|master card|amex|american express|discover|maestro)\b[^0-9\n]{0,40}?(\d{4})\b/i,
    brand: m => m[1]
  },
  // "card ending in 4242" / "card ending with 1234" — brand may be absent
  {
    re: /\bcard\s+ending\s+(?:in\s+|with\s+)?(\d{4})\b/i,
    brand: () => null
  },
  // "•••• 4242" / "****4242" / "xxxx-1234"
  {
    re: /(?:•{2,}|\*{3,}|x{4}-?)\s?(\d{4})\b/i,
    brand: () => null
  }
];

const WALLET_PATTERNS = [
  { re: /\bpaypal\b/i, label: 'PayPal' },
  { re: /\bapple\s?pay\b/i, label: 'Apple Pay' },
  { re: /\bgoogle\s?pay\b/i, label: 'Google Pay' },
  { re: /\binterac\b/i, label: 'Interac' }
];

function normalizeBrand(brand) {
  if (!brand) return 'CARD';
  const b = brand.toLowerCase().replace(/\s+/g, ' ').trim();
  if (b === 'american express' || b === 'amex') return 'AMEX';
  if (b === 'mastercard' || b === 'master card') return 'MASTERCARD';
  return b.toUpperCase();
}

/**
 * Extract payment methods from a message corpus.
 * @returns {Array<{type: string, label: string}>}
 */
function extractPayments(corpus) {
  const found = [];
  const seenLabels = new Set();
  const seenLast4 = new Set();

  // Branded matches first: "Visa ending in 4242" wins over a later generic
  // "card ending in 4242" for the same digits.
  for (const pattern of CARD_PATTERNS) {
    const m = corpus.match(pattern.re);
    if (m) {
      const last4 = m[2] || m[1];
      if (last4 && /^\d{4}$/.test(last4)) {
        const brand = normalizeBrand(pattern.brand(m));
        const label = `${brand}*${last4}`;
        if (!seenLabels.has(label)) {
          seenLabels.add(label);
          seenLast4.add(last4);
          if (brand !== 'CARD') {
            found.push({ type: 'card', label });
          } else {
            // Generic match: only keep it if no branded match owns these digits.
            found.push({ type: 'card', label, _last4: last4 });
          }
        }
      }
    }
  }

  // Drop generic CARD entries whose digits were already captured with a brand.
  const cards = found.filter(p => {
    if (p.type !== 'card') return true;
    if (!p._last4) return true;
    return !found.some(other => other !== p && other.type === 'card' && !other._last4 && other.label.endsWith(p._last4));
  }).map(p => ({ type: p.type, label: p.label }));

  const wallets = [];
  for (const pattern of WALLET_PATTERNS) {
    if (pattern.re.test(corpus) && !seenLabels.has(pattern.label)) {
      seenLabels.add(pattern.label);
      wallets.push({ type: 'wallet', label: pattern.label });
    }
  }

  return [...cards, ...wallets];
}

// ─── Membership services & tiers ─────────────────────────────────────────────

/**
 * Match a membership service for this message by sender domain first, then by
 * body hints. Returns the matched service entry or null.
 */
function matchService(senderEmail, corpus) {
  const domain = (senderEmail || '').toLowerCase().split('@')[1] || '';

  for (const service of CAPTURE_SERVICES) {
    const domainHit = service.domains.some(d => domain === d || domain.endsWith(`.${d}`) || domain === d.replace(/^www\./, ''));
    if (domainHit) return service;
  }

  for (const service of CAPTURE_SERVICES) {
    if (service.bodyHints.some(hint => corpus.includes(hint))) {
      return service;
    }
  }
  return null;
}

/**
 * Extract the membership tier for a service from a message corpus.
 * "your premium plan", "renewal of your Family subscription", "Plan: Standard".
 */
function extractTier(service, corpus) {
  const tierWords = service
    ? service.tiers.join('|')
    : GENERIC_TIERS.join('|');

  const explicit = corpus.match(
    new RegExp(`\\b(?:your|renewal\\s+of\\s+(?:your)?|plan:?\\s*)\\s*(${tierWords})\\s*(?:plan|membership|subscription)?\\b`, 'i')
  );
  if (explicit) return titleCaseTier(explicit[1]);

  if (service) {
    for (const tier of service.tiers) {
      if (corpus.includes(tier)) return titleCaseTier(tier);
    }
  }
  return null;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Extract captures from one message.
 * @param {{ subject?: string, senderEmail?: string, text?: string }} msg
 * @returns {{ services: Array<{id,label,tier}>, payments: Array<{type,label}> }}
 */
export function extractCaptures({ subject = '', senderEmail = '', text = '' }) {
  const corpus = `${subject}\n${text}`.toLowerCase();

  const payments = extractPayments(corpus);
  const services = [];

  const service = matchService(senderEmail, corpus);
  if (service) {
    const tier = extractTier(service, corpus);
    services.push({ id: service.id, label: service.label, tier });
  } else {
    // Generic membership statement from an unmatched sender ("Your Premium
    // membership") — record it as a plain membership with tier.
    const tier = extractTier(null, corpus);
    if (tier && /\b(plan|membership|subscription)\b/.test(corpus)) {
      services.push({ id: 'membership', label: 'Membership', tier });
    }
  }

  return { services, payments };
}

/**
 * Merge per-message captures into one account-level capture set.
 * First non-empty tier per service wins (services are listed most-specific
 * first); payment methods are deduped by label.
 */
export function mergeCaptures(captureSets) {
  const serviceMap = new Map();
  const paymentLabels = new Set();
  const payments = [];

  for (const set of captureSets) {
    if (!set) continue;
    for (const s of set.services || []) {
      const existing = serviceMap.get(s.id);
      if (!existing) {
        serviceMap.set(s.id, { ...s });
      } else if (!existing.tier && s.tier) {
        existing.tier = s.tier;
      }
    }
    for (const p of set.payments || []) {
      if (!paymentLabels.has(p.label)) {
        paymentLabels.add(p.label);
        payments.push(p);
      }
    }
  }

  return { services: Array.from(serviceMap.values()), payments };
}

export { hasCaptures };

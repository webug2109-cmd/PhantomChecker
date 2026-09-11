/**
 * Phantom Checker — Full-Capture Definitions
 *
 * Catalog of subscription services and payment methods extracted from fetched
 * mailbox content, plus the shared formatter used by every export path
 * (browser downloads, Checker Studio exports, and the Electron hits folder).
 *
 * Pure data + pure functions only: this module is imported by the React bundle,
 * the Vite dev middleware, and the Electron main process.
 */

// Membership services matched by sender domain and body keywords.
// `tiers` are ordered most-specific-first; the first one found in the message
// wins. A tier listed earlier is never overridden by a later mail.
export const CAPTURE_SERVICES = [
  {
    id: 'netflix',
    label: 'Netflix',
    domains: ['netflix.com'],
    bodyHints: ['netflix'],
    tiers: ['premium', 'standard', 'basic', 'with ads']
  },
  {
    id: 'spotify',
    label: 'Spotify',
    domains: ['spotify.com'],
    bodyHints: ['spotify'],
    tiers: ['premium family', 'premium duo', 'family', 'duo', 'student', 'premium', 'individual']
  },
  {
    id: 'disney',
    label: 'Disney+',
    domains: ['disneyplus.com', 'disney-plus.net', 'disneyplus.ca'],
    bodyHints: ['disney+'],
    tiers: ['premium', 'standard', 'basic']
  },
  {
    id: 'prime',
    label: 'Amazon Prime',
    domains: ['amazon.com', 'amazon.ca'],
    bodyHints: ['amazon prime', 'prime membership', 'prime video'],
    tiers: ['prime']
  },
  {
    id: 'apple',
    label: 'Apple',
    domains: ['apple.com', 'icloud.com'],
    bodyHints: ['icloud+', 'apple one', 'apple music', 'apple tv+', 'apple arcade', 'apple fitness+'],
    tiers: ['apple one', 'icloud+', 'apple music', 'apple tv+', 'apple fitness+', 'apple arcade', 'family', 'individual']
  },
  {
    id: 'youtube',
    label: 'YouTube',
    domains: ['youtube.com'],
    bodyHints: ['youtube premium', 'youtube music'],
    tiers: ['premium', 'music']
  },
  {
    id: 'crave',
    label: 'Crave',
    domains: ['crave.ca', 'cravetv.ca', 'bellmedia.ca'],
    bodyHints: ['crave premium', 'crave total', 'crave basic'],
    tiers: ['premium', 'total', 'basic']
  },
  {
    id: 'paramount',
    label: 'Paramount+',
    domains: ['paramountplus.com', 'paramount.com'],
    bodyHints: ['paramount+'],
    tiers: ['essential', 'premium']
  },
  {
    id: 'max',
    label: 'HBO Max',
    domains: ['max.com', 'hbomax.com', 'hbo.com'],
    bodyHints: ['hbo max', 'max subscription'],
    tiers: ['premium', 'standard', 'basic with ads']
  },
  {
    id: 'microsoft',
    label: 'Microsoft 365',
    domains: ['microsoft.com'],
    bodyHints: ['microsoft 365', 'office 365'],
    tiers: ['family', 'personal', 'business', 'premium']
  }
];

// Generic membership tier words tried when the service has no dedicated match
// or the mail reads like a plain membership statement.
export const GENERIC_TIERS = [
  'premium', 'ultimate', 'pro', 'plus', 'deluxe', 'family', 'standard', 'essential', 'basic', 'student', 'lite'
];

export function titleCaseTier(raw) {
  if (!raw) return '';
  return raw
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Render a capture set as a single export line segment.
 * e.g. "Netflix=Premium | Spotify=Family | VISA*4242 | PayPal"
 * Returns '' when there is nothing to show.
 */
export function formatCaptureLine(captures) {
  if (!captures) return '';
  const parts = [];
  (captures.services || []).forEach(s => {
    parts.push(s.tier ? `${s.label}=${s.tier}` : s.label);
  });
  (captures.payments || []).forEach(p => {
    parts.push(p.label);
  });
  return parts.filter(Boolean).join(' | ');
}

/**
 * True when a capture set carries anything worth exporting or displaying.
 */
export function hasCaptures(captures) {
  if (!captures) return false;
  return (captures.services && captures.services.length > 0) ||
    (captures.payments && captures.payments.length > 0);
}

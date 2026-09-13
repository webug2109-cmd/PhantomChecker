/**
 * Universal Keyword & Brand Matcher
 * Eliminates false-positive hits from generic words and cross-brand collisions
 * across both frontend and backend email parsing.
 */

const COMMON_TLDS = new Set([
  'com', 'net', 'org', 'ca', 'co', 'uk', 'io', 'app', 'xyz', 'info', 
  'biz', 'us', 'de', 'fr', 'eu', 'online', 'site', 'live', 'store'
]);

const GENERIC_STOP_WORDS = new Set([
  'email', 'mail', 'message', 'inbox', 'reply', 'noreply', 'notification',
  'notifications', 'alert', 'alerts', 'support', 'service', 'services',
  'account', 'accounts', 'security', 'info', 'order', 'orders', 'www',
  'com', 'net', 'org', 'ca', 'from', 'user', 'auto', 'confirm'
]);

/**
 * Extracts normalized full keyword, domain, and true Second-Level Domain (brand).
 */
export function extractBrandKeywords(rawKw) {
  if (!rawKw) return { full: '', domain: '', brand: '', user: '' };
  const full = String(rawKw).toLowerCase().trim();
  if (!full) return { full: '', domain: '', brand: '', user: '' };

  let user = '';
  let domain = '';
  if (full.includes('@')) {
    const parts = full.split('@');
    user = parts[0].trim();
    domain = parts[1].trim();
  } else if (full.includes('.')) {
    domain = full.trim().replace(/^[@.]/, '');
  }

  let brand = '';
  if (domain) {
    const parts = domain.split('.').filter(Boolean);
    while (parts.length > 1 && COMMON_TLDS.has(parts[parts.length - 1])) {
      parts.pop();
    }
    const sld = parts[parts.length - 1];
    if (sld && !GENERIC_STOP_WORDS.has(sld) && sld.length >= 3) {
      brand = sld;
    }
  } else {
    const token = full.replace(/[^a-z0-9]/g, '');
    if (!GENERIC_STOP_WORDS.has(token) && token.length >= 3) {
      brand = token;
    }
  }

  return { full, domain, brand, user };
}

/**
 * Checks if a search corpus truly matches a target keyword.
 * Guards strictly against generic subdomain false-positives.
 * Supports optional structured metadata { fromAddr, fromName, subject } for precision.
 */
export function testKeywordMatch(searchCorpus, rawKw, meta = null) {
  if (!rawKw || !searchCorpus) return false;
  const target = String(rawKw).toLowerCase().trim();
  if (!target) return false;

  const corpus = String(searchCorpus).toLowerCase();
  const fromAddr = (meta?.fromAddr || meta?.senderEmail || '').toLowerCase().trim();
  const fromName = (meta?.fromName || meta?.sender || '').toLowerCase().trim();
  const subject = (meta?.subject || '').toLowerCase().trim();

  // 1. Direct exact substring match of full target (e.g. "noreply@wayfair.ca")
  if (corpus.includes(target)) return true;
  if (fromAddr && (fromAddr === target || fromAddr.includes(target))) return true;

  // 2. Target is an email address: prefix@domain.tld (e.g. "order@wayfair.ca")
  if (target.includes('@')) {
    const [tUser, tDomain] = target.split('@');
    if (!tDomain) return false;

    // If structured sender address is available:
    if (fromAddr) {
      if (fromAddr === target) return true;
      const [fUser, fDomain] = fromAddr.split('@');
      if (fDomain) {
        // Strict domain match (must be identical domain or exact subdomain of tDomain)
        // e.g. "orders.wayfair.ca" matches "wayfair.ca", but "members.wayfair.com" DOES NOT MATCH "wayfair.ca"
        const domainMatches = fDomain === tDomain || fDomain.endsWith(`.${tDomain}`);
        if (domainMatches) {
          // If domain matches, the user prefix must match or be in subject
          if (tUser) {
            if (fUser === tUser || fUser.includes(tUser)) return true;
            if (subject && subject.includes(tUser)) return true;
          } else {
            return true;
          }
        }
      }
      return false; // Email target didn't match sender
    }

    // In raw corpus: require exact tDomain AND tUser in proximity
    if (tDomain && corpus.includes(tDomain)) {
      if (!tUser) return true;
      try {
        const userRegex = new RegExp(`\\b${tUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (userRegex.test(corpus)) return true;
      } catch {
        if (corpus.includes(tUser)) return true;
      }
    }
    return false;
  }

  // 3. Target is a domain (e.g. "wayfair.ca" or "@sympatico.ca")
  if (target.includes('.')) {
    const cleanDomain = target.replace(/^[@.]/, '');
    if (cleanDomain.length >= 4) {
      if (fromAddr && (fromAddr.endsWith(`@${cleanDomain}`) || fromAddr.endsWith(`.${cleanDomain}`))) {
        return true;
      }
      if (corpus.includes(`@${cleanDomain}`) || corpus.includes(`.${cleanDomain}`) || corpus.includes(`//${cleanDomain}`)) {
        return true;
      }
    }
    return false;
  }

  // 4. Target is a bare brand or keyword (e.g. "playstation", "siriusxm", "bestbuy", "amazon")
  const brand = target.replace(/[^a-z0-9]/g, '');
  if (brand && brand.length >= 3) {
    if (GENERIC_STOP_WORDS.has(brand)) return false;

    try {
      const regex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (subject && regex.test(subject)) return true;
      if (fromName && regex.test(fromName)) return true;
      if (fromAddr && regex.test(fromAddr)) return true;
      if (regex.test(corpus)) return true;
    } catch {
      if (corpus.includes(` ${brand} `)) return true;
    }
  }

  return false;
}

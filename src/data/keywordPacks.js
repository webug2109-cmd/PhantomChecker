// Task-specific target keyword packs focused on domain-specific transactional senders:
// (noreply@domain, help@domain, order@domain, support@domain, billing@domain, security@domain)

export const TASK_KEYWORD_PACKS = [
  {
    id: 'ecommerce',
    title: 'E-Commerce & Orders',
    description: 'Shopping, retail orders, tracking & delivery accounts',
    category: 'E-Commerce',
    color: '#00e5ff',
    keywords: [
      { kw: 'order@amazon.ca', cat: 'E-Commerce' },
      { kw: 'auto-confirm@amazon.com', cat: 'E-Commerce' },
      { kw: 'shipment-tracking@amazon.com', cat: 'E-Commerce' },
      { kw: 'noreply@amazon.ca', cat: 'E-Commerce' },
      { kw: 'orders@ebay.com', cat: 'E-Commerce' },
      { kw: 'service@ebay.com', cat: 'E-Commerce' },
      { kw: 'order@walmart.com', cat: 'E-Commerce' },
      { kw: 'help@walmart.com', cat: 'E-Commerce' },
      { kw: 'orders@bestbuy.com', cat: 'E-Commerce' },
      { kw: 'noreply@bestbuy.ca', cat: 'E-Commerce' },
      { kw: 'receipts@apple.com', cat: 'E-Commerce' },
      { kw: 'no_reply@email.apple.com', cat: 'E-Commerce' },
      { kw: 'order@target.com', cat: 'E-Commerce' },
      { kw: 'orderstatus@homedepot.com', cat: 'E-Commerce' },
      { kw: 'orders@aliexpress.com', cat: 'E-Commerce' }
    ]
  },
  {
    id: 'banking',
    title: 'Banking & Payments',
    description: 'Interac transfers, wire alerts, PayPal & fintech logins',
    category: 'Banking',
    color: '#00ff9d',
    keywords: [
      { kw: 'notify@payments.interac.ca', cat: 'Banking' },
      { kw: 'catch@payments.interac.ca', cat: 'Banking' },
      { kw: 'service@paypal.com', cat: 'Banking' },
      { kw: 'noreply@paypal.com', cat: 'Banking' },
      { kw: 'alerts@chase.com', cat: 'Banking' },
      { kw: 'onlinebanking@rbc.com', cat: 'Banking' },
      { kw: 'alerts@rbc.com', cat: 'Banking' },
      { kw: 'notifications@td.com', cat: 'Banking' },
      { kw: 'customer.service@td.com', cat: 'Banking' },
      { kw: 'alerts@bmo.com', cat: 'Banking' },
      { kw: 'donotreply@bmo.com', cat: 'Banking' },
      { kw: 'customerinquiries@scotiabank.com', cat: 'Banking' },
      { kw: 'support@wealthsimple.com', cat: 'Banking' },
      { kw: 'noreply@wealthsimple.com', cat: 'Banking' },
      { kw: 'stripe@stripe.com', cat: 'Banking' }
    ]
  },
  {
    id: 'crypto',
    title: 'Crypto Exchanges',
    description: 'Deposit confirmations, withdrawals & security notices',
    category: 'Crypto',
    color: '#ff0055',
    keywords: [
      { kw: 'no-reply@coinbase.com', cat: 'Crypto' },
      { kw: 'help@coinbase.com', cat: 'Crypto' },
      { kw: 'do-not-reply@binance.com', cat: 'Crypto' },
      { kw: 'support@binance.com', cat: 'Crypto' },
      { kw: 'noreply@kraken.com', cat: 'Crypto' },
      { kw: 'support@kraken.com', cat: 'Crypto' },
      { kw: 'help@shakepay.me', cat: 'Crypto' },
      { kw: 'noreply@shakepay.me', cat: 'Crypto' },
      { kw: 'no-reply@crypto.com', cat: 'Crypto' },
      { kw: 'support@kucoin.com', cat: 'Crypto' },
      { kw: 'notifications@bybit.com', cat: 'Crypto' }
    ]
  },
  {
    id: 'gaming',
    title: 'Gaming & Entertainment',
    description: 'Steam receipts, Epic Games, PlayStation, Xbox & Netflix',
    category: 'Gaming',
    color: '#b026ff',
    keywords: [
      { kw: 'noreply@steampowered.com', cat: 'Gaming' },
      { kw: 'support@steampowered.com', cat: 'Gaming' },
      { kw: 'help@epicgames.com', cat: 'Gaming' },
      { kw: 'noreply@epicgames.com', cat: 'Gaming' },
      { kw: 'sony@email.sonyentertainmentnetwork.com', cat: 'Gaming' },
      { kw: 'noreply@xbox.com', cat: 'Gaming' },
      { kw: 'order@xbox.com', cat: 'Gaming' },
      { kw: 'info@netflix.com', cat: 'Gaming' },
      { kw: 'help@netflix.com', cat: 'Gaming' },
      { kw: 'no-reply@spotify.com', cat: 'Gaming' },
      { kw: 'noreply@ea.com', cat: 'Gaming' },
      { kw: 'noreply@blizzard.com', cat: 'Gaming' },
      { kw: 'account@riotgames.com', cat: 'Gaming' }
    ]
  },
  {
    id: 'telecom',
    title: 'ISP & Telecom Billing',
    description: 'Canadian ISP bills, invoices & customer service notifications',
    category: 'Telecom',
    color: '#38bdf8',
    keywords: [
      { kw: 'noreply@bell.ca', cat: 'Telecom' },
      { kw: 'support@bell.ca', cat: 'Telecom' },
      { kw: 'noreply@rogers.com', cat: 'Telecom' },
      { kw: 'service@rogers.com', cat: 'Telecom' },
      { kw: 'support@telus.com', cat: 'Telecom' },
      { kw: 'noreply@telus.com', cat: 'Telecom' },
      { kw: 'serviceclient@videotron.com', cat: 'Telecom' },
      { kw: 'support@shaw.ca', cat: 'Telecom' },
      { kw: 'billing@shaw.ca', cat: 'Telecom' },
      { kw: 'no-reply@cogeco.com', cat: 'Telecom' }
    ]
  },
  {
    id: 'security',
    title: 'Account Security & Auth',
    description: 'Password resets, 2FA codes, login alerts from Google, Microsoft, Apple',
    category: 'Security',
    color: '#f59e0b',
    keywords: [
      { kw: 'no-reply@accounts.google.com', cat: 'Security' },
      { kw: 'account-security-noreply@accountprotection.microsoft.com', cat: 'Security' },
      { kw: 'security@facebookmail.com', cat: 'Security' },
      { kw: 'security@mail.instagram.com', cat: 'Security' },
      { kw: 'verify@x.com', cat: 'Security' },
      { kw: 'appleid@id.apple.com', cat: 'Security' },
      { kw: 'no-reply@uber.com', cat: 'Security' }
    ]
  }
];

/**
 * Generate targeted account keywords for any arbitrary domain or list of domains:
 * Supports:
 * - "amazon" -> auto-completes to "amazon.com"
 * - "amazon.ca" -> respects exact domain
 * - "noreply@amazon.com" -> extracts "amazon.com"
 * - "https://www.paypal.com" -> extracts "paypal.com"
 * - Multiple domains separated by comma, space, newline: "amazon, ebay, uber"
 */
export function generateDomainKeywords(rawDomainInput, category = 'Custom') {
  if (!rawDomainInput || typeof rawDomainInput !== 'string') return [];

  // Split on commas, spaces, semicolons, or newlines to allow multiple domains
  const tokens = rawDomainInput
    .split(/[\s,;\n\r]+/)
    .map(t => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return [];

  const prefixes = [
    'noreply',
    'no-reply',
    'help',
    'order',
    'orders',
    'support',
    'billing',
    'service',
    'security',
    'notification',
    'notifications',
    'donotreply',
    'auto-confirm'
  ];

  const results = [];
  const seenKeywords = new Set();

  tokens.forEach(raw => {
    // Strip URL protocols, www., and email user prefixes (e.g. noreply@amazon.com -> amazon.com)
    let domain = raw.toLowerCase()
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .split('?')[0]
      .trim();

    // If it has an @, extract domain part
    if (domain.includes('@')) {
      domain = domain.split('@')[1] || '';
    }

    // Strip leading/trailing dots or special characters
    domain = domain.replace(/^[@./\\]+|[@./\\]+$/g, '');

    // If user entered single brand name without TLD (e.g. "amazon", "netflix", "paypal", "chase")
    if (domain && !domain.includes('.')) {
      domain = `${domain}.com`;
    }

    if (!domain || domain.length < 3) return;

    prefixes.forEach(p => {
      const kw = `${p}@${domain}`;
      if (!seenKeywords.has(kw)) {
        seenKeywords.add(kw);
        results.push({
          kw,
          cat: category || 'Target Domain'
        });
      }
    });
  });

  return results;
}


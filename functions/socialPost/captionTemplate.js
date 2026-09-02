/**
 * Social post caption + hashtag generator.
 *
 * Pure function — takes a product snapshot + resolved category/company
 * strings and returns { caption, hashtags, ctaUrl } ready for the
 * admin to copy-paste into LinkedIn / Facebook / WhatsApp.
 *
 * No template-per-platform for now; the same body reads the same on
 * all three so the admin doesn't have to pick a variant per network.
 */

const APP_URL = process.env.APP_URL || 'https://coretradeglobal.com';

/** Convert a free-form label into a compact PascalCase hashtag body. */
function toHashtag(input) {
  if (!input) return null;
  const cleaned = String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')       // strip diacritics
    .replace(/[^a-zA-Z0-9\s]/g, ' ')       // drop punctuation
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return cleaned ? `#${cleaned}` : null;
}

function formatPrice(price, currency, unit) {
  if (price == null || !currency) return null;
  const num = Number(price).toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(Number(price)) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const parts = [`${num} ${currency}`];
  if (unit) parts.push(`/ ${unit}`);
  return parts.join(' ');
}

/**
 * Build a launch-post payload for a product.
 *
 * @param {Object} input
 * @param {string} input.productId
 * @param {string} input.productName
 * @param {string} [input.categoryLabel]
 * @param {number} [input.price]
 * @param {string} [input.currency]
 * @param {string} [input.unit]
 * @param {string} [input.companyName]
 * @param {string} [input.country]
 * @returns {{ caption: string, hashtags: string[], ctaUrl: string }}
 */
function buildProductLaunchPost({
  productId,
  productName,
  categoryLabel,
  price,
  currency,
  unit,
  companyName,
  country,
}) {
  const ctaUrl = `${APP_URL}/product/${productId}`;

  // Body — keep punctuation minimal so it reads clean on all three
  // networks. Emoji lead each line so the caption survives even after
  // a network strips one or two decorations.
  const lines = [
    `🚀 New on CoreTradeGlobal — ${productName}`,
    '',
  ];
  if (categoryLabel) lines.push(`📦 ${categoryLabel}`);
  const priceStr = formatPrice(price, currency, unit);
  if (priceStr) lines.push(`💰 ${priceStr}`);
  if (companyName) {
    lines.push(`🏢 by ${companyName}${country ? ` (${country})` : ''}`);
  }
  lines.push('');
  lines.push('Explore this and thousands more B2B opportunities:');
  lines.push(ctaUrl);

  const caption = lines.join('\n');

  // Hashtag deck — always-present brand + trade tags, then dynamic
  // category + country tags where available. De-duped, capped at 8 so
  // LinkedIn's "hashtag spam" penalty stays off our back.
  const hashtags = [
    '#B2B',
    '#CoreTradeGlobal',
    toHashtag(categoryLabel),
    toHashtag(country),
    '#Wholesale',
    '#Import',
    '#Export',
    '#GlobalTrade',
  ]
    .filter(Boolean)
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    .slice(0, 8);

  return { caption, hashtags, ctaUrl };
}

module.exports = {
  buildProductLaunchPost,
  toHashtag,
  formatPrice,
};

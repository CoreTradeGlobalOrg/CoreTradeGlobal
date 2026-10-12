/**
 * Helpers for the RFQ Quotes view inside the admin Trades tab.
 */

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', TRY: '₺', JPY: '¥', CNY: '¥',
  AUD: 'A$', CAD: 'C$', INR: '₹', BRL: 'R$',
};

const PAYMENT_TERM_LABELS = {
  tt_100: 'T/T 100%',
  tt_30_70: 'T/T 30/70',
  lc: 'L/C',
  dp: 'D/P',
  cad: 'CAD',
  oa: 'Open Account',
  escrow: 'Escrow',
};

const SHIPPING_METHOD_LABELS = {
  sea_fcl: 'Sea FCL',
  sea_lcl: 'Sea LCL',
  air: 'Air',
  express: 'Express',
  road: 'Road',
  rail: 'Rail',
  multimodal: 'Multimodal',
};

export function toMillis(date) {
  if (!date) return 0;
  if (typeof date.toMillis === 'function') return date.toMillis();
  if (typeof date.seconds === 'number') return date.seconds * 1000;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function formatDate(date) {
  const ms = toMillis(date);
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPrice(price, currency) {
  if (price === null || price === undefined || price === '') return '—';
  const num = Number(price);
  if (Number.isNaN(num)) return String(price);
  const symbol = CURRENCY_SYMBOLS[currency] || (currency ? `${currency} ` : '$');
  return `${symbol}${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function humanize(value) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function paymentTermLabel(value) {
  return PAYMENT_TERM_LABELS[value] || humanize(value);
}

export function shippingMethodLabel(value) {
  return SHIPPING_METHOD_LABELS[value] || humanize(value);
}

/** Display name for a uid using the admin user list, with a short-id fallback. */
export function userLabel(userMap, uid, fallback) {
  const u = uid ? userMap[uid] : null;
  return u?.companyName || u?.displayName || fallback || (uid ? uid.slice(0, 8) : '—');
}

/** Lower-cased haystack for client-side search. */
export function searchText(...parts) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

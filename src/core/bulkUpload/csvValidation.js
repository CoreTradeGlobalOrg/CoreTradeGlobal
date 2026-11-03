/**
 * Bulk product CSV validation
 *
 * Shared between:
 *   - Admin BulkProductUpload (uploads on behalf of a member)
 *   - Member-facing /product/bulk page (self-serve)
 *
 * Keep this file **pure** — no React, no Firestore, no callables. It
 * takes plain data in (CSV rows + a categories list) and returns plain
 * data out (validated rows with per-field errors and a `category`
 * resolution) so both consumers can render their own UIs on top.
 *
 * CSV columns expected: Product Name, Category (optional), Price,
 * Currency, Quantity, Unit, Description.
 *
 * Note — self-serve members no longer paste image URLs into the CSV.
 * After the upload publishes, the /product/bulk success screen lets
 * them attach files directly per product. The admin path (which lets
 * an operator run an existing member's CSV that might still carry an
 * "Image URLs" column) is untouched and Cloud Function still honors
 * `row.imageUrls` when present.
 */

import { CURRENCIES } from '@/core/constants/currencies';

/** Valid 3-letter currency codes (USD, EUR, ...) */
export const VALID_CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.value));

/** CSV columns that MUST be present in the file header. */
export const REQUIRED_COLUMNS = ['Product Name', 'Price', 'Currency', 'Quantity', 'Unit'];

// Fiyat/stok boş, 0 ya da bu kelimeler: 0 kaydedilir, sitede "Negotiable" /
// "Contact for Stock" görünür. ("Negotiatable" yaygın yazım hatası.)
const PRICE_ZERO_WORDS = ['negotiable', 'negotiatable'];
const QUANTITY_ZERO_WORDS = ['contact for stock'];

/** Empty cell or one of `zeroWords` → 0; otherwise parseFloat (NaN when not a number). */
function readAmount(raw, zeroWords) {
  const text = raw === undefined || raw === null ? '' : String(raw).trim();
  if (text === '' || zeroWords.includes(text.toLowerCase())) return 0;
  return parseFloat(text);
}

/**
 * Build a case-insensitive lookup table from the Firestore categories
 * list so a CSV row's "Category" cell can resolve to the canonical
 * category value. Matches by value/name/label, and by the label with
 * any leading emoji/icon stripped ("🏭 Textile" → "Textile").
 *
 * @param {Array<{value: string, name?: string, label?: string}>} categories
 * @returns {Record<string, string>} lowercased key → canonical value
 */
export function buildCategoryMap(categories) {
  const map = {};
  (categories || []).forEach((c) => {
    if (!c.value) return;
    map[c.value.toLowerCase()] = c.value;
    if (c.name) map[c.name.toLowerCase()] = c.value;
    if (c.label) {
      map[c.label.toLowerCase()] = c.value;
      const stripped = c.label.replace(/^\S+\s+/, '').trim();
      if (stripped) map[stripped.toLowerCase()] = c.value;
    }
  });
  return map;
}

/**
 * Resolve a raw category cell into the canonical value, or null if
 * nothing matches — the UI can then show a category picker for that row.
 */
export function resolveCategory(raw, categoryMap) {
  if (!raw) return null;
  return categoryMap[raw.trim().toLowerCase()] || null;
}

/**
 * Validate a single parsed CSV row.
 *
 * Returns a normalized object with typed fields, an `errors` array,
 * `isValid` (true when there are no field errors — a missing category
 * doesn't fail, it's flagged via `needsCategoryPick`), and the original
 * raw row for display.
 *
 * @param {Record<string, string>} row  raw papaparse row keyed by header
 * @param {number} index                position in the file (0-indexed)
 * @param {Record<string, string>} categoryMap  from buildCategoryMap
 */
export function validateRow(row, index, categoryMap) {
  const errors = [];

  if (!row['Product Name']?.trim()) {
    errors.push('Product Name is required');
  }

  // Category is soft-optional — unresolved rows are surfaced to the
  // caller via `needsCategoryPick` so a dropdown can be shown per row.
  const resolvedCategory = resolveCategory(row['Category'], categoryMap);

  const price = readAmount(row['Price'], PRICE_ZERO_WORDS);
  if (isNaN(price) || price < 0) {
    errors.push('Price must be a number, "Negotiable", or left empty');
  }

  const currency = row['Currency']?.trim().toUpperCase();
  if (!currency || !VALID_CURRENCY_CODES.has(currency)) {
    errors.push(`Currency "${row['Currency'] || ''}" is not valid. Use a 3-letter code like USD, EUR.`);
  }

  // A blank quantity used to be an error because 0 read as "out of stock";
  // the product page now shows "Contact for Stock" for 0.
  const quantity = readAmount(row['Quantity'], QUANTITY_ZERO_WORDS);
  if (isNaN(quantity) || quantity < 0) {
    errors.push('Quantity must be a number, "Contact for stock", or left empty');
  }

  if (!row['Unit']?.trim()) {
    errors.push('Unit is required');
  }

  return {
    rowIndex: index,
    original: row,
    name: row['Product Name']?.trim() || '',
    category: resolvedCategory,
    price: !isNaN(price) ? price : null,
    currency: VALID_CURRENCY_CODES.has(currency) ? currency : null,
    quantity: !isNaN(quantity) ? quantity : null,
    unit: row['Unit']?.trim() || '',
    description: row['Description']?.trim() || '',
    // Kept optional for backwards-compat with admin-uploaded CSVs that
    // still carry the old "Image URLs" column. Self-serve members no
    // longer see this column in the downloaded template and attach
    // images through the post-publish uploader instead.
    imageUrls: row['Image URLs']?.trim() || '',
    errors,
    isValid: errors.length === 0,
    needsCategoryPick: !resolvedCategory && errors.length === 0,
  };
}

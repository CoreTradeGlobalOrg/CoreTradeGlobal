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
 * Currency, Quantity, Unit, Description, Image URLs.
 */

import { CURRENCIES } from '@/core/constants/currencies';

/** Valid 3-letter currency codes (USD, EUR, ...) */
export const VALID_CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.value));

/** CSV columns that MUST be present in the file header. */
export const REQUIRED_COLUMNS = ['Product Name', 'Price', 'Currency', 'Quantity', 'Unit'];

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

  const priceRaw = row['Price'];
  const hasPrice = priceRaw !== undefined && priceRaw !== null && String(priceRaw).trim() !== '';
  const price = hasPrice ? parseFloat(priceRaw) : null;
  if (hasPrice && (isNaN(price) || price < 0)) {
    errors.push('Price must be a non-negative number (0 or blank is allowed)');
  }

  const currency = row['Currency']?.trim().toUpperCase();
  if (!currency || !VALID_CURRENCY_CODES.has(currency)) {
    errors.push(`Currency "${row['Currency'] || ''}" is not valid. Use a 3-letter code like USD, EUR.`);
  }

  const quantityRaw = row['Quantity'];
  const hasQuantity = quantityRaw !== undefined && quantityRaw !== null && String(quantityRaw).trim() !== '';
  const quantity = hasQuantity ? parseFloat(quantityRaw) : null;
  if (hasQuantity && (isNaN(quantity) || quantity < 0)) {
    errors.push('Quantity must be a non-negative number (0 or blank is allowed)');
  }

  if (!row['Unit']?.trim()) {
    errors.push('Unit is required');
  }

  return {
    rowIndex: index,
    original: row,
    name: row['Product Name']?.trim() || '',
    category: resolvedCategory,
    price: price !== null && !isNaN(price) ? price : null,
    currency: VALID_CURRENCY_CODES.has(currency) ? currency : null,
    quantity: quantity !== null && !isNaN(quantity) ? quantity : null,
    unit: row['Unit']?.trim() || '',
    description: row['Description']?.trim() || '',
    imageUrls: row['Image URLs']?.trim() || '',
    errors,
    isValid: errors.length === 0,
    needsCategoryPick: !resolvedCategory && errors.length === 0,
  };
}

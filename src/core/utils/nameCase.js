/**
 * Name Case utilities.
 *
 * The single source of truth for how we normalize human-typed names:
 * user first/last names, company names, product titles, and RFQ
 * request titles. Called on save at every input site so DB rows are
 * always in Title Case regardless of how the user typed them
 * ("john doe" → "John Doe", "AHMET SIMSEK" → "AHMET SIMSEK" is left
 * alone — see notes).
 *
 * Rules:
 *   • Word boundaries = start-of-string, whitespace, hyphen (-), or
 *     apostrophe (', ’). "jean-paul" → "Jean-Paul", "o'brien" → "O'Brien".
 *   • Only the FIRST character of each word is touched. The rest of
 *     the word is left as-is so:
 *       - "CTG" stays "CTG"
 *       - "GmbH" stays "GmbH"
 *       - "McDonald" stays "McDonald"
 *       - "iPhone" becomes "IPhone" (acceptable edge case for name fields)
 *   • Uses `toLocaleUpperCase('tr-TR')` so Turkish input gets the
 *     right dotted-i / dotless-ı casing ("ilker" → "İlker", not "Ilker").
 *   • Collapses runs of whitespace to a single space, and trims edges.
 *   • Idempotent — running it twice produces the same output, so it's
 *     safe to call in migrations or double-normalize on save.
 */

const WORD_BOUNDARY = /(^|[\s\-'’])(\S)/g;

/**
 * Convert a name-shaped string to Title Case.
 * Returns the original value untouched if it's not a string with content.
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  if (typeof str !== 'string') return str;
  const cleaned = str.replace(/\s+/g, ' ').trim();
  if (!cleaned) return cleaned;
  return cleaned.replace(WORD_BOUNDARY, (_match, sep, char) =>
    sep + char.toLocaleUpperCase('tr-TR')
  );
}

/**
 * Apply toTitleCase to every listed key on an object in-place-safe
 * (returns a new object, does NOT mutate the input). Only touches
 * fields whose current value is a non-empty string; skips undefined
 * and other types so we never accidentally coerce a missing field
 * into an empty string.
 *
 * @param {Object} obj — source object
 * @param {string[]} keys — field names to normalize
 * @returns {Object} shallow copy with normalized fields
 */
export function normalizeNameFields(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const key of keys) {
    if (typeof out[key] === 'string' && out[key].trim().length > 0) {
      out[key] = toTitleCase(out[key]);
    }
  }
  return out;
}

export default toTitleCase;

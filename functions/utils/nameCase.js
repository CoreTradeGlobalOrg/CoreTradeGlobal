/**
 * Name Case utilities (Cloud Functions copy).
 *
 * Mirror of src/core/utils/nameCase.js — kept as a separate file so the
 * functions bundle doesn't try to import through Next.js path aliases.
 * Any edit here must be mirrored to the frontend util and vice versa.
 *
 * Rules recap:
 *   • Word boundaries = start-of-string, whitespace, hyphen (-), or
 *     apostrophe (', ’). "jean-paul" → "Jean-Paul", "o'brien" → "O'Brien".
 *   • Only the FIRST character of each word is touched. Rest is left
 *     as-is so acronyms (CTG, LLC) survive.
 *   • Uses `toLocaleUpperCase('tr-TR')` for correct Turkish casing.
 *   • Collapses whitespace + trims.
 *   • Idempotent — safe to run twice or in a migration loop.
 */

const WORD_BOUNDARY = /(^|[\s\-'’])(\S)/g;

function toTitleCase(str) {
  if (typeof str !== 'string') return str;
  const cleaned = str.replace(/\s+/g, ' ').trim();
  if (!cleaned) return cleaned;
  return cleaned.replace(WORD_BOUNDARY, (_match, sep, char) =>
    sep + char.toLocaleUpperCase('tr-TR')
  );
}

function normalizeNameFields(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const key of keys) {
    if (typeof out[key] === 'string' && out[key].trim().length > 0) {
      out[key] = toTitleCase(out[key]);
    }
  }
  return out;
}

module.exports = { toTitleCase, normalizeNameFields };

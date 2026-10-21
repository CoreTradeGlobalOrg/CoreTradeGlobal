/**
 * CurrencySymbol
 *
 * Renders a currency sign. Signs outside Inter's "latin" file (₹ ₺ ₩ ₽ …)
 * live in its latin-ext file, so showing a single ₹ price in Inter makes
 * the browser download another 84 KiB font on the homepage's critical path.
 * Those signs are drawn in the system font instead; $ € £ ¥ and plain codes
 * ("CHF", "A$") stay in Inter.
 */

// Inter's latin unicode-range: Latin-1 plus €.
const INTER_LATIN = /^[\u0000-\u00ff\u20ac]*$/;

const SYSTEM_FONT_STYLE = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export function CurrencySymbol({ symbol }) {
  if (!symbol || INTER_LATIN.test(symbol)) return symbol || null;
  return <span style={SYSTEM_FONT_STYLE}>{symbol}</span>;
}

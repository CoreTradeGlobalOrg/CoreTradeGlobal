/**
 * Card-size thumbnail URL for a product photo.
 *
 * The generateProductThumbnail Cloud Function writes a 640 px WebP copy of
 * every product photo next to the original (functions/utils/productThumbnail.js):
 *
 *   users/{uid}/products/{pid}/image-0.webp
 *   users/{uid}/products/{pid}/thumbs/image-0.webp
 *
 * so the thumb URL is derived from the original URL; there is no Firestore
 * field. storage.rules makes thumbs/ publicly readable, so the URL needs no
 * download token. `v` carries the original's token, which changes when the
 * photo is re-uploaded, so a cached thumb of the old photo is not reused.
 *
 * Returns the input unchanged for anything else (company logos, external
 * URLs, SVG/GIF). The thumb can be missing for a few seconds after an
 * upload: render it with ProductThumbImg, or handle onError, to fall back
 * to the original.
 */

const FIREBASE_URL = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?#]+)(?:\?([^#]*))?$/;
// Server-side bulk upload stores public GCS URLs.
const GCS_URL = /^https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?#]+)/;
const PRODUCT_IMAGE_PATH = /^users\/[^/]+\/products\/[^/]+\/[^/]+$/;
const SKIPPED_EXTENSIONS = /\.(svg|gif)$/i;

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function productThumbUrl(url) {
  if (typeof url !== 'string') return url;

  let bucket;
  let path;
  let token = null;
  let match = url.match(FIREBASE_URL);
  if (match) {
    [, bucket] = match;
    path = decode(match[2]);
    token = new URLSearchParams(match[3] || '').get('token');
  } else if ((match = url.match(GCS_URL))) {
    [, bucket] = match;
    path = decode(match[2]);
  } else {
    return url;
  }

  if (!path || !PRODUCT_IMAGE_PATH.test(path) || SKIPPED_EXTENSIONS.test(path)) return url;

  const slash = path.lastIndexOf('/');
  const thumbPath = `${path.slice(0, slash)}/thumbs/${path.slice(slash + 1)}`;
  const version = token ? `&v=${encodeURIComponent(token)}` : '';
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(thumbPath)}?alt=media${version}`;
}

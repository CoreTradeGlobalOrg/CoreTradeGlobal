/**
 * Product card thumbnails (shared by the storage triggers in index.js and
 * scripts/generate-product-thumbnails.js).
 *
 * Product photos are stored at up to 1200 px (~150-190 KiB). Cards show
 * them at ~280 px on desktop and full width (~412 px) on phones, so the
 * homepage was downloading ~1 MiB of photos for its first rows.
 *
 *   users/{uid}/products/{pid}/image-0.webp
 *   users/{uid}/products/{pid}/thumbs/image-0.webp   <- 640 px WebP copy
 *
 * The thumb keeps the original's file name (even for .jpg/.png originals;
 * contentType says image/webp), so the frontend derives its URL from the
 * original download URL without a Firestore field: see
 * src/lib/productThumbnail.js. Any change to the path layout must be
 * mirrored there. storage.rules makes thumbs/ publicly readable.
 */

const sharp = require('sharp');

const THUMB_DIR = 'thumbs';
const THUMB_MAX_PX = 640;
const THUMB_QUALITY = 75;
// The URL carries ?v=<download token>, which changes when the original is
// re-uploaded, so a week of caching cannot pin an outdated thumbnail to a
// new upload (only the same URL is cached).
const THUMB_CACHE_CONTROL = 'public, max-age=604800';

// Exactly users/{uid}/products/{pid}/{file}; never matches thumbs/ files.
const PRODUCT_IMAGE_PATH = /^users\/[^/]+\/products\/[^/]+\/[^/]+$/;

function isProductImagePath(name, contentType) {
  if (!PRODUCT_IMAGE_PATH.test(name || '')) return false;
  if (contentType && !contentType.startsWith('image/')) return false;
  // SVG and GIF (possibly animated) are shown as they are.
  if (contentType === 'image/svg+xml' || contentType === 'image/gif') return false;
  return true;
}

function thumbPathFor(name) {
  const slash = name.lastIndexOf('/');
  return `${name.slice(0, slash)}/${THUMB_DIR}/${name.slice(slash + 1)}`;
}

/**
 * Resize to fit inside THUMB_MAX_PX and encode as WebP. Returns the
 * original bytes when the re-encode is not smaller (small originals), so
 * the thumb is never worse than the image it replaces.
 *
 * @param {Buffer} input
 * @param {string} inputContentType
 * @returns {Promise<{ buffer: Buffer, contentType: string }>}
 */
async function makeThumbnail(input, inputContentType) {
  const output = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_MAX_PX, height: THUMB_MAX_PX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY, effort: 5 })
    .toBuffer();
  if (output.length < input.length) return { buffer: output, contentType: 'image/webp' };
  return { buffer: input, contentType: inputContentType || 'image/webp' };
}

module.exports = {
  THUMB_CACHE_CONTROL,
  isProductImagePath,
  thumbPathFor,
  makeThumbnail,
};

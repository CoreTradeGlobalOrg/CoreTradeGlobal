/**
 * Image utilities — client-side compression before upload.
 *
 * Users routinely upload 1500x1500 phone-camera assets for a 64x64 avatar
 * slot. Running the file through browser-image-compression here shrinks it
 * to the display target before it ever touches Firebase Storage, cutting
 * both bandwidth and Storage bill.
 *
 * Consumers pass a File / Blob and receive a compressed File back. If the
 * source is not an image (or compression fails) the original file is
 * returned unchanged so uploads never fail because of the optimizer.
 */

import imageCompression from 'browser-image-compression';

const PRESETS = {
  // Company logos and profile avatars — small display, aggressive resize.
  logo: {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 800,
    initialQuality: 0.85,
    useWebWorker: true,
    fileType: 'image/webp',
  },
  // Product photos — bigger, higher quality since users zoom.
  product: {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1200,
    initialQuality: 0.82,
    useWebWorker: true,
    fileType: 'image/webp',
  },
  // Fair / news banners.
  banner: {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: 'image/webp',
  },
};

export async function compressImage(file, preset = 'logo') {
  if (!file || !(file instanceof Blob)) return file;
  if (!file.type?.startsWith('image/')) return file;
  // Never touch SVGs — vector, tiny, and browser-image-compression can't rasterize them safely.
  if (file.type === 'image/svg+xml') return file;

  const options = PRESETS[preset] || PRESETS.logo;

  try {
    const compressed = await imageCompression(file, options);
    if (process.env.NODE_ENV === 'development') {
      const before = (file.size / 1024).toFixed(1);
      const after = (compressed.size / 1024).toFixed(1);
      // eslint-disable-next-line no-console
      console.log(`[compressImage:${preset}] ${before} KiB → ${after} KiB`);
    }
    return compressed;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[compressImage] failed, uploading original:', err);
    return file;
  }
}

export default compressImage;

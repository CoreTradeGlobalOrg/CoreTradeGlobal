/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental.optimizeCss (Critters) was tried here but is a
  // Pages-Router-only feature — Next.js App Router's render pipeline
  // never calls postProcessHTML, so the flag silently no-ops (verified:
  // 0 grep hits for postProcessHTML in node_modules/next/dist/server/
  // app-render/). Removed the flag and the `critters` devDep to stop
  // shipping dead config. Critical-CSS inlining on the LCP path is
  // still handled by the `<style dangerouslySetInnerHTML>` block in
  // src/app/layout.js (sticky-footer + tagline + homepage reservation).
  images: {
    // Global bypass of the Vercel Image Optimizer. Every user upload
    // now arrives WebP-compressed (src/lib/image-utils.js on the client)
    // or was recompressed in place by scripts/compress-storage-images.js
    // on the historical backfill, so the CDN in front of Firebase
    // Storage serves right-sized bytes directly. The optimizer added
    // no value beyond avif/webp transcoding we already do at rest, and
    // its per-month quota is what was driving the recurring HTTP 402
    // outages on hero placements. remotePatterns / deviceSizes /
    // imageSizes are left in place as documentation of the previous
    // rendering matrix — they're no-ops while unoptimized is true.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'media.licdn.com' },
    ],
    deviceSizes: [360, 640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 80, 96, 128, 200, 256, 384, 512],
    formats: ['image/avif', 'image/webp'],
  },
  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

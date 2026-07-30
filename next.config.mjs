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
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'media.licdn.com' },
    ],
    // Tighter breakpoints closer to the actual card sizes we render.
    // Defaults are deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048,
    // 3840] and imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]. That
    // matrix left big gaps in the small-thumbnail range: a 200 px card
    // rounded up to 384, and a 500 px mobile hero rounded up to 828.
    // Adds 360 (min mobile viewport), 80/200/512 (common thumbnail /
    // hero widths) and drops 2048/3840 (nothing on our pages renders at
    // 2K+ except a rare desktop hero — no need to keep 2 extra AVIF
    // variants around per image). Lighthouse flagged ~668 KiB of
    // image-oversize on the homepage against this exact gap.
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

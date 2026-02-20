# Technology Stack

**Analysis Date:** 2026-02-20

## Languages

**Primary:**
- JavaScript/TypeScript (JSX/TSX) - Used for client components, pages, and server-side logic

**Tooling:**
- JSDoc comments for type annotations without TypeScript compiler

## Runtime

**Environment:**
- Node.js 20 (specified in `functions/package.json`)
- Next.js 16.1.4 - Full-stack React framework with file-based routing and API routes

**Package Manager:**
- npm (npm workspaces for monorepo structure)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.4 - App Router (modern Next.js version with server/client components)
- React 19.1.0 - UI library
- React DOM 19.1.0 - DOM rendering

**Backend/Functions:**
- Firebase Functions v5.0.0 (`functions/package.json`)
- Firebase Admin SDK 12.0.0 and 13.6.1 - Privileged server operations

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- PostCSS 4 - CSS transformation
- @tailwindcss/postcss - Tailwind PostCSS plugin

**Form Handling:**
- React Hook Form 7.66.0 - Performant form state management
- @hookform/resolvers 5.2.2 - Schema validation integration
- Zod 4.1.12 - Runtime type checking and validation

**UI Components:**
- Lucide React 0.560.0 - Icon library (SVG icons)
- React Hot Toast 2.6.0 - Toast notifications
- Country Flag Icons 1.5.21 - Country flag components

**Animation & Graphics:**
- Framer Motion 12.33.0 - Complex animations and gestures
- Three.js 0.182.0 - 3D graphics library
- @react-three/fiber 9.5.0 - React renderer for Three.js
- @react-three/drei 10.7.7 - Three.js helpers and components

**Authentication:**
- Firebase 12.4.0 - Client SDK (auth, firestore, storage, analytics)
- Google reCAPTCHA via react-google-recaptcha 3.1.0 - Bot protection

**Utilities:**
- libphonenumber-js 1.12.26 - Phone number formatting and validation
- qs 6.14.2 (in functions) - Query string parsing

## Key Dependencies

**Critical:**
- Firebase 12.4.0 - Primary data storage and authentication platform
- Firebase Admin 12.0.0 / 13.6.1 - Server-side operations, Cloud Messaging, user management
- Firebase Functions 5.0.0 - Serverless compute for backend logic

**Infrastructure:**
- Next.js 16.1.4 - Provides deployment, routing, and build optimization
- React 19.1.0 - Core UI rendering

## Configuration

**Environment:**
- `.env.local` - Local development environment variables
- `.env` - Shared environment variables
- Environment variables are prefixed with `NEXT_PUBLIC_` for client-side access

**Build:**
- `next.config.mjs` - Next.js configuration with security headers
  - DNS prefetch enabled
  - Strict-Transport-Security enabled (63 days)
  - XSS protection enabled
  - Clickjacking protection (SAMEORIGIN)
  - Permissions policy: camera, microphone, geolocation disabled
- `tailwind.config.js` - Tailwind color customization (cream, warmBrown palettes)
- `postcss.config.mjs` - PostCSS plugin configuration
- `jsconfig.json` - Path alias configuration (`@/*` → `./src/*`)
- `.eslintrc* / eslint.config.mjs` - ESLint rules extending `next/core-web-vitals`
- `firebase.json` - Firebase deployment configuration (functions and firestore rules)

## Platform Requirements

**Development:**
- Node.js 20 (enforced in functions)
- npm for package management
- Firebase CLI for local development and deployment
- Browser with WebGL support for Three.js globe component

**Production:**
- Deployment: Firebase Hosting (Web) + Firebase Functions (Backend)
- Database: Cloud Firestore
- File Storage: Firebase Storage
- Push Notifications: Firebase Cloud Messaging (FCM)
- Email Delivery: Firebase Authentication (email verification)

---

*Stack analysis: 2026-02-20*

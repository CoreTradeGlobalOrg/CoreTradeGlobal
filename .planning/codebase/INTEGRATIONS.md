# External Integrations

**Analysis Date:** 2026-02-20

## APIs & External Services

**Bot Protection:**
- Google reCAPTCHA v3 - Bot protection on registration form
  - SDK/Client: `react-google-recaptcha` 3.1.0
  - Auth: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (test key in example: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`)
  - Usage: `src/presentation/components/features/auth/RegisterForm/RegisterForm.jsx`
  - Note: Test key validation with production warning

**Analytics & Tracking:**
- Google Analytics 4
  - Measurement ID: `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
  - Integration: Google Tag Manager (gtag.js)
  - Used in: `src/app/layout.js` - Global page view tracking
  - Also tracked via Firebase Analytics SDK

**Email & Communication:**
- Firebase Authentication Email - Account registration and password reset
  - Used in: Custom auth flow in `src/data/datasources/firebase/FirebaseAuthDataSource`

**Search Engine Optimization:**
- Google Site Verification
  - Env var: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
  - Used in: `src/app/layout.js` for meta tag

## Data Storage

**Primary Database:**
- Cloud Firestore (Firebase)
  - Connection: Environment variables `NEXT_PUBLIC_FIREBASE_*`
  - Client initialization: `src/core/config/firebase.config.js`
  - Server initialization: `src/lib/firebase-admin.js`
  - Collections: users, products, requests, categories, fairs, news, conversations, messages, notifications, newsletter
  - Access Pattern: DI container at `src/core/di/container.js`
  - Repositories for: Auth, User, Product, Request, Category, Fairs, News, Conversation, Message, Notification

**File Storage:**
- Firebase Cloud Storage
  - Bucket: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - Usage:
    - User profile photos: `users/{userId}/`
    - Product images: `products/{userId}/`
    - Company logos during registration
  - Client SDK: `firebase/storage` via `src/core/config/firebase.config.js`
  - Data Source: `src/data/datasources/firebase/FirebaseStorageDataSource`

**Caching:**
- None detected (no Redis, Memcached, or similar)

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Supported methods:
    - Email/Password (custom implementation)
    - Email verification required for account activation
    - Role-based access control (admin, user roles)
  - Implementation: `src/data/datasources/firebase/FirebaseAuthDataSource`
  - Session management: `src/app/api/auth/session/route.js`
  - Security: HttpOnly cookies for session tokens, secure flag in production
  - Admin verification: `functions/index.js` - `isUserAdmin()` function checks Firestore user.role

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, DataDog, or equivalent)
- Console logging for Cloud Functions

**Logs:**
- Firebase Functions Logs
  - Viewed via: `firebase functions:log`
  - Implementation: Console.log/error throughout functions

**Push Notifications:**
- Firebase Cloud Messaging (FCM)
  - User tokens stored in Firestore user documents (`fcmToken` field)
  - Implementation: `functions/index.js` - `sendMessageNotification` trigger
  - Data-only payloads (no automatic notification display)
  - Triggered on new messages in conversations
  - Token cleanup for invalid registrations
  - Service worker handling: `src/presentation/hooks/usePushNotifications.js`
  - VAPID key: `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

## CI/CD & Deployment

**Hosting:**
- Firebase Hosting (Web)
  - Project: `core-trade-global`
  - Configuration: `firebase.json`

**Cloud Functions:**
- Firebase Functions v5 deployment
  - Source: `functions/` directory
  - Deploy command: `firebase deploy --only functions`
  - Emulator support: `firebase emulators:start --only functions`
  - Shell: `firebase functions:shell`

**Firestore:**
- Firestore Database with security rules
  - Rules file: `firestore.rules`
  - Indexes file: `firestore.indexes.json`
  - Deployment: `firebase deploy --only firestore:rules`

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, or equivalent configured)

## Environment Configuration

**Required env vars:**

**Firebase (Public):**
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Cloud Storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - FCM sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Google Analytics measurement ID
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` - FCM VAPID key for web push

**Security & Keys (Private):**
- `FIREBASE_SERVICE_ACCOUNT_KEY` - JSON service account key (server-side only)
  - Used in: `src/lib/firebase-admin.js` for server-side operations
  - Required for: Token verification, admin operations

**Third-party Services:**
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Google reCAPTCHA site key
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` - Google site verification token
- `NEXT_PUBLIC_APP_NAME` - App name (default: "CoreTradeGlobal")
- `NEXT_PUBLIC_NEWSLETTER_COLLECTION` - Firestore collection for newsletter signups (default: "newsletter")

**Secrets location:**
- `.env` - Committed shared config (public Firebase keys)
- `.env.local` - Local development secrets (NOT committed)
- `.env.local.example` - Template for required env vars (example: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)

## Webhooks & Callbacks

**Incoming:**
- Firebase Authentication email verification callback
- No external webhook endpoints detected

**Outgoing:**
- Google Analytics events (via gtag.js and Firebase SDK)
- Firebase Cloud Messaging push notification payload delivery
- Firestore real-time listener subscriptions (not HTTP webhooks, but real-time updates)

## Scheduled Tasks

**Cloud Functions Scheduled Triggers:**

1. **Fair Status Auto-Update** (`updateFairStatuses`)
   - Schedule: `0 0,12 * * *` (UTC midnight and noon)
   - Timezone: UTC
   - Retry: 3 attempts
   - Function: Updates fair status (upcoming/ongoing/past) based on date ranges
   - Location: `functions/index.js`

2. **Message Notifications** (`sendMessageNotification`)
   - Trigger: Firestore document creation
   - Collection: `conversations/{conversationId}/messages/{messageId}`
   - Function: Sends FCM push notifications to conversation participants
   - Location: `functions/index.js`

## Data Flow Patterns

**User Registration:**
1. Client submits registration form with reCAPTCHA token
2. Frontend calls Firebase Auth endpoint
3. Server validates via `FirebaseAuthDataSource`
4. User document created in Firestore
5. Profile photo stored in Firebase Storage
6. Email verification sent

**Messaging:**
1. User sends message → Stored in `conversations/{id}/messages` collection
2. Firestore trigger (`onDocumentCreated`) fires
3. Cloud Function retrieves recipient FCM tokens
4. Push notifications sent to recipients
5. Invalid tokens cleaned up from Firestore

**Admin Operations:**
1. Admin action request sent from client
2. Cloud Function verifies `auth.uid` against Firestore user.role
3. Operation executed with elevated permissions
4. Changes written to Firestore
5. Logs recorded in Firebase Functions console

---

*Integration audit: 2026-02-20*

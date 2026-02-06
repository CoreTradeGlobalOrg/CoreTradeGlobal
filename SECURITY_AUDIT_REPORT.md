# Security Audit Report

**Project:** CoreTradeGlobal (B2B Trading Platform)
**Date:** February 6, 2026
**Scope:** Full codebase review - Firebase, Authentication, API Security, Client-side Security
**Auditor:** Security Audit Agent

---

## Executive Summary

This security audit of the CoreTradeGlobal Next.js B2B trading platform identified **2 Critical**, **4 High**, **3 Medium**, and **5 Low** severity vulnerabilities. The most severe issues involve an unauthenticated session endpoint that allows privilege escalation and environment files committed to the repository. Immediate attention is required for the Critical findings.

---

## Risk Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 4 |
| Medium | 3 |
| Low | 5 |
| Informational | 3 |

---

## Findings

### [FINDING-001] Unauthenticated Session API Allows Privilege Escalation

- **Severity:** Critical
- **Category:** Authentication / Authorization Bypass
- **CWE:** CWE-287 (Improper Authentication), CWE-269 (Improper Privilege Management)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/api/auth/session/route.js:11-38`

**Description:** The session API endpoint accepts arbitrary user data (uid, role, email) without any verification. An attacker can craft a POST request with any uid and role (including "admin") to create a valid session cookie, completely bypassing authentication.

**Evidence:**
```javascript
// POST - Set session cookie
export async function POST(request) {
  try {
    const { uid, role, email } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 });
    }

    // Create session data - NO VERIFICATION OF THE CLAIMS
    const sessionData = JSON.stringify({ uid, role, email });

    // Set HttpOnly cookie (can't be accessed by JavaScript)
    response.cookies.set('session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
```

**Impact:** Complete authentication bypass. Any attacker can:
1. Impersonate any user by setting their uid
2. Gain admin privileges by setting `role: 'admin'`
3. Access all protected routes and admin dashboard
4. Perform any admin action (ban users, delete accounts, manage content)

**Exploitation Scenario:**
```bash
curl -X POST https://coretradeglobal.com/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"uid":"attacker-fake-id","role":"admin","email":"attacker@evil.com"}'
```

**Remediation:**
The session API must verify the Firebase ID token server-side before setting the session cookie:

```javascript
import { getAuth } from 'firebase-admin/auth';

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    // Verify the ID token with Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(idToken);

    // Get user data from Firestore to get role
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    const sessionData = JSON.stringify({
      uid: decodedToken.uid,
      role: userData?.role || 'user',
      email: decodedToken.email,
    });
    // ... set cookie
  }
}
```

**References:**
- [OWASP Broken Authentication](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)

---

### [FINDING-002] Environment Files with Secrets Committed to Repository

- **Severity:** Critical
- **Category:** Data Exposure / Secrets Management
- **CWE:** CWE-798 (Use of Hard-coded Credentials), CWE-312 (Cleartext Storage of Sensitive Information)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/.env` and `/Users/wenubey/Desktop/CTG/core-trade-global/.env.local`

**Description:** Active environment files containing API keys and secrets are present in the repository despite `.env*` being in `.gitignore`. These files exist on disk and are accessible.

**Evidence:**
```
# Contents of .env and .env.local files:
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCcaUZDmLXsHFthz3Se1a4EbULPVwjsdJA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI  # This is Google's test key
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BC7oefbQUKMipakXLGLQslH4roury0FB-txddeZrYZrURygOasDGa9jlOl7dDlsxtd6DaAHuJdn5DyIF_4kWmis
```

**Impact:**
- Firebase API keys exposed (though Firebase keys are designed for client-side use, they should still be restricted)
- VAPID key for push notifications exposed
- reCAPTCHA key exposed (currently using Google's test key `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`)

**Remediation:**
1. Rotate all exposed keys immediately
2. Use proper secrets management (Vercel Environment Variables, etc.)
3. Ensure `.env` files are never committed - verify with `git ls-files | grep .env`
4. Replace the test reCAPTCHA key with a production key
5. Configure Firebase API key restrictions in the Google Cloud Console

---

### [FINDING-003] Hardcoded Firebase Configuration in Service Worker

- **Severity:** High
- **Category:** Data Exposure / Configuration Management
- **CWE:** CWE-798 (Use of Hard-coded Credentials)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/public/firebase-messaging-sw.js:11-19`

**Description:** Firebase configuration including API key is hardcoded directly in the service worker file, which is publicly accessible.

**Evidence:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCcaUZDmLXsHFthz3Se1a4EbULPVwjsdJA",
  authDomain: "core-trade-global.firebaseapp.com",
  projectId: "core-trade-global",
  storageBucket: "core-trade-global.firebasestorage.app",
  messagingSenderId: "697939085347",
  appId: "1:697939085347:web:02f2f463a23d4e7f60c996",
  measurementId: "G-MV8N1HJ29Q"
};
```

**Impact:** While Firebase client-side API keys are semi-public by design, hardcoding them makes key rotation difficult and increases attack surface.

**Remediation:**
1. Configure Firebase API key restrictions in Google Cloud Console
2. Consider generating the service worker at build time with environment variables
3. Add domain/referrer restrictions to the API key

---

### [FINDING-004] Unprotected Admin API Route - Seed Categories

- **Severity:** High
- **Category:** Broken Access Control
- **CWE:** CWE-862 (Missing Authorization)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/api/seed-categories/route.js:30-79`

**Description:** The seed-categories API endpoint has no authentication or authorization checks. Anyone can call it to seed categories or view existing categories.

**Evidence:**
```javascript
export async function POST() {
  try {
    const firestoreDataSource = container.getFirestoreDataSource();
    const categoryRepository = container.getCategoryRepository();
    // No authentication check!
    // Anyone can call this endpoint
```

**Impact:**
- Attackers can view all categories (information disclosure)
- Potential for abuse if multiple seed attempts affect data integrity
- Administrative functionality exposed to unauthenticated users

**Remediation:**
```javascript
export async function POST(request) {
  // Verify admin authentication
  const session = request.cookies.get('session')?.value;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionData = JSON.parse(session);
  if (sessionData.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... rest of code
}
```

---

### [FINDING-005] Weak Password Policy

- **Severity:** High
- **Category:** Authentication
- **CWE:** CWE-521 (Weak Password Requirements)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/core/validation/registerSchema.js:79-82`

**Description:** The password validation only requires 6 characters minimum with no complexity requirements (uppercase, lowercase, numbers, special characters).

**Evidence:**
```javascript
password: z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long'),
```

**Impact:** Users can create weak passwords like "123456" or "password" which are easily brute-forced or guessed.

**Remediation:**
```javascript
password: z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
```

---

### [FINDING-006] Missing Rate Limiting on Authentication Endpoints

- **Severity:** High
- **Category:** Authentication / Denial of Service
- **CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)
- **Location:** Multiple files - Login, Register, Forgot Password, Session API

**Description:** There is no rate limiting on authentication-related endpoints. Attackers can perform unlimited:
- Login attempts (brute force)
- Registration attempts (spam accounts)
- Password reset requests (email bombing)
- Session creation requests

**Evidence:**
No rate limiting middleware or implementation found in:
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/api/auth/session/route.js`
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/presentation/components/features/auth/LoginForm/LoginForm.jsx`
- `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/(auth)/forgot-password/page.jsx`

**Impact:**
- Credential stuffing and brute force attacks possible
- Account enumeration via password reset
- Service disruption through resource exhaustion
- Spam account creation

**Remediation:**
1. Implement rate limiting middleware for all auth endpoints
2. Use Firebase's built-in rate limiting for authentication
3. Add CAPTCHA for repeated failures
4. Implement account lockout after failed attempts

```javascript
// Example using upstash/ratelimit
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
});

// In API route
const ip = request.headers.get('x-forwarded-for') || 'anonymous';
const { success } = await ratelimit.limit(ip);
if (!success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

---

### [FINDING-007] Firestore Rules Allow Any Authenticated User to Create Notifications for Others

- **Severity:** Medium
- **Category:** Broken Access Control / IDOR
- **CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/firestore.rules:117-118`

**Description:** The notification subcollection allows any authenticated user to create notifications for any other user.

**Evidence:**
```javascript
// User notifications subcollection
match /users/{userId}/notifications/{notificationId} {
  // Users can read their own notifications
  allow read: if isOwner(userId);

  // System/Admin can create notifications for any user
  allow create: if isAuthenticated();  // <-- Any authenticated user can create!
```

**Impact:**
- Attackers can spam any user with fake notifications
- Potential for phishing through fake system notifications
- UI/UX disruption for users

**Remediation:**
```javascript
// Only the system (Cloud Functions) or admins should create notifications
allow create: if isAdmin() || request.auth.token.admin == true;
```
Note: System notifications should be created via Cloud Functions with admin SDK.

---

### [FINDING-008] Newsletter Collection Allows Public Unauthenticated Writes

- **Severity:** Medium
- **Category:** Abuse Prevention / Input Validation
- **CWE:** CWE-799 (Improper Control of Interaction Frequency)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/firestore.rules:127-133`

**Description:** Anyone can write to the newsletter collection without authentication or rate limiting, enabling spam attacks.

**Evidence:**
```javascript
// Newsletter collection (public create for subscriptions)
match /newsletter/{subscriberId} {
  allow read: if isAdmin();
  allow create: if true;  // <-- Public, unauthenticated access
```

**Impact:**
- Database spam/pollution with fake entries
- Potential cost increase for database operations
- No protection against automated abuse

**Remediation:**
1. Add rate limiting via Cloud Functions
2. Implement CAPTCHA verification
3. Consider requiring email verification before storing

---

### [FINDING-009] Test reCAPTCHA Key in Production Configuration

- **Severity:** Medium
- **Category:** Configuration / Security Control Bypass
- **CWE:** CWE-1188 (Insecure Default Initialization of Resource)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/.env.local:15`

**Description:** The reCAPTCHA site key in `.env.local` is Google's publicly known test key which always passes validation, providing no bot protection.

**Evidence:**
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```
This is Google's well-documented test key that always returns success.

**Impact:**
- Registration form has no bot protection
- Automated account creation possible
- Spam and abuse not prevented

**Remediation:**
1. Register for a production reCAPTCHA key at https://www.google.com/recaptcha/admin
2. Update the environment variable with the production key
3. Ensure the secret key is also properly configured server-side

---

### [FINDING-010] Contact Form Without Rate Limiting or CAPTCHA

- **Severity:** Low
- **Category:** Abuse Prevention
- **CWE:** CWE-799 (Improper Control of Interaction Frequency)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/(main)/contact/page.js`

**Description:** The contact form can be submitted repeatedly without rate limiting or CAPTCHA protection.

**Evidence:**
```javascript
const handleSubmit = async (e) => {
    e.preventDefault();
    // No rate limiting or CAPTCHA check
    if (!formData.name || !formData.email || !formData.message) {
        toast.error('Please fill in all required fields');
        return;
    }
    await sendContactMessage({...});
```

**Impact:**
- Email bombing of the support inbox
- Database spam with fake contact messages
- Potential denial of service

**Remediation:**
Add reCAPTCHA to the contact form and implement server-side rate limiting.

---

### [FINDING-011] Client-Side Admin Check Can Be Bypassed

- **Severity:** Low
- **Category:** Authorization
- **CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/admin/page.jsx:33-41`

**Description:** The admin page relies on client-side JavaScript to check admin status. While middleware provides server-side protection for route access, the client-side check is redundant and could give false security confidence.

**Evidence:**
```javascript
// Auth check - redirect if not admin
useEffect(() => {
  if (!authLoading) {
    if (!isAuthenticated) {
      router.replace('/login?redirect=/admin');
    } else if (user?.role !== 'admin') {
      router.replace('/');
    }
  }
}, [authLoading, isAuthenticated, user, router]);
```

**Impact:** Low - the middleware provides the actual protection, but this pattern could lead to security issues if developers rely solely on client-side checks.

**Remediation:** The middleware protection is correct. Ensure all admin operations also validate admin status in Firestore rules and Cloud Functions (which is already done correctly in `functions/index.js`).

---

### [FINDING-012] Verbose Error Messages in API Responses

- **Severity:** Low
- **Category:** Information Disclosure
- **CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/api/seed-categories/route.js:76`

**Description:** Error messages expose internal error details to clients.

**Evidence:**
```javascript
} catch (error) {
    console.error('Error seeding categories:', error);
    return NextResponse.json({
      success: false,
      error: error.message  // <-- Exposes internal error message
    }, { status: 500 });
}
```

**Impact:** Error messages may reveal internal implementation details, database structure, or stack traces.

**Remediation:**
```javascript
return NextResponse.json({
  success: false,
  error: 'An internal error occurred. Please try again later.'
}, { status: 500 });
```
Log detailed errors server-side only.

---

### [FINDING-013] Missing Security Headers

- **Severity:** Low
- **Category:** Configuration / Defense in Depth
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/next.config.mjs`

**Description:** The application does not configure security headers like Content-Security-Policy, X-Frame-Options, or Strict-Transport-Security.

**Evidence:**
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

**Impact:**
- Potential for clickjacking attacks (no X-Frame-Options)
- XSS attacks have higher impact (no CSP)
- No HTTPS enforcement (no HSTS)

**Remediation:**
```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com; ..." },
        ],
      },
    ];
  },
};
```

---

### [FINDING-014] Session Cookie Not Signed/Encrypted

- **Severity:** Low
- **Category:** Session Management
- **CWE:** CWE-565 (Reliance on Cookies without Validation and Integrity Checking)
- **Location:** `/Users/wenubey/Desktop/CTG/core-trade-global/src/app/api/auth/session/route.js:26`

**Description:** The session cookie contains plain JSON data that is not signed or encrypted. While httpOnly prevents JavaScript access, the cookie can still be manipulated by intercepting/modifying requests.

**Evidence:**
```javascript
const sessionData = JSON.stringify({ uid, role, email });
response.cookies.set('session', sessionData, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // No signature or encryption
});
```

**Impact:** Combined with FINDING-001, this allows complete session forgery. Even if FINDING-001 is fixed, unsigned cookies can be tampered with.

**Remediation:**
Use a proper session management library like `iron-session` or `jose` for encrypted/signed cookies:
```javascript
import { sealData, unsealData } from 'iron-session';

const sealedData = await sealData(sessionData, {
  password: process.env.SESSION_SECRET, // 32+ char secret
});
```

---

## Informational Findings

### [INFO-001] Firebase Client API Keys in Client-Side Code

Firebase client-side API keys are intentionally public and protected by Firebase Security Rules. However:
- Ensure API key restrictions are configured in Google Cloud Console
- Restrict to specific domains
- Enable Firebase App Check for additional protection

### [INFO-002] Console Logging of Sensitive Operations

Multiple files contain `console.log` statements that log user data, file uploads, and authentication events. While useful for development, these should be removed or conditioned for production.

### [INFO-003] No Content Security Policy

Consider implementing a strict CSP to prevent XSS attacks. This is especially important for a B2B platform handling sensitive business data.

---

## Positive Observations

1. **Good Firestore Security Rules Structure** - The rules properly validate ownership for products, requests, and conversations. The `isOwner()` and `isAdmin()` helper functions are well-implemented.

2. **Proper Authorization in Cloud Functions** - The cloud functions correctly verify admin status by checking Firestore, not just auth tokens.

3. **Input Validation with Zod** - The application uses Zod schemas for form validation, providing type-safe validation on the client side.

4. **Ownership Checks in Use Cases** - The `UpdateProductUseCase` and `DeleteProductUseCase` properly verify ownership before allowing modifications.

5. **Soft Delete Pattern** - User deletion uses a soft-delete pattern with recovery period, which is a good practice.

6. **reCAPTCHA on Registration** - Registration form includes reCAPTCHA (though needs production key).

7. **No Known Vulnerable Dependencies** - `npm audit` shows no known vulnerabilities in dependencies.

8. **Temporary Email Domain Blocking** - Registration blocks known temporary email domains.

9. **HttpOnly Session Cookies** - Cookies are properly marked as httpOnly and secure in production.

---

## Recommendations Summary (Priority Order)

### Immediate (Critical - Fix within 24-48 hours)
1. **Fix Session API** (FINDING-001) - Add Firebase ID token verification
2. **Rotate Exposed Keys** (FINDING-002) - Regenerate all API keys and secrets
3. **Secure Seed Categories API** (FINDING-004) - Add admin authentication

### High Priority (Fix within 1 week)
4. **Strengthen Password Policy** (FINDING-005) - Add complexity requirements
5. **Implement Rate Limiting** (FINDING-006) - Protect all auth endpoints
6. **Use Production reCAPTCHA** (FINDING-009) - Replace test key

### Medium Priority (Fix within 2 weeks)
7. **Fix Notification Rules** (FINDING-007) - Restrict notification creation
8. **Add Newsletter Protection** (FINDING-008) - Rate limiting and validation
9. **Add Security Headers** (FINDING-013) - Configure CSP, HSTS, etc.

### Low Priority (Fix within 1 month)
10. **Sign/Encrypt Session Cookies** (FINDING-014)
11. **Sanitize Error Messages** (FINDING-012)
12. **Add Contact Form Protection** (FINDING-010)

---

## Appendix: Files Reviewed

| File Path | Type | Notes |
|-----------|------|-------|
| `/src/app/api/auth/session/route.js` | API Route | Critical vulnerability |
| `/src/app/api/seed-categories/route.js` | API Route | Missing auth |
| `/firestore.rules` | Security Rules | Mostly good, one issue |
| `/middleware.js` | Middleware | Correct implementation |
| `/src/presentation/contexts/AuthContext.jsx` | Context | Reviewed |
| `/src/core/validation/*.js` | Validation | Reviewed schemas |
| `/src/data/repositories/*.js` | Repositories | Reviewed |
| `/src/domain/usecases/**/*.js` | Use Cases | Reviewed |
| `/functions/index.js` | Cloud Functions | Well implemented |
| `.env`, `.env.local` | Environment | Exposed secrets |
| `/public/firebase-messaging-sw.js` | Service Worker | Hardcoded config |

---

*Report generated on February 6, 2026*

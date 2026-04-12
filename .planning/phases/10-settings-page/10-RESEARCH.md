# Phase 10: Settings Page - Research

**Researched:** 2026-04-12
**Domain:** Next.js settings page, Firebase TOTP MFA, Firestore preferences, navbar dropdown, profile page refactor
**Confidence:** HIGH

## Summary

Phase 10 creates a dedicated `/settings` page and migrates account-management functionality (password change, account deletion, logout) off the 1075-line profile page. It adds new functionality: TOTP-based two-factor authentication via Firebase's built-in `multiFactor` API, notification preferences stored in the existing user Firestore document, and email subscription toggles that read/write the Phase 9 `unsubscribes` collection. The navbar gets a user dropdown with avatar + name trigger and a transparent-background bug fix.

The codebase already has all the building blocks: `useDeleteAccount`, `useLogout`, `useForgotPassword`, `ConfirmDialog`, `Button`, `Input`, and the Phase 9 `/api/unsubscribe` + `/api/resubscribe` routes. The biggest new technical piece is Firebase TOTP MFA enrollment, which is fully supported in the installed Firebase 12.9.0 package via `TotpMultiFactorGenerator` and `TotpSecret` (confirmed present in `node_modules`).

Firebase does not provide built-in backup/recovery codes for TOTP. Recovery codes must be generated client-side (crypto.randomBytes or similar), displayed once, and stored hashed in Firestore. This is a custom implementation concern that the CONTEXT.md acknowledges (8-10 codes, download mechanism at planner's discretion).

**Primary recommendation:** Build the settings page as a single `'use client'` page with co-located sub-components per the Phase 7 pattern. Use `next/dynamic` with `ssr:false` for the 2FA setup panel (QR code library). Enable TOTP MFA in Firebase Console (Identity Platform config) before the feature is tested.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page layout & structure**
- Single scrollable page with vertical stacked glass-card sections (matches existing profile page pattern)
- Full width layout (same as other pages)
- Compact user header at top: small avatar + name + email for account context
- "Back to Profile" link above the header
- Section icons next to each section title (lock for security, bell for notifications, etc.)
- Danger Zone (account deletion) at the very bottom with red-tinted border — matches existing profile pattern
- Toast notifications (react-hot-toast) for all save/success confirmations — consistent with rest of app

**Security section (password + 2FA)**
- Password change requires current password field before new password fields (existing behavior preserved)
- 2FA via TOTP authenticator app only (Google Authenticator / Authy style)
- QR code setup flow, 6-digit verification code input
- 8-10 one-time backup codes generated during 2FA setup
- Enable/disable 2FA toggle with re-authentication gate
- Form validation: zodResolver + mode:onSubmit + reValidateMode:onBlur (Phase 7 standard)

**Notification preferences**
- Email + push toggles per category (5 categories): Deals, Messages, Legal, Providers, System
- Stored in `preferences` map field on the existing user document in Firestore
- Toggle switches for each category x channel combination

**Email subscription preferences**
- Opt-in/out toggles for email categories (marketing, product updates, deal notifications)
- Integrates with Phase 9 unsubscribes collection in Firestore

**Account actions**
- Logout button on settings page (moved from profile)
- Account deletion with existing 15-day recovery period, type "DELETE" confirmation modal

**Profile page cleanup**
- Remove the entire "Account Settings" section from profile page (password change + danger zone) — lines ~941-1000
- Remove logout button from profile page
- Remove dead imports: useDeleteAccount, useSoftDeleteAccount, password-related state/handlers
- Profile page keeps its edit mode for company info, products, requests — unchanged

**Navigation & access**
- User dropdown menu in navbar: avatar + name trigger
- Dropdown items: Profile, Settings, Logout (3 items)
- Fix transparent dropdown background bug — needs solid background matching existing dark theme
- /settings added to middleware protectedRoutes — requires authentication
- Accessible to all roles (member, lawyer, insurance_provider, logistics_provider, admin)
- Mobile: Settings/Profile/Logout links inside hamburger menu (not separate avatar button)

### Claude's Discretion
- Exact section ordering (beyond danger zone being last)
- Icon choices per section (general direction: use lucide-react icons)
- 2FA backup code display format and download mechanism
- Notification preferences default values for new accounts
- Loading and error states for the settings page
- Email subscription category names and descriptions

### Deferred Ideas (OUT OF SCOPE)
- Language/locale preference — deferred until i18n is built (currently English-only per PROJECT.md)
- Profile field management from settings — keep on profile page
- SMS as 2FA method — TOTP only
- My Deals link in dropdown — keep dropdown minimal (Profile, Settings, Logout)
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase/auth` | 12.9.0 (installed) | TOTP MFA enrollment, reauthentication, password update | Already in project; `TotpMultiFactorGenerator` + `TotpSecret` confirmed exported |
| `react-hook-form` | ^7.66.0 | Form state + validation | Phase 7 standard, already used in ProductForm/RegisterForm |
| `@hookform/resolvers/zod` | installed | zodResolver adapter | Used in all Phase 7+ forms |
| `zod` | ^4.1.12 | Schema validation | Project standard — registerSchema.js, productSchema.js patterns |
| `react-hot-toast` | ^2.6.0 | Toast notifications | App-wide standard — same pattern as profile page |
| `lucide-react` | installed | Section icons | Already used in Navbar (User, LogOut, Menu, X icons) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `qrcode` or `qrcode.react` | latest | Render QR code for TOTP setup | Needed only in 2FA setup panel; wrap in `next/dynamic ssr:false` |
| `crypto` (Node built-in) | built-in | Generate backup codes | Use in an API route or client-side `window.crypto.getRandomValues` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `qrcode.react` | `qrcode` (Node) + canvas | `qrcode.react` is simpler JSX; wrapping with `next/dynamic` avoids SSR issues either way |
| Custom backup code generator | Firebase built-in | Firebase has NO built-in backup codes — must implement custom; this is not optional |

**Installation (if qrcode.react not already present):**
```bash
npm install qrcode.react
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/(main)/settings/
└── page.jsx                   # Thin page shell with Suspense + ProfileContent pattern

src/presentation/components/features/settings/
├── SettingsPage/
│   ├── SettingsPage.jsx        # Orchestrator — renders section components, no own state
│   ├── SecuritySection.jsx     # Password change + 2FA toggle/setup
│   ├── TwoFactorSetup.jsx      # QR code display, backup codes, verify step (dynamic)
│   ├── NotificationsSection.jsx # Email+push toggle grid per category
│   ├── EmailSubscriptionsSection.jsx # Unsubscribe/resubscribe toggles
│   └── DangerSection.jsx       # Logout button + Delete Account
```

**Hook co-location (Phase 7 pattern):**
```
src/presentation/hooks/settings/
├── usePasswordChange.js        # Wraps authDataSource.updatePassword with reauthentication
├── useTwoFactor.js             # TOTP enrollment/unenrollment state machine
├── useNotificationPreferences.js # Firestore read/write for preferences map
└── useEmailSubscriptions.js    # Reads unsubscribes collection, calls /api/unsubscribe|resubscribe
```

**Zod schemas:**
```
src/core/validation/
├── changePasswordSchema.js     # currentPassword + newPassword + confirmPassword
└── totpVerifySchema.js         # 6-digit code validation
```

### Pattern 1: Glass-Card Section with Accent Bar
**What:** Each settings section uses the established profile page glass-card pattern.
**When to use:** Every section wrapper.
```jsx
// Established pattern from profile page (lines 941-947)
<div className="glass-card p-6">
  <div className="flex items-center gap-3 mb-6">
    <span className="w-1 h-5 bg-[accent-color] rounded-full"></span>
    <Lock className="w-5 h-5 text-[#A0A0A0]" />
    <h3 className="text-lg font-bold text-white">Security</h3>
  </div>
  {/* section content */}
</div>
```

### Pattern 2: zodResolver Form (Phase 7 Standard)
**What:** All forms use zodResolver + mode:onSubmit + reValidateMode:onBlur.
**When to use:** Password change form, TOTP 6-digit verification form.
```jsx
// Source: Phase 7 standard from STATE.md decisions
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(changePasswordSchema),
  mode: 'onSubmit',
  reValidateMode: 'onBlur',
});
// Error display: <p className="text-xs text-red-400 mt-1">{errors.field?.message}</p>
// Error border: className={`... ${errors.field ? 'border-red-500' : 'border-[rgba(255,255,255,0.1)]'}`}
```

### Pattern 3: Firebase TOTP MFA Enrollment
**What:** Full enrollment flow using Firebase modular SDK.
**When to use:** When user enables 2FA toggle in SecuritySection.
```jsx
// Source: Firebase docs + confirmed exports in node_modules/firebase (v12.9.0)
import { multiFactor, TotpMultiFactorGenerator, TotpSecret } from 'firebase/auth';

// Step 1: Get session (requires recent login — may need reauthentication first)
const multiFactorSession = await multiFactor(auth.currentUser).getSession();

// Step 2: Generate TOTP secret
const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);

// Step 3: Generate QR code URL for authenticator app
const qrCodeUrl = totpSecret.generateQrCodeUrl(user.email, 'CoreTradeGlobal');

// Step 4: User scans QR, enters 6-digit code, then finalize enrollment
const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, oneTimePassword);
await multiFactor(auth.currentUser).enroll(assertion, 'TOTP Authenticator');

// Unenroll (disable 2FA)
const enrollmentId = multiFactor(auth.currentUser).enrolledFactors[0]?.uid;
await multiFactor(auth.currentUser).unenroll(enrollmentId);
// Note: unenroll triggers auth/user-token-expired if it was the last factor — catch and re-auth
```

### Pattern 4: Reauthentication Gate
**What:** Firebase requires recent authentication before sensitive operations (MFA enrollment, password change).
**When to use:** Before TOTP enrollment/unenrollment and before password change.
```jsx
// Source: Firebase docs on sensitive operations
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const credential = EmailAuthProvider.credential(user.email, currentPassword);
await reauthenticateWithCredential(auth.currentUser, credential);
// Then proceed with the sensitive operation
```

### Pattern 5: Notification Preferences (Firestore preferences map)
**What:** Read/write `preferences` map field on the user document.
**When to use:** Toggle switches in NotificationsSection.
```jsx
// Firestore user doc: users/{uid}.preferences
// Shape:
// {
//   deals: { email: true, push: true },
//   messages: { email: true, push: true },
//   legal: { email: true, push: true },
//   providers: { email: true, push: true },
//   system: { email: true, push: true },
// }

// Write via updateDoc (user already has update permission — firestore.rules: isOwner)
import { doc, updateDoc } from 'firebase/firestore';
await updateDoc(doc(db, 'users', uid), {
  [`preferences.${category}.${channel}`]: newValue
});
```

### Pattern 6: Email Subscription Toggles (Phase 9 integration)
**What:** Check if user's email is in the `unsubscribes` collection; call existing API routes to update.
**When to use:** EmailSubscriptionsSection toggle changes.

The `unsubscribes` Firestore collection is **write:false for clients** (Firestore rules confirmed). Updates must go through the existing API routes:
- `POST /api/unsubscribe` — add email to unsubscribes (opt out)
- `POST /api/resubscribe` — delete from unsubscribes (opt in)

Checking subscription status client-side: the `unsubscribes` collection allows `read: if isAdmin()` only. **The client cannot directly query the unsubscribes collection.** A new Next.js API route is needed to check subscription status server-side (using Admin SDK).

### Pattern 7: Navbar Dropdown Fix
**What:** Current transparent dropdown bug — `showUserMenu` state exists, dropdown has `bg-[#0F1B2B]` class already applied (line 170 of Navbar.jsx). The issue is likely z-index or the trigger button closing the dropdown on blur.
**When to use:** Navbar.jsx modification.

Looking at the existing navbar code (line 170):
```jsx
// Navbar.jsx already has bg-[#0F1B2B] on the dropdown div — but the hover/click states
// conflict. The showUserMenu toggle on button click + onMouseLeave on dropdown causes
// timing issues. Fix: use a click-outside handler (useRef + useEffect) instead of
// hover-only trigger, or stabilize the onMouseLeave timing.
```

The existing dropdown div uses `group-hover` CSS fallback simultaneously with `showUserMenu` state — these two mechanisms conflict. The fix is to remove the CSS `group-hover` classes and rely solely on the `showUserMenu` state, plus add a click-outside-to-close handler.

The dropdown needs to be updated to add a "Settings" link between "My Profile" and the separator before "Log Out".

### Anti-Patterns to Avoid
- **Calling `multiFactor().getSession()` without reauthentication:** Firebase will throw `auth/requires-recent-login` if the session is stale. Always reauthenticate before initiating MFA enrollment.
- **Storing raw backup codes in Firestore:** Store only hashed codes (SHA-256). Display plaintext once on screen and let user copy/download.
- **Writing to `unsubscribes` collection directly from client:** Firestore rules block this. Always use the `/api/unsubscribe` and `/api/resubscribe` routes.
- **Using useState for password form instead of react-hook-form:** Profile page uses raw useState — settings page MUST use zodResolver per Phase 7 standard.
- **Forgetting `reauthenticateWithCredential` before `updatePassword`:** Firebase requires recent auth. The current profile page skips this (it just calls `authDataSource.updatePassword`), but the settings page should add proper reauthentication for security.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOTP secret + QR code generation | Custom TOTP algorithm | `TotpMultiFactorGenerator.generateSecret()` + `totpSecret.generateQrCodeUrl()` | Firebase handles RFC 6238 TOTP, server-side session binding, clock drift tolerance |
| 2FA enrollment state | Custom localStorage flow | Firebase `multiFactor(user).enroll()` | Firebase handles enrollment persistence, token refresh, and multi-device sync |
| Password re-authentication | Custom session check | `reauthenticateWithCredential` + `EmailAuthProvider.credential` | Firebase handles token freshness validation |
| Toggle switch UI | Custom CSS toggle | Tailwind utility classes (existing cookie consent pattern) | `CookieConsent.jsx` has a working gold toggle pattern already in codebase |
| Unsubscribe status check | Direct Firestore query | New `GET /api/subscription-status` API route using Admin SDK | Client rules block reads on `unsubscribes` collection |

**Key insight:** Firebase handles the entire TOTP cryptographic surface — the app only needs to display the QR code and collect the 6-digit verification code. Backup codes are the only piece that requires custom implementation.

---

## Common Pitfalls

### Pitfall 1: Firebase TOTP Requires Identity Platform (not just Firebase Auth)
**What goes wrong:** `TotpMultiFactorGenerator.generateSecret()` throws if TOTP MFA is not enabled in the Firebase project config.
**Why it happens:** TOTP MFA is an Identity Platform feature, not available in the free Spark plan without upgrading.
**How to avoid:** Enable TOTP MFA via Firebase Console > Authentication > Multi-factor Auth, OR via Admin SDK / REST API before any user attempts enrollment. Verify the project uses Identity Platform (Blaze plan).
**Warning signs:** `auth/unsupported-first-factor` or `auth/operation-not-supported-in-this-environment` errors during enrollment.

### Pitfall 2: Reauthentication Required Before Sensitive Operations
**What goes wrong:** `auth/requires-recent-login` error when attempting MFA enrollment or password change if the user's Firebase Auth token is stale (older than ~5 minutes for sensitive ops).
**Why it happens:** Firebase requires fresh authentication for security-sensitive operations.
**How to avoid:** Always call `reauthenticateWithCredential(user, EmailAuthProvider.credential(email, password))` before `multiFactor(user).enroll()` and before `updatePassword()`. The settings page should include a "Re-enter your current password to continue" step before these operations.
**Warning signs:** `auth/requires-recent-login` error code in catch block.

### Pitfall 3: Unenrollment Causes Token Expiry
**What goes wrong:** After unenrolling 2FA (the last/only factor), Firebase throws `auth/user-token-expired` and signs the user out.
**Why it happens:** Firebase invalidates the session when MFA factors change.
**How to avoid:** Catch `auth/user-token-expired` in the unenroll flow, redirect user to `/login` with a message "You've been signed out. Please log in again."
**Warning signs:** User gets silently redirected or sees an unhandled error after disabling 2FA.

### Pitfall 4: Unsubscribes Collection Client-Side Access
**What goes wrong:** Trying to `getDoc()` from the `unsubscribes` collection client-side to check subscription status fails with a permission error.
**Why it happens:** Firestore rules explicitly block client reads: `allow read: if isAdmin()`.
**How to avoid:** Create a `GET /api/subscription-status?email=...` API route using Admin SDK (`getAdminFirestore()`). The settings page calls this route on load to determine toggle initial state.
**Warning signs:** `FirebaseError: Missing or insufficient permissions` when loading email subscription section.

### Pitfall 5: TOTP Backup Codes Not Part of Firebase API
**What goes wrong:** Expecting Firebase to return backup codes during enrollment — it does not.
**Why it happens:** Firebase TOTP implementation focuses on the TOTP protocol, not recovery workflows.
**How to avoid:** Generate 8-10 random alphanumeric codes client-side using `window.crypto.getRandomValues`. Store SHA-256 hashed versions in Firestore under `users/{uid}/backupCodes` subcollection or as an array field. Display plaintext codes once after enrollment. Mark each code as used in Firestore when consumed (future: use during sign-in with `assertionForSignIn` is NOT directly supported for backup codes — backup code sign-in requires a custom Cloud Function).
**Warning signs:** Planner assumes `TotpMultiFactorGenerator` returns backup codes — it does not.

### Pitfall 6: Navbar Dropdown Hover/Click State Conflict
**What goes wrong:** The current `showUserMenu` state + `group-hover` CSS coexist in Navbar.jsx, causing the dropdown to flicker or stay transparent on click vs hover.
**Why it happens:** Two competing visibility systems: React state (click) and CSS `:group-hover` (hover). When clicking the button to open with `showUserMenu=true`, then mousing away triggers `onMouseLeave` immediately, closing the dropdown before the user can click a menu item.
**How to avoid:** Remove `group-hover:opacity-100 group-hover:visible group-hover:translate-y-0` from the dropdown div. Rely solely on `showUserMenu` state. Add a `useRef` + `useEffect` click-outside handler to close the dropdown when clicking elsewhere.
**Warning signs:** The Settings dropdown link isn't clickable before it disappears.

### Pitfall 7: Profile Page Dead Import Cleanup
**What goes wrong:** Leaving `useDeleteAccount`, `useSoftDeleteAccount`, and password state in profile page after moving functionality to settings causes ESLint errors or confusion.
**Why it happens:** Profile page is 1075 lines with tightly coupled state.
**How to avoid:** After creating settings page, surgically remove: `useDeleteAccount` import (line 14), `useSoftDeleteAccount` import, `deleteAccount` usage (line ~41), `deleteLoading`, `deleteModalOpen`, `deleteConfirmText`, `currentPassword`, `newPassword`, `confirmPassword` state, `handlePasswordChange`, `handleLogout`, `handleOpenDeleteModal`, `handleCloseDeleteModal`, `handleDeleteAccount` handlers, the Security section JSX (lines ~941-1000), and the `ConfirmDialog` JSX (lines ~1034-1057).
**Warning signs:** Build errors or unused-variable warnings after migration.

---

## Code Examples

### Change Password Schema
```typescript
// src/core/validation/changePasswordSchema.js
import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

### TOTP Enrollment Flow (Client-Side)
```jsx
// Source: Firebase docs (firebase.google.com/docs/auth/web/totp-mfa) + confirmed API in node_modules
import { multiFactor, TotpMultiFactorGenerator } from 'firebase/auth';
import { auth } from '@/core/config/firebase.config';

// Phase 1: Reauthenticate, then generate secret
const multiFactorSession = await multiFactor(auth.currentUser).getSession();
const totpSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
const qrCodeUrl = totpSecret.generateQrCodeUrl(user.email, 'CoreTradeGlobal');
// → render qrCodeUrl with <QRCodeSVG value={qrCodeUrl} /> from qrcode.react

// Phase 2: User scans QR and enters 6-digit code to finalize
const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, sixDigitCode);
await multiFactor(auth.currentUser).enroll(assertion, 'TOTP Authenticator');
```

### Notification Preferences Toggle Update
```jsx
// Source: Firestore rules confirm users/{uid} update: isOwner
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';

const updatePreference = async (uid, category, channel, value) => {
  await updateDoc(doc(db, 'users', uid), {
    [`preferences.${category}.${channel}`]: value,
  });
};
// e.g. updatePreference(uid, 'deals', 'email', false)
```

### Backup Code Generation (Client-Side)
```jsx
// No external library needed — window.crypto is available in browsers
const generateBackupCodes = (count = 10) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const bytes = window.crypto.getRandomValues(new Uint8Array(5));
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    // Format as XXXXX-XXXXX (10 hex chars = readable)
    codes.push(`${hex.slice(0,5).toUpperCase()}-${hex.slice(5).toUpperCase()}`);
  }
  return codes;
};
```

### Subscription Status API Route
```js
// src/app/api/subscription-status/route.js
// GET /api/subscription-status?email=user@example.com
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(request) {
  const email = request.nextUrl.searchParams.get('email')?.toLowerCase().trim();
  if (!email) return NextResponse.json({ subscribed: true }); // default to subscribed
  const docId = crypto.createHash('sha256').update(email).digest('hex');
  const db = getAdminFirestore();
  const snap = await db.collection('unsubscribes').doc(docId).get();
  return NextResponse.json({ subscribed: !snap.exists });
}
```

### Navbar Click-Outside Fix Pattern
```jsx
// src/presentation/components/homepage/Navbar/Navbar.jsx
import { useRef, useEffect } from 'react';

const dropdownRef = useRef(null);
useEffect(() => {
  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setShowUserMenu(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
// Then: remove onMouseLeave from dropdown div, assign dropdownRef to the wrapper
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Profile page owns all account actions | Dedicated `/settings` route | Phase 10 | Profile page drops ~200 lines, settings cleanly separated |
| No 2FA in app | Firebase TOTP MFA | Phase 10 | Firebase SDK handles crypto; app only shows QR + validates code |
| Email unsub only from cold email link | Settings page subscription toggles | Phase 10 | Users can manage marketing preferences in-app |
| Navbar "Profile" button direct link | Avatar+name dropdown with Profile/Settings/Logout | Phase 10 | Settings accessible without visiting profile first |

**Note on `authDataSource.updatePassword`:** The current profile page (line 330) calls `updatePassword` without preceding reauthentication. This works only for freshly-logged-in sessions. The settings page should add `reauthenticateWithCredential` before the password update for robust behavior.

---

## Open Questions

1. **Is TOTP MFA enabled in the Firebase project (Identity Platform)?**
   - What we know: The code is supported by Firebase 12.9.0 package. TOTP is an Identity Platform feature.
   - What's unclear: Whether `core-trade-global` Firebase project has TOTP MFA enabled in Console.
   - Recommendation: Verify in Firebase Console > Authentication > Sign-in method > Multi-factor auth before implementation. If not enabled, enable it via Console or the REST API shown in docs.

2. **Backup code storage and sign-in usage**
   - What we know: Firebase has no built-in backup code support. Codes must be custom-generated and stored.
   - What's unclear: Phase 10 only covers *generating and displaying* backup codes. Using them to bypass TOTP during sign-in (recovery) is a separate sign-in flow that would require Cloud Function changes.
   - Recommendation: For Phase 10, generate codes and store hashed versions. Mark the sign-in recovery flow as deferred (display the codes with a note that they're for future account recovery).

3. **Email subscription initial state check**
   - What we know: `unsubscribes` collection is Admin-SDK only from client.
   - What's unclear: Whether a `GET /api/subscription-status` route can be added without conflicts.
   - Recommendation: Add the route — it follows the same pattern as `/api/unsubscribe` and `/api/resubscribe` already in the codebase.

---

## Sources

### Primary (HIGH confidence)
- Firebase docs (firebase.google.com/docs/auth/web/totp-mfa) — TOTP MFA enrollment API
- `node_modules/firebase/node_modules/@firebase/auth/dist/cordova/internal.js` — Confirmed `TotpMultiFactorGenerator`, `TotpSecret`, `generateSecret`, `generateQrCodeUrl`, `assertionForEnrollment`, `assertionForSignIn` all present in Firebase 12.9.0
- `node_modules/firebase/node_modules/@firebase/auth/dist/index.d.ts` — Confirmed `TotpMultiFactorGenerator` and `TotpSecret` exported from `firebase/auth`
- `firestore.rules` — Confirmed `unsubscribes` write:false for clients, `users/{userId}` update:isOwner
- `src/presentation/components/homepage/Navbar/Navbar.jsx` — Confirmed dropdown structure and transparency bug root cause
- `src/app/(main)/profile/[userId]/page.jsx` — Confirmed what to remove (lines ~941-1000, ~1034-1057)
- `src/presentation/hooks/auth/useDeleteAccount.js`, `useLogout.js`, `useForgotPassword.js` — Confirmed existing hooks to reuse
- `src/presentation/components/common/ConfirmDialog/ConfirmDialog.jsx` — Confirmed `children` prop for custom content (used for DELETE text input)
- `src/data/datasources/firebase/FirebaseAuthDataSource.js` — Confirmed `updatePassword` method exists, does NOT reauthenticate first

### Secondary (MEDIUM confidence)
- Firebase docs (firebase.google.com/docs/auth/web/multi-factor) — `multiFactor(user).getSession()`, reauthentication requirement, `auth/user-token-expired` on unenroll
- Firebase TOTP MFA docs confirmed: Firebase does NOT provide built-in backup/recovery codes

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in node_modules
- Architecture: HIGH — follows established Phase 7 patterns directly from codebase inspection
- TOTP MFA API: HIGH — confirmed exports in installed Firebase 12.9.0
- Pitfalls: HIGH — drawn from Firebase docs, Firestore rules inspection, and codebase analysis
- Backup codes: MEDIUM — Firebase docs confirm no built-in support; custom pattern is straightforward but untested in this project

**Research date:** 2026-04-12
**Valid until:** 2026-07-12 (stable Firebase API; TOTP MFA is GA)

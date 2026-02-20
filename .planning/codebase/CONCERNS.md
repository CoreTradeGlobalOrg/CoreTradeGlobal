# Codebase Concerns

**Analysis Date:** 2026-02-20

## Tech Debt

**Unimplemented Messaging Feature:**
- Issue: Messaging functionality marked as "coming soon" but referenced throughout the application
- Files: `src/app/(main)/profile/[userId]/page.jsx` (line 506)
- Impact: Users expect messaging capability but it's non-functional with placeholder only
- Fix approach: Either implement full messaging system with real-time updates or remove UI references entirely

**Unimplemented Newsletter Duplicate Check:**
- Issue: Newsletter subscription has no duplicate detection mechanism
- Files: `src/services/newsletterService.js` (line 92)
- Impact: Users can subscribe multiple times with same email, creating data duplication and bloated newsletter list
- Fix approach: Implement Firestore composite index on email field and query before subscribe

**Unoptimized Product/Request Fetching:**
- Issue: Client-side filtering of large datasets instead of server-side filtering
- Files: `src/presentation/components/features/product/ProductGrid/ProductGrid.jsx` (line 137), `src/presentation/components/features/request/RequestGrid/RequestGrid.jsx`
- Impact: Fetches up to 50 items then filters client-side; scales poorly as data grows
- Fix approach: Use Firestore `where` clauses server-side to limit results; implement proper pagination with `startAfter`

**Incomplete Firebase SDK Setup:**
- Issue: TODO comment indicates missing Firebase SDK imports
- Files: `src/lib/firebase.js` (line 5)
- Impact: Potential missing features if SDKs are needed later
- Fix approach: Document what SDKs are intentionally omitted and why

## Performance Bottlenecks

**Large Component Files Creating Rendering Issues:**
- Problem: Several components exceed 1000 lines, making them difficult to optimize and causing unnecessary re-renders
- Files:
  - `src/app/(main)/profile/[userId]/page.jsx` (1075 lines)
  - `src/presentation/components/features/admin/UsersTable/UsersTable.jsx` (839 lines)
  - `src/app/(main)/product/[productId]/page.jsx` (653 lines)
- Cause: Combined concerns (state management, forms, displays) in single components
- Improvement path: Split into smaller, memoized sub-components; extract form logic to custom hooks

**Excessive Logging in FirebaseStorageDataSource:**
- Problem: 17 console.log statements in upload flow create performance overhead in production
- Files: `src/data/datasources/firebase/FirebaseStorageDataSource.js` (lines 26-70)
- Cause: Debug logging left in production code
- Improvement path: Replace with conditional logging based on environment variable; use structured logging service

**Client-Side List Rendering Without Pagination:**
- Problem: Components fetch fixed limits (20-50 items) without lazy loading or pagination
- Files:
  - `src/presentation/components/homepage/Hero/HeroSection.jsx` (multiple queries with limit 20)
  - `src/presentation/components/homepage/Companies/CompaniesSection.jsx` (limit 35)
  - `src/app/(main)/news/page.js` (limit 50)
- Cause: No infinite scroll or pagination UI implemented
- Improvement path: Implement cursor-based pagination with `startAfter` parameter

## Test Coverage Gaps

**No Tests for Newsletter Duplicate Scenario:**
- What's not tested: Multiple subscription attempts with same email
- Files: `src/services/newsletterService.js`
- Risk: Duplicate subscribers go undetected in testing
- Priority: High - affects data quality

**Missing Admin Action Confirmation Tests:**
- What's not tested: User deletion, banning, suspension flows and edge cases
- Files: `src/presentation/components/features/admin/UsersTable/UsersTable.jsx` (complex dialog logic)
- Risk: Admin actions could fail silently or leave inconsistent state
- Priority: High - affects data integrity

**No Tests for Firebase Storage Error Handling:**
- What's not tested: Network failures, quota exceeded, invalid paths
- Files: `src/data/datasources/firebase/FirebaseStorageDataSource.js`
- Risk: Upload failures don't cascade properly to UI
- Priority: Medium - users may not receive error feedback

**Unverified Quote Status Updates:**
- What's not tested: Quote workflow state transitions (pending → accepted → rejected)
- Files: `src/presentation/components/features/request/QuotesSection/QuotesSection.jsx`
- Risk: Quote status could get stuck in invalid state
- Priority: Medium - affects business workflow

## Fragile Areas

**Profile Page Component:**
- Files: `src/app/(main)/profile/[userId]/page.jsx`
- Why fragile: 1075-line monolithic component with 28+ useState calls, tightly coupled form and display logic, heavy dependency on auth context and multiple custom hooks
- Safe modification: Extract sections into separate files (ProfileForm, ProductsSection, RequestsSection, CompanyDocuments); use compound component pattern
- Test coverage: Limited - no unit tests for form submission, modal interactions, or permission checks

**UsersTable Admin Component:**
- Files: `src/presentation/components/features/admin/UsersTable/UsersTable.jsx`
- Why fragile: 839 lines with multiple dialog states (26 different state variables), complex action handlers with nested conditionals, tightly coupled to admin hooks
- Safe modification: Break into TableRow sub-component, extract dialog logic to custom hook (useAdminConfirmation), separate action handlers into utils
- Test coverage: Gaps in user suspension, ban reason input, and menu interaction flows

**MessagesContext Provider:**
- Files: `src/presentation/contexts/MessagesContext.jsx`
- Why fragile: Real-time subscriptions to conversations, messages, and notifications without proper cleanup or error recovery; missing unsubscribe return in some cases
- Safe modification: Add defensive checks before accessing subscription methods; implement error boundary wrapper; add retry logic for failed subscriptions
- Test coverage: No tests for subscription cleanup or race conditions when activeConversationId changes

**Auth Context State Management:**
- Files: `src/presentation/contexts/AuthContext.jsx`
- Why fragile: Fetches profile, syncs emailVerified status, and manages session cookie in single useEffect; silent failures in profile fetch or missing profile handling
- Safe modification: Split into separate effects for auth, profile loading, and session management; add better error recovery
- Test coverage: Gaps in missing profile handling and session cookie error cases

## Security Considerations

**Client-Side Environment Variables Exposure:**
- Risk: NEXT_PUBLIC_* variables are visible in frontend code but should only be public Firebase config
- Files: `src/lib/firebase.js`, multiple component files
- Current mitigation: None observed - all Firebase config is public by design
- Recommendations: Audit that no sensitive keys (API_KEY for sensitive operations) are in NEXT_PUBLIC variables; use Firebase Security Rules to protect data access

**Newsletter Email Validation:**
- Risk: Minimal validation - only checks email format, no domain verification or spam detection
- Files: `src/services/newsletterService.js`
- Current mitigation: Client-side validation with `validators.email()`
- Recommendations: Add server-side validation in API route; implement email verification link; add rate limiting on subscription endpoint

**User Profile Data Exposure:**
- Risk: Profile page fetches all user data including company information without proper authorization checks
- Files: `src/app/(main)/profile/[userId]/page.jsx` (line 214-216)
- Current mitigation: Returns null if not authenticated, but doesn't verify current user has permission to view target profile
- Recommendations: Add explicit authorization check before rendering; hide sensitive fields for non-profile-owners

**Session Cookie Security:**
- Risk: Firebase ID token sent to session endpoint without CSRF protection
- Files: `src/presentation/contexts/AuthContext.jsx` (lines 81-93)
- Current mitigation: Token only sent after user logged in
- Recommendations: Add CSRF token verification in `api/auth/session` route; use SameSite=Strict on session cookie

**Admin Actions Without Audit Logging:**
- Risk: User suspensions, bans, deletions, and role changes have no audit trail
- Files: `src/presentation/components/features/admin/UsersTable/UsersTable.jsx`
- Current mitigation: None
- Recommendations: Log all admin actions with timestamp, admin ID, and action details to separate audit collection

## Known Bugs

**Profile Loading Race Condition:**
- Symptoms: Profile page shows loading spinner indefinitely or briefly flashes content
- Files: `src/app/(main)/profile/[userId]/page.jsx` (lines 100-180)
- Trigger: When currentUser profile hasn't loaded yet but router navigated to profile page
- Workaround: Hard refresh or wait for auth context to fully initialize

**Console Logging in Production:**
- Symptoms: Multiple console.log/console.error statements visible in browser console during normal operation
- Files: `src/data/datasources/firebase/FirebaseStorageDataSource.js` (17 statements), many more across codebase (209 total occurrences)
- Trigger: Any file upload or data fetch operation
- Workaround: None - affects all users in production

**Missing Error Handling for Failed File Deletes:**
- Symptoms: Old file may persist in storage if delete fails during profile logo update
- Files: `src/data/datasources/firebase/FirebaseStorageDataSource.js` (line 79-87)
- Trigger: Network failure or permission error during delete operation
- Workaround: Manual deletion from Firebase Console

## Scaling Limits

**Firestore Read/Write Limits:**
- Current capacity: Depends on Firebase plan (free tier: 50K reads/day)
- Limit: Expensive queries with no filtering or multiple queries per page load
- Scaling path: Implement proper indexing, pagination with cursors, caching layer (Redis), or migrate to Cloud Datastore

**Newsletter Collection Growth:**
- Current capacity: No limit enforced; could grow unbounded
- Limit: Duplicate subscriptions and invalid emails will cause storage waste
- Scaling path: Implement deduplication, implement TTL on unverified subscriptions, add rate limiting

**Real-Time Subscription Limits:**
- Current capacity: MessagesContext subscribes to conversations, messages, AND notifications simultaneously
- Limit: Each subscription is active listener; scaling to thousands of users causes connection pool exhaustion
- Scaling path: Implement smarter subscription management (unsubscribe when widget closed), batch queries, or move to Server-Sent Events

## Dependencies at Risk

**Firebase SDK Major Version:**
- Risk: No specific version pinned in package.json; breaking changes in future versions could break auth flow
- Impact: Auto-upgrades could silently break authentication or storage
- Migration plan: Pin firebase version; implement integration tests; test new versions in staging before production

**Dynamic Globe Component (Three.js):**
- Risk: Large 3D library loaded in browser for homepage hero section
- Impact: Slow initial page load on mobile, high bundle size
- Migration plan: Consider replacing with Canvas-based animation or simpler 2D visualization; load only on desktop

## Missing Critical Features

**Messaging System:**
- Problem: UI prompts users to message other users but functionality is completely missing
- Blocks: User-to-user communication, quote negotiations, supplier inquiries
- Impact: Users cannot conduct business-critical conversations; quoted as "coming soon" but not implemented

**Newsletter Verification:**
- Problem: No email verification for newsletter subscribers
- Blocks: Newsletter list contains invalid/typo emails, undeliverable campaigns
- Impact: Newsletter campaigns have poor deliverability

**Audit Logging:**
- Problem: No record of who changed what and when for critical operations
- Blocks: Cannot investigate disputes, cannot demonstrate compliance
- Impact: No accountability trail for admin actions or data modifications

**Rate Limiting:**
- Problem: No rate limiting on critical endpoints (login, newsletter signup, quote submission)
- Blocks: System vulnerable to brute force and spam
- Impact: Potential abuse without detection

## Dependency Injection Issues

**Container Initialization Assumption:**
- Risk: Code assumes `container` from `@/core/di/container` is always initialized
- Files: Used in 40+ components and hooks
- Impact: If container fails to initialize, entire app breaks silently
- Recommendation: Add initialization check and meaningful error if container unavailable

---
phase: quick
plan: 2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/components/homepage/Navbar/Navbar.jsx
autonomous: true
must_haves:
  truths:
    - "Provider users (logistics_provider, insurance_provider) see Provider Dashboard link in navbar"
    - "Admin users see the same nav links as members (RFQs, My Deals) — NOT provider or lawyer links"
    - "Admin users still see Admin Dashboard in the profile dropdown menu"
    - "roleLoading skeleton shows briefly then resolves to correct role-specific links"
  artifacts:
    - path: "src/presentation/components/homepage/Navbar/Navbar.jsx"
      provides: "Fixed nav link filtering logic"
      contains: "link.roles.includes(user.role)"
  key_links:
    - from: "Navbar.jsx visibleLinks filter"
      to: "ROLES constant"
      via: "includes() check without admin override"
      pattern: "link\\.roles\\.includes\\(user\\.role\\)"
---

<objective>
Fix three navbar issues: (1) ensure provider users see Provider Dashboard link, (2) fix admin nav override so admins see member-level links only (not provider/lawyer links), (3) verify roleLoading guard works correctly.

Purpose: Admin users currently see ALL role-gated nav items (including Provider Dashboard, Client Channels, Deal Review) because the filter has a blanket `user.role === ROLES.ADMIN` bypass. Providers may also be affected by the roleLoading guard. This fix simplifies admin nav to member-equivalent and ensures providers see their dashboard.
Output: Updated Navbar.jsx with corrected visibleLinks filter logic.
</objective>

<execution_context>
@/Users/wenubey/.claude/get-shit-done/workflows/execute-plan.md
@/Users/wenubey/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/presentation/components/homepage/Navbar/Navbar.jsx
@src/core/constants/roles.js
@src/presentation/contexts/AuthContext.jsx

<interfaces>
From src/core/constants/roles.js:
```javascript
export const ROLES = {
  MEMBER: 'member',
  LOGISTICS_PROVIDER: 'logistics_provider',
  INSURANCE_PROVIDER: 'insurance_provider',
  LAWYER: 'lawyer',
  ADMIN: 'admin',
};
```

From src/presentation/contexts/AuthContext.jsx:
```javascript
// user object shape (from userProfile spread + firebase fields):
// { ...firestoreProfile, uid, email, emailVerified, role }
// isAuthenticated: !!user && user.emailVerified === true
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix visibleLinks filter and verify roleLoading guard</name>
  <files>src/presentation/components/homepage/Navbar/Navbar.jsx</files>
  <action>
Fix the `visibleLinks` filter on line 136-138. The current logic is:

```jsx
const visibleLinks = NAV_LINKS.filter(
  (link) => link.roles === null || (user && (user.role === ROLES.ADMIN || link.roles.includes(user.role)))
);
```

**Change 1 — Remove admin override from visibleLinks filter:**

Replace with:
```jsx
const visibleLinks = NAV_LINKS.filter(
  (link) => link.roles === null || (user && link.roles.includes(user.role))
);
```

This removes `user.role === ROLES.ADMIN ||` entirely. Now admins only see links where ROLES.ADMIN is explicitly in the roles array.

**Change 2 — Add ROLES.ADMIN to member-level NAV_LINKS entries:**

Update the RFQs and My Deals entries to include ROLES.ADMIN:
- RFQs: `roles: [ROLES.MEMBER, ROLES.ADMIN]` — already includes ADMIN, no change needed.
- My Deals: `roles: [ROLES.MEMBER, ROLES.ADMIN]` — already includes ADMIN, no change needed.

So RFQs and My Deals already have ROLES.ADMIN in their roles arrays. The ONLY change needed is removing the admin bypass from the filter. This means:
- Admin sees: Products, RFQs, My Deals, Categories, Fairs, News, FAQ, About Us (same as member)
- Admin does NOT see: Provider Dashboard, Client Channels, Deal Review
- Provider sees: Products, Provider Dashboard, Categories, Fairs, News, FAQ, About Us
- Lawyer sees: Products, Client Channels, Deal Review, Categories, Fairs, News, FAQ, About Us

**Change 3 — Verify roleLoading guard (line 129):**

The current roleLoading is:
```jsx
const roleLoading = loading || (isAuthenticated && !user?.role);
```

This is correct. `isAuthenticated` requires `!!user && user.emailVerified === true`. The `!user?.role` part handles the edge case where user exists but role hasn't been set (legacy accounts). For properly onboarded users, `user.role` is populated from the Firestore profile immediately when `loading` turns false, so `roleLoading` will be false and role-specific links render correctly.

No change needed to roleLoading — just verify it is present and correct as-is.

**Update the decision comment** on line 92 in STATE.md decisions list: The old decision "[Phase 01]: Admin navbar override: ROLES.ADMIN check in visibleLinks filter so admin sees all role-restricted nav links" is now superseded. Do NOT modify STATE.md — the executor will record this in the SUMMARY.
  </action>
  <verify>
    <automated>cd /Users/wenubey/Desktop/CTG/core-trade-global && node -e "
const fs = require('fs');
const src = fs.readFileSync('src/presentation/components/homepage/Navbar/Navbar.jsx', 'utf8');

// 1. Admin override removed from filter
const hasAdminOverride = src.includes('user.role === ROLES.ADMIN ||');
if (hasAdminOverride) { console.error('FAIL: Admin override still in visibleLinks filter'); process.exit(1); }

// 2. Filter uses includes() only
const hasIncludes = src.includes('link.roles.includes(user.role)');
if (!hasIncludes) { console.error('FAIL: Missing link.roles.includes(user.role)'); process.exit(1); }

// 3. roleLoading guard exists
const hasRoleLoading = src.includes('roleLoading');
if (!hasRoleLoading) { console.error('FAIL: roleLoading guard missing'); process.exit(1); }

// 4. Provider Dashboard entry exists in NAV_LINKS
const hasProviderDash = src.includes('Provider Dashboard');
if (!hasProviderDash) { console.error('FAIL: Provider Dashboard nav link missing'); process.exit(1); }

// 5. RFQs and My Deals include ROLES.ADMIN
const rfqLine = src.match(/label:\\s*'RFQs'.*?roles:\\s*\\[([^\\]]+)\\]/s);
if (!rfqLine || !rfqLine[1].includes('ROLES.ADMIN')) { console.error('FAIL: RFQs missing ROLES.ADMIN'); process.exit(1); }

const dealsLine = src.match(/label:\\s*'My Deals'.*?roles:\\s*\\[([^\\]]+)\\]/s);
if (!dealsLine || !dealsLine[1].includes('ROLES.ADMIN')) { console.error('FAIL: My Deals missing ROLES.ADMIN'); process.exit(1); }

console.log('PASS: All navbar checks passed');
console.log('  - Admin override removed from filter');
console.log('  - Filter uses includes() only');
console.log('  - roleLoading guard present');
console.log('  - Provider Dashboard link exists');
console.log('  - RFQs and My Deals include ROLES.ADMIN');
"</automated>
  </verify>
  <done>
    - visibleLinks filter no longer has blanket `user.role === ROLES.ADMIN` bypass
    - Admin users see member-level links only (Products, RFQs, My Deals, Categories, Fairs, News, FAQ, About Us)
    - Admin does NOT see Provider Dashboard, Client Channels, or Deal Review in navbar
    - Provider users (logistics_provider, insurance_provider) see Provider Dashboard link
    - roleLoading skeleton guard is present and correctly prevents flash of wrong links
    - Admin Dashboard link still appears in profile dropdown menu (unchanged — it uses `user.role === 'admin'` check separately)
    - Next.js dev build succeeds without errors
  </done>
</task>

</tasks>

<verification>
- `npm run build` or `npx next build` completes without errors
- Manual verification: log in as admin — see RFQs, My Deals, but NOT Provider Dashboard or Client Channels
- Manual verification: log in as logistics_provider — see Provider Dashboard
- Admin Dashboard still visible in profile dropdown menu
</verification>

<success_criteria>
- Admin navbar shows member-equivalent links only (no provider/lawyer links)
- Provider users see Provider Dashboard link in navbar
- roleLoading skeleton renders briefly then resolves to correct links
- No regression in navbar behavior for member or unauthenticated users
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-navbar-for-provider-dashboard-and-si/2-SUMMARY.md`
</output>

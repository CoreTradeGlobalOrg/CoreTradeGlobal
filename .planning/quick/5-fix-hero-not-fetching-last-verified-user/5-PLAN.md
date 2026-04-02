---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/components/homepage/Hero/HeroSection.jsx
  - firestore.indexes.json
autonomous: true
requirements: [QUICK-5]

must_haves:
  truths:
    - "Hero supplier card shows the most recently admin-approved verified user with a company name"
    - "Suspended users never appear in the hero supplier card"
    - "Unverified or unapproved users never appear in the hero supplier card"
  artifacts:
    - path: "src/presentation/components/homepage/Hero/HeroSection.jsx"
      provides: "Filtered and ordered supplier query"
      contains: "emailVerified.*==.*true"
    - path: "firestore.indexes.json"
      provides: "Composite index for verified+approved+approvedAt query"
      contains: "approvedAt"
  key_links:
    - from: "HeroSection.jsx"
      to: "Firestore users collection"
      via: "firestoreDS.query with where/orderBy/limit"
      pattern: "adminApproved.*==.*true"
---

<objective>
Fix the hero section's "Latest Supplier" card to show the most recently verified and admin-approved user instead of an arbitrary user from the first 20 documents.

Purpose: The current query fetches 20 arbitrary users and sorts client-side by createdAt, which misses verified users outside the first 20 and shows unverified/unapproved users.
Output: Correct Firestore query with server-side filtering and ordering, plus required composite index.
</objective>

<execution_context>
@/Users/wenubey/.claude/get-shit-done/workflows/execute-plan.md
@/Users/wenubey/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/presentation/components/homepage/Hero/HeroSection.jsx
@src/data/datasources/firebase/FirestoreDataSource.js
@firestore.indexes.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix supplier query and add composite index</name>
  <files>src/presentation/components/homepage/Hero/HeroSection.jsx, firestore.indexes.json</files>
  <action>
In HeroSection.jsx, replace the user fetching block (lines 157-170) with a proper Firestore query that filters and orders server-side:

Replace:
```javascript
const users = await firestoreDS.query('users', { limit: 20 });
if (users?.length > 0) {
  const withCompany = users.filter(u => u.companyName);
  const sorted = withCompany.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB - dateA;
  });
  if (sorted.length > 0) setLatestSupplier(sorted[0]);
}
```

With:
```javascript
const users = await firestoreDS.query('users', {
  where: [
    ['emailVerified', '==', true],
    ['adminApproved', '==', true],
  ],
  orderBy: [['approvedAt', 'desc']],
  limit: 5,
});
if (users?.length > 0) {
  const withCompany = users.filter(u => u.companyName && !u.isSuspended);
  if (withCompany.length > 0) setLatestSupplier(withCompany[0]);
}
```

Key details:
- `where` filters for emailVerified AND adminApproved at database level (no arbitrary 20-doc window)
- `orderBy: approvedAt desc` ensures most recently approved user comes first
- `limit: 5` is a small buffer for client-side companyName + isSuspended filtering
- Client-side filter for companyName (avoids Firestore != limitations) and isSuspended (simple boolean check)

In firestore.indexes.json, add a new composite index entry to the `indexes` array:
```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "emailVerified", "order": "ASCENDING" },
    { "fieldPath": "adminApproved", "order": "ASCENDING" },
    { "fieldPath": "approvedAt", "order": "DESCENDING" }
  ]
}
```

IMPORTANT: Per MEMORY.md, do NOT use `firebase deploy --force` for indexes. The index file should be updated and deployed with `firebase deploy --only firestore:indexes` (without --force) to avoid overwriting manually-created product indexes. Leave the actual deploy to the user.
  </action>
  <verify>
    <automated>cd /Users/wenubey/Desktop/CTG/core-trade-global && grep -n "emailVerified.*==.*true" src/presentation/components/homepage/Hero/HeroSection.jsx && grep -n "adminApproved.*==.*true" src/presentation/components/homepage/Hero/HeroSection.jsx && grep -n "approvedAt" src/presentation/components/homepage/Hero/HeroSection.jsx && grep -n "approvedAt" firestore.indexes.json && npx next build 2>&1 | tail -5</automated>
  </verify>
  <done>
- HeroSection queries users with emailVerified==true AND adminApproved==true
- Results ordered by approvedAt descending (most recently approved first)
- Client-side filter excludes users without companyName and suspended users
- Composite index added to firestore.indexes.json for the query
- Build succeeds with no errors
  </done>
</task>

</tasks>

<verification>
1. grep confirms emailVerified, adminApproved, and approvedAt in HeroSection.jsx query
2. grep confirms approvedAt composite index in firestore.indexes.json
3. `npx next build` succeeds
4. Manual: visit homepage with fetchData=true, verify supplier card shows a verified+approved user
</verification>

<success_criteria>
- Hero supplier card fetches only verified and admin-approved users
- Users ordered by approvedAt (most recently approved first)
- Suspended users and users without companyName excluded
- Firestore composite index defined for the query
- Build passes
</success_criteria>

<output>
After completion, create `.planning/quick/5-fix-hero-not-fetching-last-verified-user/5-SUMMARY.md`
</output>

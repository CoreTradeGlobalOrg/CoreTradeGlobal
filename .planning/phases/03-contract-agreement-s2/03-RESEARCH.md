# Phase 3: Contract Agreement (S2) - Research

**Researched:** 2026-03-01
**Domain:** Firestore multi-party approval state machine, accordion UI, real-time dual-party progress, browser-native PDF generation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Contract Presentation**
- Sectioned accordion layout — clauses grouped into collapsible sections, expand one at a time
- Core trade terms only — price, quantity, Incoterms, delivery terms, payment terms (only what was negotiated)
- Clean and modern visual tone — readable language, card-based sections, matches platform UI
- Dedicated route at `/deals/[id]/contract`, linked from deal page and notifications
- Label data sources — each clause shows where values came from (e.g., "From negotiation")
- PDF export — "Download PDF" button generates a printable version of the contract
- Context header at top — shows deal overview: buyer, seller, product, accepted date, deal ID
- Link to negotiation history — show final terms with a link back to negotiation timeline for reference

**Clause Approval UX**
- Checkbox per individual clause — approve each clause one by one
- Approvals are toggleable until final submit — user can un-check until they click "Submit All Approvals"
- Both parties see each other's approval progress in real-time (live updates)
- Confirmation dialog on final submit — modal summarizes all approvals before committing
- Yellow checkmark + subtle yellow highlight for approved clauses (matches platform brand)
- Both parties use same yellow checkmark style, labeled "You" and "Buyer/Seller" to distinguish
- Progress bar at top showing "X/Y clauses approved" for each party
- Notifications only on full approval — notify when other party submits all approvals, not per clause
- Auto-save draft — checked (but not submitted) clauses are saved, user picks up where they left off
- No comments on clauses — approve or don't; discussions happen in chat
- After both approve, redirect to next stage (insurance/logistics quote request flow)
- Submit button always visible but disabled until all clauses checked — shows remaining count
- Must expand each accordion section before checkbox becomes active — ensures clauses are read

**Financial Summary**
- Sticky sidebar — financial summary always visible while scrolling through clauses
- Line items: unit price, quantity, total value, Incoterms, currency, plus estimated insurance/logistics costs (placeholder until Phase 4)
- Incoterms-driven document checklist — required documents change based on selected Incoterms (FOB vs CIF etc.)

**Approval Flow**
- When one party approves: contract becomes read-only with banner showing other party's progress
- Deal page shows contract approval status (e.g., "Contract: Buyer approved, Seller pending")
- Contract generated after brief "Generating contract..." delay when offer is accepted — feels deliberate
- Configurable deadline — deal creator can set an approval deadline; deal expires if not met

### Claude's Discretion
- Exact accordion animation and transitions
- Loading skeleton design during contract generation
- Specific Incoterms-to-document mapping (research which docs each Incoterm requires)
- Error state handling (network errors, concurrent edits)
- Exact estimated costs placeholder design
- Mobile responsiveness of sidebar (likely collapses below clauses)

### Deferred Ideas (OUT OF SCOPE)
- Clause comments/dispute annotations — could be part of Legal Consulting (Phase 5) or a separate phase
- Contract versioning/amendment after approval — future phase if needed
- Digital signature integration — beyond checkbox approval, could be a future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AGMT-01 | Both parties can review contract clauses populated from negotiation outcome | Covered by: Cloud Function that generates contract doc from accepted offer data; `onSnapshot` real-time subscription; ContractPage component reading from `deals/{dealId}/contract` subcollection or top-level field |
| AGMT-02 | Each contract clause requires individual checkbox approval per party | Covered by: per-clause approval state stored in Firestore; checkbox UI with must-expand-before-active pattern; auto-save of draft state via Cloud Function |
| AGMT-03 | Party approval status tracked (pending/approved per side) | Covered by: `contract.buyerApproval` and `contract.sellerApproval` objects in Firestore with per-clause booleans and `submittedAt` timestamp; Firestore `onSnapshot` for real-time cross-party visibility |
| AGMT-04 | Deal cannot advance to insurance/logistics stage until both parties approve | Covered by: Cloud Function `submitContractApproval` checks both approval states before updating `deal.status` to `contract_approved`; gate enforced server-side in transaction |
| AGMT-05 | Financial summary and document requirements displayed before approval | Covered by: sticky sidebar component reading from accepted offer snapshot; Incoterms-to-document mapping constant; placeholder costs display |
</phase_requirements>

---

## Summary

Phase 3 is a dual-party clause-approval workflow that gates deal advancement. The core technical work is: (1) a Cloud Function that generates a contract document from the accepted offer's terms; (2) a Firestore data model that tracks per-clause approval independently for each party; (3) a real-time UI that shows live cross-party approval progress; and (4) a Cloud Function that atomically advances the deal when both parties have submitted all approvals.

The project already has all the infrastructure needed: Firestore for real-time state, Cloud Functions for atomic writes, `onSnapshot` subscriptions for live updates, and a well-established UI pattern (dark theme `#0F1C2E`, yellow brand `#FFD700`, card layout, `ConfirmDialog` for confirmation modals). Phase 3 follows the same pattern as Phase 2 — data stored in Firestore, writes guarded by Cloud Functions, reads via `onSnapshot` in custom hooks.

The highest-risk design decision is the Firestore data model for contract approval state. The recommended approach stores the entire contract (clauses + both parties' per-clause approval booleans + submission timestamps) on a single `contract` subcollection document under the deal. This avoids subcollection complexity while supporting real-time updates from a single `onSnapshot` listener.

**Primary recommendation:** Store contract state as a single Firestore document at `deals/{dealId}/contract/main`. Generate it via Cloud Function triggered on deal acceptance. Track per-clause approval as nested maps. Gate advancement with a `submitContractApproval` Cloud Function that uses `runTransaction`.

---

## Standard Stack

### Core (already in project — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Firebase (client) | 12.4.0 | `onSnapshot` real-time subscriptions, `httpsCallable` | Already used for Phase 2 deal subscriptions |
| Firebase Functions v2 | 5.0.0 | `onDocumentUpdated` trigger for contract generation; `onCall` for approval submission | Already established pattern in `functions/index.js` |
| React Hook Form | 7.66.0 | Not needed for contract page (no form fields, just checkboxes) | N/A for this phase |
| Lucide React | 0.560.0 | `Check`, `ChevronDown`, `ChevronUp`, `FileText`, `Download`, `Clock` icons | Already used throughout |
| React Hot Toast | 2.6.0 | Success/error feedback on approval submission | Already used in `useDealActions.js` |
| Tailwind CSS 4 | Already in project | Styling | Project standard |

### Supporting (no new installs — browser native)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `window.print()` | Browser native | PDF export — triggers browser print dialog with `@media print` CSS | This is the correct approach for contract PDF; avoids a dependency like `jsPDF` or `html2pdf`; existing `PDFModal` component is for viewing stored PDFs, not generating them |
| `@media print` CSS | Browser native | Hides sidebar, navigation, buttons; formats contract for clean print output | Add print styles to `globals.css` or inline in component |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.print()` for PDF | `jsPDF` or `html2pdf.js` | `jsPDF` adds ~200KB bundle; `window.print()` is zero-cost and produces proper page breaks; browser print dialog is familiar to trade users |
| Single contract document | Per-clause subcollection | Per-clause subcollection is more granular but requires `collectionGroup` queries and more complex reads; single document is simpler and fits comfortably in Firestore's 1MB document limit (a contract is <10KB) |
| Cloud Function trigger for generation | Client-side generation | Client-side leaves contract generation untrusted and non-auditable; Cloud Function ensures canonical terms and single source of truth |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

New files follow the established Phase 2 pattern exactly:

```
src/
├── app/(main)/deals/[dealId]/
│   └── contract/
│       └── page.jsx                          # Route: /deals/[dealId]/contract
├── core/constants/
│   └── contractConstants.js                  # CONTRACT_STATUS, clause definitions, Incoterm doc map
├── domain/entities/
│   └── Contract.js                           # Contract entity (fromFirestore, toFirestore, helpers)
├── data/repositories/
│   └── ContractRepository.js                 # subscribeToContract(), getDraftApprovals(), etc.
├── core/di/container.js                      # Add getContractRepository()
├── presentation/
│   ├── hooks/contract/
│   │   ├── useContract.js                    # onSnapshot subscription for contract doc
│   │   └── useContractActions.js             # httpsCallable for submitContractApproval, saveDraftApprovals
│   └── components/features/contract/
│       ├── ContractPage/
│       │   └── ContractPage.jsx              # Main layout (main col + sticky sidebar)
│       ├── ContractHeader/
│       │   └── ContractHeader.jsx            # Context: deal ID, parties, product, accepted date
│       ├── ClauseAccordion/
│       │   └── ClauseAccordion.jsx           # Expandable section; exposes checkbox when expanded
│       ├── ClauseItem/
│       │   └── ClauseItem.jsx                # Individual clause row with dual approval state
│       ├── ApprovalProgressBar/
│       │   └── ApprovalProgressBar.jsx       # "X/Y clauses approved" for each party
│       ├── ContractSidebar/
│       │   └── ContractSidebar.jsx           # Sticky financial summary + doc checklist
│       └── GeneratingContractOverlay/
│           └── GeneratingContractOverlay.jsx  # "Generating contract..." delay state
functions/
└── index.js                                  # Add: onDealAccepted (contract generation trigger)
                                              #       submitContractApproval (onCall)
                                              #       saveDraftApprovals (onCall, auto-save)
                                              #       checkContractDeadline (scheduled, if deadline feature)
```

### Pattern 1: Firestore Contract Data Model

**What:** Single document at `deals/{dealId}/contract/main` stores the entire contract state.

**Schema:**
```javascript
// deals/{dealId}/contract/main
{
  dealId: string,
  generatedAt: Timestamp,
  deadline: Timestamp | null,          // Configurable approval deadline

  // Clauses — generated from accepted offer, immutable after creation
  clauses: [
    {
      id: 'price',                     // Stable clause ID
      section: 'trade_terms',          // Groups clauses into accordion sections
      title: 'Unit Price',
      value: '15,000 USD',             // Formatted from offer.price + offer.currency
      sourceLabel: 'From negotiation', // AGMT-01: label data source
    },
    // ... (5-8 clauses total, see contractConstants.js)
  ],

  // Per-party approval state — tracked independently (AGMT-03)
  buyerApproval: {
    approvedClauses: ['price', 'quantity'], // Set of approved clause IDs (draft)
    hasSubmitted: false,                    // true after "Submit All Approvals"
    submittedAt: null,
  },
  sellerApproval: {
    approvedClauses: [],
    hasSubmitted: false,
    submittedAt: null,
  },

  status: 'pending',  // 'pending' | 'buyer_approved' | 'both_approved'
}
```

**Why this model:**
- Single `onSnapshot` listener covers all state: clauses, both parties' progress, submission status
- No subcollection needed — entire contract fits in <10KB, well under Firestore's 1MB limit
- Per-clause `approvedClauses` array (not a map) avoids Firestore map key restrictions
- `hasSubmitted` flag enables the "read-only after submit" behavior (AGMT-04)
- `FieldValue.arrayUnion` / `FieldValue.arrayRemove` enable race-condition-safe clause toggling

**When to use:** All contract approval state lives here. The deal document's `status` field is the deal-level gate; `contract/main` is the approval detail.

```javascript
// Source: established project pattern (DealRepository.js line 107)
// ContractRepository.subscribeToContract pattern:
subscribeToContract(dealId, callback) {
  const contractRef = doc(db, 'deals', dealId, 'contract', 'main');
  return onSnapshot(contractRef, (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
}
```

### Pattern 2: Cloud Function Contract Generation (onDocumentUpdated trigger)

**What:** When `deals/{dealId}.status` transitions from `negotiating` to `accepted`, a Firestore trigger creates the `contract/main` document from the accepted offer's terms.

**When to use:** This is the established pattern — `onDealStatusChanged` already exists; Phase 3 adds an `onDealAccepted` trigger (or extends the existing trigger) that fires specifically on `accepted` status.

```javascript
// Source: functions/index.js pattern (onDealStatusChanged, lines 1727-1821)
// New trigger: onDealAccepted
exports.onDealAccepted = onDocumentUpdated(
  'deals/{dealId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    // Only fire when transitioning to 'accepted'
    if (before?.status === after?.status) return null;
    if (after?.status !== 'accepted') return null;

    const { dealId } = event.params;

    // Fetch the accepted offer (latest offer with status 'accepted')
    const offersSnap = await db
      .collection('deals').doc(dealId)
      .collection('offers')
      .where('status', '==', 'accepted')
      .limit(1)
      .get();

    if (offersSnap.empty) return null;
    const offer = offersSnap.docs[0].data();

    const clauses = buildContractClauses(offer);  // See contractConstants.js

    // Write contract document with brief deliberate delay (UX feel)
    await new Promise(resolve => setTimeout(resolve, 1500));

    await db
      .collection('deals').doc(dealId)
      .collection('contract').doc('main')
      .set({
        dealId,
        generatedAt: Timestamp.now(),
        deadline: null,
        clauses,
        buyerApproval: { approvedClauses: [], hasSubmitted: false, submittedAt: null },
        sellerApproval: { approvedClauses: [], hasSubmitted: false, submittedAt: null },
        status: 'pending',
      });

    console.log(`onDealAccepted: contract generated for deal ${dealId}`);
    return null;
  }
);
```

### Pattern 3: Accordion Must-Expand-Before-Approve

**What:** Track which accordion sections have been expanded client-side. A clause checkbox is only `active` (not disabled) if its parent section has been opened at least once.

**When to use:** This is entirely client-side state — no Firestore interaction needed.

```javascript
// Source: established React useState pattern
// In ContractPage.jsx or ClauseAccordion.jsx:
const [expandedSections, setExpandedSections] = useState(new Set());
const [hasExpanded, setHasExpanded] = useState(new Set()); // persists once opened

function handleSectionToggle(sectionId) {
  setExpandedSections(prev => {
    const next = new Set(prev);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    return next;
  });
  // Mark as ever-expanded (checkbox becomes active permanently after first open)
  setHasExpanded(prev => new Set([...prev, sectionId]));
}

// Clause checkbox disabled state:
const isCheckboxActive = hasExpanded.has(clause.section) && !contract.myApproval.hasSubmitted;
```

### Pattern 4: Auto-Save Draft Approvals (saveDraftApprovals Cloud Function)

**What:** When a user checks/unchecks a clause, call a Cloud Function to save the draft to Firestore. This enables pick-up-where-left-off behavior (AGMT-02).

**Optimization:** Debounce the save call by 500ms to avoid per-keystroke writes.

```javascript
// Source: established useDealActions pattern
// In useContractActions.js:
const saveDraftApprovals = useCallback(
  debounce(async (dealId, approvedClauses) => {
    const fn = httpsCallable(functions, 'saveDraftApprovals');
    await fn({ dealId, approvedClauses });
  }, 500),
  []
);
```

The Cloud Function uses `FieldValue` to write the array (not arrayUnion, since we're replacing the full draft state):

```javascript
exports.saveDraftApprovals = onCall(async (request) => {
  const { dealId, approvedClauses } = request.data;
  const uid = request.auth?.uid;
  // ... auth + participant guard
  const contractRef = db.collection('deals').doc(dealId).collection('contract').doc('main');
  const contractDoc = await contractRef.get();
  // ... existence + hasSubmitted guard
  const isBuyer = contractDoc.data().dealBuyerId === uid; // denormalized at generation time
  const approvalKey = isBuyer ? 'buyerApproval.approvedClauses' : 'sellerApproval.approvedClauses';
  await contractRef.update({ [approvalKey]: approvedClauses });
  return { success: true };
});
```

### Pattern 5: Final Approval Submission (atomic, with deal status gate)

**What:** `submitContractApproval` Cloud Function — called when user clicks "Submit All Approvals" after confirmation dialog. Uses `runTransaction` to atomically:
1. Mark the party's `hasSubmitted = true` with timestamp
2. Check if both parties have now submitted
3. If both submitted: update `contract/main.status = 'both_approved'` AND `deals/{dealId}.status = 'contract_approved'`

```javascript
// Source: acceptOffer pattern (functions/index.js lines ~1150-1220)
exports.submitContractApproval = onCall(async (request) => {
  const { dealId } = request.data;
  const uid = request.auth?.uid;

  await db.runTransaction(async (t) => {
    const dealRef = db.collection('deals').doc(dealId);
    const contractRef = dealRef.collection('contract').doc('main');

    const [dealSnap, contractSnap] = await Promise.all([
      t.get(dealRef),
      t.get(contractRef),
    ]);

    // Guards
    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
    if (!contractSnap.exists) throw new HttpsError('not-found', 'Contract not found.');

    const deal = dealSnap.data();
    const contract = contractSnap.data();

    // Participation guard
    if (uid !== deal.buyerId && uid !== deal.sellerId) {
      throw new HttpsError('permission-denied', 'Not a deal participant.');
    }

    // Must have deal status === 'accepted' (not already contract_approved)
    if (deal.status !== 'accepted') {
      throw new HttpsError('failed-precondition', `Deal status is ${deal.status}.`);
    }

    const isBuyer = uid === deal.buyerId;
    const approvalKey = isBuyer ? 'buyerApproval' : 'sellerApproval';
    const otherApprovalKey = isBuyer ? 'sellerApproval' : 'buyerApproval';

    // Cannot re-submit
    if (contract[approvalKey].hasSubmitted) {
      throw new HttpsError('failed-precondition', 'You have already submitted your approvals.');
    }

    // Must have approved all clauses
    const totalClauses = contract.clauses.length;
    if (contract[approvalKey].approvedClauses.length !== totalClauses) {
      throw new HttpsError('failed-precondition', 'You must approve all clauses before submitting.');
    }

    const now = Timestamp.now();
    const otherHasSubmitted = contract[otherApprovalKey].hasSubmitted;

    // Update this party's approval
    const updateData = {
      [`${approvalKey}.hasSubmitted`]: true,
      [`${approvalKey}.submittedAt`]: now,
    };

    if (otherHasSubmitted) {
      // Both parties done — advance deal
      updateData.status = 'both_approved';
      t.update(dealRef, {
        status: 'contract_approved',
        updatedAt: now,
      });
    } else {
      updateData.status = isBuyer ? 'buyer_approved' : 'seller_approved';
    }

    t.update(contractRef, updateData);
  });

  return { success: true };
});
```

### Pattern 6: Deal Status Extension

**What:** The `DEAL_STATUS` constant and `Deal.isTerminal()` need to be extended to include the new `contract_approved` status (and deal page needs to know to show "View Contract" link when status is `accepted`).

**Current `DEAL_STATUS` (dealConstants.js):**
- `NEGOTIATING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `WITHDRAWN`

**New statuses to add:**
- `CONTRACT_APPROVED = 'contract_approved'` — both parties have approved contract; ready for Phase 4

Note: The deal status transitions in `VALID_DEAL_TRANSITIONS` must be extended:
```javascript
[DEAL_STATUS.ACCEPTED]: [DEAL_STATUS.CONTRACT_APPROVED],
[DEAL_STATUS.CONTRACT_APPROVED]: [], // terminal for negotiation, gateway for Phase 4
```

**Important:** `Deal.isTerminal()` currently includes `ACCEPTED` as terminal. This must change — `ACCEPTED` is now a transitional state (leading to contract review). The terminal check should become:
```javascript
isTerminal() {
  return [
    DEAL_STATUS.REJECTED,
    DEAL_STATUS.EXPIRED,
    DEAL_STATUS.WITHDRAWN,
    DEAL_STATUS.CONTRACT_APPROVED,
  ].includes(this.status);
}
```

This means the `DealPage.jsx` "Terminal Banner" for `ACCEPTED` must be replaced with a "Contract Ready" banner that links to `/deals/[dealId]/contract`.

### Pattern 7: Incoterms-to-Document Mapping

**What:** Required trade documents vary by Incoterm. This is "Claude's Discretion" territory — research findings below.

Based on ICC Incoterms 2020 standard (verified against established trade knowledge):

```javascript
// Source: ICC Incoterms 2020 standard
// Add to src/core/constants/contractConstants.js
export const INCOTERM_REQUIRED_DOCUMENTS = {
  EXW: ['Commercial Invoice', 'Packing List'],
  FCA: ['Commercial Invoice', 'Packing List', 'Export License (if applicable)'],
  CPT: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Export License (if applicable)'],
  CIP: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Insurance Certificate', 'Export License (if applicable)'],
  DAP: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Export License (if applicable)'],
  DPU: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Export License (if applicable)'],
  DDP: ['Commercial Invoice', 'Packing List', 'Bill of Lading / Airway Bill', 'Import Customs Documents', 'Export License (if applicable)'],
  FAS: ['Commercial Invoice', 'Packing List', 'Export License (if applicable)'],
  FOB: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Export License (if applicable)'],
  CFR: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Export License (if applicable)'],
  CIF: ['Commercial Invoice', 'Packing List', 'Bill of Lading', 'Insurance Certificate', 'Export License (if applicable)'],
};
```

Confidence: MEDIUM — this is standard ICC guidance; specific deals may have additional requirements but this is the correct baseline for a general trade platform.

### Pattern 8: PDF Export via `window.print()`

**What:** "Download PDF" button triggers browser print dialog with print-optimized CSS.

```javascript
// In ContractPage.jsx
function handleDownloadPDF() {
  window.print();
}
```

```css
/* In globals.css or ContractPage print styles */
@media print {
  .no-print { display: none !important; }  /* hides nav, sidebar, buttons */
  .print-only { display: block !important; }
  body { background: white; color: black; }
  .contract-content { max-width: 100%; margin: 0; padding: 0; }
}
```

This is the zero-dependency approach consistent with the project's existing `PDFModal.jsx` (which views stored PDFs via iframe). The "Download PDF" is a browser-native print-to-PDF — no server-side generation needed.

### Pattern 9: Firestore Security Rules Extension

**What:** The contract subcollection needs participant-only read and Cloud Function-only write (consistent with existing deals rules).

```
// Add inside match /deals/{dealId} { ... }
match /contract/{contractDoc} {
  allow read: if isAuthenticated() && (
    request.auth.uid == get(/databases/$(database)/documents/deals/$(dealId)).data.buyerId ||
    request.auth.uid == get(/databases/$(database)/documents/deals/$(dealId)).data.sellerId
  );
  allow write: if false; // All writes via Cloud Functions (Admin SDK)
}
```

Note: This follows the exact same pattern as the `offers` subcollection rules (lines 258-264 of existing `firestore.rules`).

### Pattern 10: Contract Route Protection

**What:** `/deals/[dealId]/contract` needs the same auth guard + participant check as `/deals/[dealId]`. The middleware currently protects `/dashboard` and `/messages` but NOT `/deals` — the deal page does its own client-side auth check (lines 62-141 of `deals/[dealId]/page.jsx`). The contract page must follow the same pattern.

Add `/deals` to middleware's `protectedRoutes` array to enforce server-side auth — this is a cleanup that Phase 3 should handle (currently any unauthenticated user can reach the deal page URL and just get a redirect, but middleware protection is cleaner).

### Anti-Patterns to Avoid

- **Storing per-clause approval as a Firestore map with dynamic keys:** Firestore does not support querying map keys. Use an array of clause IDs instead (can use `arrayUnion`/`arrayRemove`).
- **Client-side contract generation:** Never generate clause values on the client. The Cloud Function trigger is the sole authority for contract content. Prevents manipulation of clause terms.
- **Writing approval state directly from client:** All writes go through Cloud Functions. Client reads via `onSnapshot`. Consistent with Phase 2 deals pattern (rules have `allow write: if false`).
- **Putting draft approval saves inside a transaction:** Draft saves are NOT transactional — they are best-effort (same principle as Phase 2: `sendDealNotifications` outside transactions). Only the final `submitContractApproval` uses `runTransaction`.
- **Checking `deal.status === 'accepted'` as the only prerequisite for showing contract:** Also check `contract` document exists — there is a window between deal acceptance and contract generation (the deliberate 1.5s delay). Show the "Generating contract..." skeleton during this window.
- **Extending `Deal.isTerminal()` carelessly:** Currently `ACCEPTED` is listed as terminal in `DealPage.jsx`'s fallback array (line 89-94). After Phase 3, `ACCEPTED` is no longer terminal — it's the gateway to the contract stage. Fix both `Deal.isTerminal()` in the entity and the `DealPage.jsx` fallback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-time dual-party sync | Custom polling or WebSocket | Firestore `onSnapshot` with single contract document | Already proven in Phase 2 (useDeal.js pattern); `onSnapshot` handles reconnection, offline, and concurrent updates natively |
| PDF generation | `jsPDF`, `html2pdf.js`, or server-side PDF service | `window.print()` with `@media print` CSS | Zero dependency cost; browser print-to-PDF is standard for trade documents; avoids layout engine reimplementation |
| Accordion animation library | Custom CSS transitions or Framer Motion | Simple CSS `max-height` transition (Tailwind `transition-all duration-200`) | Framer Motion is already in the project but is overkill for a simple expand/collapse; CSS suffices |
| Debounce for draft saves | Custom timer implementation | Inline `useCallback` + `setTimeout`/`clearTimeout` | Simple enough to inline; no `lodash.debounce` needed |
| Contract clause content | Hardcoded strings in components | `contractConstants.js` — clause definitions as data | Allows clause list to be changed without touching component code |

**Key insight:** The project's established Firebase + Cloud Function pattern eliminates the need for any custom real-time sync, offline handling, or concurrent edit detection. Firestore transactions handle all race conditions.

---

## Common Pitfalls

### Pitfall 1: Contract Document Not Yet Exists (Generation Window)

**What goes wrong:** `/deals/[dealId]/contract` page loads before the `onDealAccepted` Cloud Function has created the contract document. The `onSnapshot` listener fires with `snap.exists() === false`. The page crashes or shows an error.

**Why it happens:** The 1.5s deliberate delay in contract generation + Cloud Function cold start means there's a window (could be 5-10 seconds on cold start) where the deal is `accepted` but the contract document does not exist.

**How to avoid:** The `useContract` hook must handle the `null` contract case explicitly. When `deal.status === 'accepted'` and `contract === null`, render the `GeneratingContractOverlay` (loading skeleton with "Generating contract..." text), not an error state. Only show an error if `contract === null` for more than 30 seconds.

**Warning signs:** "Contract not found" errors appearing in the first few seconds after accepting an offer.

### Pitfall 2: Both Parties Submitting Simultaneously (Race Condition)

**What goes wrong:** Buyer submits at T+0, seller submits at T+0.001. Both read `otherHasSubmitted = false` before the other's write commits. Result: contract status set to `buyer_approved` and `seller_approved` independently, never reaching `both_approved`. Deal status never advances to `contract_approved`.

**Why it happens:** Without `runTransaction`, both Cloud Function invocations read stale state.

**How to avoid:** `submitContractApproval` MUST use `db.runTransaction`. The transaction retries until both reads are consistent. This is identical to the `acceptOffer` pattern (functions/index.js line ~1150). Already documented in the solution above.

**Warning signs:** Deal stuck in `accepted` status after both parties think they approved.

### Pitfall 3: `Deal.isTerminal()` Breaking Existing Deal Page

**What goes wrong:** After adding `CONTRACT_APPROVED` status, the existing `DealPage.jsx` shows a generic "Terminal Banner" for deals with `status = 'contract_approved'`, hiding the "View Contract" link.

**Why it happens:** `DealPage.jsx` uses `isTerminal` to conditionally hide the counter-offer form and show the terminal banner. `ACCEPTED` is currently in the terminal list (line 88-94), which will need updating.

**How to avoid:** When updating `DEAL_STATUS` and `Deal.isTerminal()`, simultaneously update `DealPage.jsx`'s `TerminalBanner` to have a specific config for `ACCEPTED` (showing "Contract generation in progress..." with link to `/deals/[id]/contract`) and for `CONTRACT_APPROVED` (showing "Contract approved — proceed to quotes").

**Warning signs:** After Phase 3, deal page for accepted deals shows old "Both parties have agreed on the terms. Contract generation is in progress." text without a working link to the contract page.

### Pitfall 4: Firestore Subcollection `write: if false` Rule Blocking Contract Reads

**What goes wrong:** If the firestore rules are extended to cover the contract subcollection with `allow write: if false`, but the `read` rule uses the parent deal's `get()` call, the `get()` call counts as a Firestore read and consumes quota. More importantly, if the rule evaluation fails (e.g., the deal document doesn't exist at evaluation time), the read is denied.

**Why it happens:** `get()` calls in Firestore security rules can fail silently or be unexpectedly denied in edge cases.

**How to avoid:** Follow the exact pattern established in Phase 2 for the `offers` subcollection (lines 258-264 of `firestore.rules`). This pattern is tested and known to work.

### Pitfall 5: Auto-Save Rate Limiting

**What goes wrong:** User rapidly clicks clauses — triggers 20+ Cloud Function invocations per second. Firebase has per-function rate limits; also burns through Cloud Function invocations unnecessarily.

**Why it happens:** No debounce on the draft save action.

**How to avoid:** Implement a 500ms debounce on `saveDraftApprovals`. Only the final state of the checkbox set is saved after the user pauses. Alternatively, use local state entirely for draft management and only persist on explicit submit — but this loses the "pick up where you left off" requirement. Debounce is the right balance.

### Pitfall 6: Expanding Accordion State Not Persisted

**What goes wrong:** User expands all sections, approves all clauses, then refreshes. `hasExpanded` state is reset to empty Set. All checkboxes become disabled again because the "must expand before approve" state is local.

**Why it happens:** `hasExpanded` is `useState` (in-memory only), not persisted to Firestore.

**How to avoid:** Once a party has draft approvals in Firestore (`approvedClauses.length > 0` for a clause in a section), that section should be treated as "ever-expanded" (checkbox remains active). This restores the active state from Firestore without storing `hasExpanded` separately. Implementation: compute `hasExpandedSections` from the persisted `approvedClauses` on load.

---

## Code Examples

### Contract Clause Definitions (contractConstants.js)

```javascript
// Source: Project convention (dealConstants.js pattern)
// src/core/constants/contractConstants.js

export const CONTRACT_STATUS = {
  PENDING: 'pending',
  BUYER_APPROVED: 'buyer_approved',
  SELLER_APPROVED: 'seller_approved',
  BOTH_APPROVED: 'both_approved',
};

/**
 * Build contract clauses from an accepted offer object.
 * Called by the Cloud Function on deal acceptance.
 * @param {Object} offer - Firestore offer document data
 * @param {string} dealId
 * @returns {Array} clauses array for contract/main document
 */
export function buildContractClauses(offer, deal) {
  const currency = offer.currency || 'USD';
  const fmtPrice = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(offer.price);
  const fmtTotal = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(offer.estimatedTotal || offer.price * offer.quantity);

  return [
    // Section: trade_terms
    {
      id: 'price',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Unit Price',
      value: `${fmtPrice} per ${offer.unit}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'quantity',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Quantity',
      value: `${offer.quantity} ${offer.unit}`,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'total_value',
      section: 'trade_terms',
      sectionTitle: 'Trade Terms',
      title: 'Total Contract Value',
      value: fmtTotal,
      sourceLabel: 'Calculated from price × quantity',
    },
    // Section: delivery
    {
      id: 'incoterm',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Delivery Terms (Incoterm)',
      value: offer.incoterm,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'named_place',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Named Place',
      value: offer.namedPlace,
      sourceLabel: 'From negotiation',
    },
    {
      id: 'delivery_deadline',
      section: 'delivery',
      sectionTitle: 'Delivery & Shipping',
      title: 'Delivery Deadline',
      value: offer.deliveryDeadline
        ? new Date(offer.deliveryDeadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'To be agreed',
      sourceLabel: 'From negotiation',
    },
    // Section: payment
    {
      id: 'payment_terms',
      section: 'payment',
      sectionTitle: 'Payment',
      title: 'Payment Terms',
      value: PAYMENT_TERMS_LABELS[offer.paymentTerms] || offer.paymentTerms,
      sourceLabel: 'From negotiation',
    },
    // Section: insurance
    {
      id: 'insurance',
      section: 'insurance',
      sectionTitle: 'Insurance & Risk',
      title: 'Insurance Responsibility',
      value: offer.insurancePreference === 'seller_provides'
        ? 'Seller provides cargo insurance'
        : 'Buyer arranges cargo insurance',
      sourceLabel: 'From Incoterm default',
    },
  ];
}
```

### useContract Hook (real-time subscription)

```javascript
// Source: useDeal.js pattern (src/presentation/hooks/deal/useDeal.js)
// src/presentation/hooks/contract/useContract.js

'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';

export function useContract(dealId) {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dealId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const contractRepo = container.getContractRepository();

    const unsub = contractRepo.subscribeToContract(dealId, (contractData) => {
      setContract(contractData);
      setLoading(false);
    });

    return () => unsub();
  }, [dealId]);

  return { contract, loading, error };
}
```

### ContractPage Layout Pattern

```jsx
// Source: DealPage.jsx layout pattern
// src/presentation/components/features/contract/ContractPage/ContractPage.jsx

'use client';

export function ContractPage({ deal, contract, currentUserUid, actions }) {
  const isBuyer = deal.buyerId === currentUserUid;
  const myApproval = isBuyer ? contract?.buyerApproval : contract?.sellerApproval;
  const otherApproval = isBuyer ? contract?.sellerApproval : contract?.buyerApproval;
  const otherPartyLabel = isBuyer ? 'Seller' : 'Buyer';

  // contract === null means still generating
  if (!contract) {
    return <GeneratingContractOverlay />;
  }

  const hasISubmitted = myApproval?.hasSubmitted ?? false;
  const hasOtherSubmitted = otherApproval?.hasSubmitted ?? false;

  return (
    <div className="min-h-screen bg-[#0F1C2E] pt-[120px] pb-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <ContractHeader deal={deal} contract={contract} />
        <ApprovalProgressBar
          contract={contract}
          currentUserUid={currentUserUid}
          isBuyer={isBuyer}
        />

        {/* One-party-approved banner */}
        {hasISubmitted && !hasOtherSubmitted && (
          <div className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3">
            <p className="text-sm font-semibold text-[#FFD700]">Your approvals submitted</p>
            <p className="text-xs text-[#8899AA] mt-0.5">
              Waiting for {otherPartyLabel} to review and approve all clauses.
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main column — clause accordion */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Grouped by section — use contract.getClausesBySection() from the Contract entity.
                Returns an object keyed by section ID. Iterate CLAUSE_SECTIONS for ordering. */}
            {(() => {
              const grouped = contract.getClausesBySection();
              return CLAUSE_SECTIONS.map(section => {
                const sectionClauses = grouped[section.id] || [];
                if (sectionClauses.length === 0) return null;
                return (
                  <ClauseAccordion
                    key={section.id}
                    section={section}
                    clauses={sectionClauses}
                    myApproval={myApproval}
                    otherApproval={otherApproval}
                    otherPartyLabel={otherPartyLabel}
                    isReadOnly={hasISubmitted}
                    onClauseToggle={actions.toggleClause}
                    isBuyer={isBuyer}
                  />
                );
              });
            })()}

            {/* Submit button */}
            {!hasISubmitted && (
              <SubmitApprovalsButton
                contract={contract}
                myApproval={myApproval}
                onSubmit={actions.submitApprovals}
                loading={actions.loading}
              />
            )}
          </div>

          {/* Sticky sidebar */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <ContractSidebar
              deal={deal}
              contract={contract}
              isBuyer={isBuyer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### DealPage "Accepted" Banner Update (after Phase 3)

```jsx
// Replace the existing ACCEPTED config in DealPage.jsx TerminalBanner
// with a non-terminal "Contract Ready" banner that links to contract page:

// In DealPage.jsx, add this above TerminalBanner:
{deal.status === DEAL_STATUS.ACCEPTED && (
  <div className="rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3">
    <p className="text-sm font-semibold text-[#FFD700]">Deal Accepted — Contract Ready</p>
    <p className="text-xs text-[#8899AA] mt-0.5">
      Both parties agreed on terms. Review and approve the contract to proceed.
    </p>
    <Link
      href={`/deals/${deal.id}/contract`}
      className="mt-2 inline-block text-xs font-semibold text-[#FFD700] underline"
    >
      View Contract →
    </Link>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom polling for real-time updates | Firestore `onSnapshot` | Already used in Phase 2 | Use `onSnapshot` — already proven |
| Server-side PDF generation | Browser `window.print()` with `@media print` | Standard approach for trade docs | Zero dependency; use this |
| Per-clause Firestore documents | Single contract document with clause array | Recommended for Phase 3 | Simpler, single subscription, fits in 1MB limit |

**Deprecated/outdated:**
- Firebase Realtime Database for real-time features: Firestore `onSnapshot` is the project standard; do not introduce RTDB for this phase.

---

## Open Questions

1. **Contract deadline enforcement**
   - What we know: CONTEXT.md says "Configurable deadline — deal creator can set an approval deadline; deal expires if not met"
   - What's unclear: When is the deadline set? At deal creation? At the moment of acceptance? Who is "deal creator" — the initiator of the deal (stored as `deal.initiatedBy`) or always the buyer?
   - Recommendation: Implement deadline as a nullable `Timestamp` field on the contract document. Set it when the contract is generated (i.e., the deal creator can optionally specify it before accepting — but this adds complexity to the `acceptOffer` flow). Simpler: deadline is set when the contract document is created by the Cloud Function using `deal.initiatedBy`. For v1 of Phase 3, default to null (no deadline) and add deadline-setting UI in a follow-up plan if needed. The `checkContractDeadline` scheduled function can be added later.

2. **Deal page `contract_approved` status display**
   - What we know: After contract approval, deal.status becomes `contract_approved`; Phase 4 (quotes) will need to start
   - What's unclear: Should the contract page remain viewable after both parties have approved? Yes — it becomes read-only and should remain accessible as a reference.
   - Recommendation: Keep the contract page accessible after `both_approved` status. Show a "Proceed to Quotes" CTA (even if Phase 4 isn't built yet — show a placeholder banner).

3. **Notification content for contract approval**
   - What we know: "Notifications only on full approval — notify when other party submits all approvals, not per clause"
   - What's unclear: Should notifications be sent in-app only, or also email and FCM push?
   - Recommendation: Follow Phase 2 pattern — all three channels (Firestore in-app, FCM, Resend email). Extend the existing `sendDealNotifications` helper or create a parallel `sendContractNotifications` helper.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` (only `workflow.research`, `workflow.plan_check`, `workflow.verifier` are set). Skipping formal test framework section — no automated test infrastructure exists in the project.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `functions/index.js` (2206 lines), `DealRepository.js`, `useDeal.js`, `DealPage.jsx`, `DealSidebar.jsx`, `ConfirmDialog.jsx`, `ContractConstants.js` (incoterms), `firestore.rules`, `container.js`
- `src/domain/entities/Deal.js` — DEAL_STATUS constants and isTerminal() logic
- `src/core/constants/dealConstants.js` — DEAL_STATUS, PAYMENT_TERMS, VALID_DEAL_TRANSITIONS
- `src/core/constants/incoterms.js` — all 11 Incoterms 2020 with insuranceDefault
- `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `STACK.md`, `STRUCTURE.md`
- `.planning/phases/02-deal-creation-and-negotiation-s1/02-VERIFICATION.md` — confirmed patterns from Phase 2

### Secondary (MEDIUM confidence)

- ICC Incoterms 2020 standard document requirements — standard industry knowledge for FOB/CIF/etc. required documents (AGMT-05 research)
- `window.print()` browser API — universally supported; zero-dependency PDF approach

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all stack elements already in production use
- Architecture: HIGH — directly derived from Phase 2 patterns in verified codebase
- Pitfalls: HIGH — derived from Phase 2 verification findings and Firestore transaction semantics
- Incoterm document requirements: MEDIUM — standard ICC knowledge, not verified against a live ICC source in this session

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable codebase; Firestore/Firebase APIs are stable)

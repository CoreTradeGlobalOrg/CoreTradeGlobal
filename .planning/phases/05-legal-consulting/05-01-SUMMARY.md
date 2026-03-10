---
phase: 05-legal-consulting
plan: 01
subsystem: database
tags: [firestore, firebase, real-time, security-rules, repository-pattern]

# Dependency graph
requires:
  - phase: 04-provider-portals-and-insurance-logistics-quotes-s3
    provides: DI container pattern (getLegal*Repository follows getQuote*Repository), storage upload pattern (MessageRepository.uploadAttachment)
  - phase: 02-deal-creation-and-negotiation-s1
    provides: Deal entity, DealRepository pattern, ContractRepository subscription pattern
provides:
  - LegalEngagement entity with fromFirestore and status/participant helpers
  - LegalMessage entity with fromFirestore and type helpers (isSystem, isQuickAction, isAttachment, isOwn)
  - LegalEngagementRepository with 9 methods for engagement, drafts, and risk item access
  - LegalMessageRepository with 4 methods for messages and file uploads
  - COLLECTIONS.LEGAL_ENGAGEMENTS and 3 SUBCOLLECTIONS constants
  - legalConstants.js with all Phase 5 constants
  - Firestore security rules isolating legal channel to participants only
  - Composite indexes for lawyer dashboard (participants+updatedAt) and deal banner (dealId+clientId)
  - DI singletons getLegalEngagementRepository() and getLegalMessageRepository()
affects:
  - 05-02 (Cloud Functions for engagement lifecycle)
  - 05-03 (lawyer dashboard UI)
  - 05-04 (legal chat UI)
  - 05-05 (risk and contract draft UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - onSnapshot with includeMetadataChanges + hasPendingWrites skip (ContractRepository pattern)
    - participants array-contains for Firestore security rule isolation
    - status-gated write rules (engagement.status == 'active' enforced in subcollection create rules)
    - lawyerIds array on deal for lawyer read access (safe default via get('lawyerIds', []))

key-files:
  created:
    - src/core/constants/legalConstants.js
    - src/domain/entities/LegalEngagement.js
    - src/domain/entities/LegalMessage.js
    - src/data/repositories/LegalEngagementRepository.js
    - src/data/repositories/LegalMessageRepository.js
  modified:
    - src/core/constants/collections.js
    - src/core/di/container.js
    - firestore.rules
    - firestore.indexes.json

key-decisions:
  - "participants array [clientId, lawyerId] stored on engagement doc enables array-contains queries and security rule isolation without get() calls at the collection level"
  - "contractDrafts and riskItems returned as plain objects (not entities) -- no behavior methods needed, just data display"
  - "lawyerIds array on deal document (with get() safe default) lets lawyers read deal context without restructuring the deal security rules"
  - "Storage paths use legal/attachments/ and legal/drafts/ prefixes to namespace legal files from conversation attachments"

patterns-established:
  - "Phase 5 repositories follow ContractRepository.subscribeToContract exactly: includeMetadataChanges:true, skip hasPendingWrites, callback(entity) or callback(null)"
  - "Security rule isolation: participants array-contains on parent doc; subcollection rules use get() to read parent engagement"
  - "Status-gated creates: subcollection create rules check parent engagement.status == 'active' via get()"

requirements-completed: [LEGAL-01, LEGAL-02, LEGAL-03]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 05 Plan 01: Legal Data Foundation Summary

**Firestore data layer for legal consulting: 2 entities, 2 repositories, participant-isolation security rules, and composite indexes for lawyer dashboard and deal banner queries**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T14:47:02Z
- **Completed:** 2026-03-10T14:52:00Z
- **Tasks:** 2
- **Files modified:** 9 (4 created, 5 updated)

## Accomplishments

- Created complete legal constants set: ENGAGEMENT_STATUS, LEGAL_MESSAGE_TYPE, RISK_SEVERITY, RISK_STATUS, QUICK_ACTIONS (client and lawyer actions), ALLOWED_LEGAL_FILE_TYPES, FLAT_PRICING
- Created LegalEngagement and LegalMessage entities following existing Deal/Contract entity pattern with Timestamp.toDate?.() conversion
- Created LegalEngagementRepository (9 methods) and LegalMessageRepository (4 methods) with real-time onSnapshot subscriptions following ContractRepository pattern
- Wired both repositories into the DI container as singletons
- Added legalEngagements Firestore security rules with participants array-contains isolation, status-gated write rules for all 3 subcollections, and lawyerIds extension on the deals read rule
- Added 3 composite indexes: participants+updatedAt (lawyer dashboard), dealId+clientId (deal banner), contractDrafts.version (draft ordering)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create legal constants, entities, and collection names** - `206efb0` (feat)
2. **Task 2: Create repositories, DI registration, Firestore rules, and indexes** - `c259ddd` (feat)

**Plan metadata:** (committed separately)

## Files Created/Modified

- `src/core/constants/legalConstants.js` - ENGAGEMENT_STATUS, LEGAL_MESSAGE_TYPE, RISK_SEVERITY, RISK_STATUS, QUICK_ACTIONS, ALLOWED_LEGAL_FILE_TYPES, FLAT_PRICING constants
- `src/domain/entities/LegalEngagement.js` - LegalEngagement entity with fromFirestore and 6 helper methods
- `src/domain/entities/LegalMessage.js` - LegalMessage entity with fromFirestore and 4 helper methods
- `src/data/repositories/LegalEngagementRepository.js` - 9-method repository for engagements, contractDrafts, riskItems
- `src/data/repositories/LegalMessageRepository.js` - 4-method repository for messages and Storage uploads
- `src/core/constants/collections.js` - Added LEGAL_ENGAGEMENTS, LEGAL_MESSAGES, CONTRACT_DRAFTS, RISK_ITEMS
- `src/core/di/container.js` - Added getLegalEngagementRepository() and getLegalMessageRepository() singletons
- `firestore.rules` - Added legalEngagements match block with full subcollection isolation; extended deals read rule with lawyerIds
- `firestore.indexes.json` - Added 3 composite indexes for legal queries

## Decisions Made

- **participants array on engagement doc**: Stores [clientId, lawyerId] directly on the engagement, enabling both array-contains queries (lawyer dashboard) and security rule isolation without additional get() calls at the collection level.
- **Plain objects for contractDrafts and riskItems**: No entity classes needed — these are display-only in the UI with no behavior methods. Timestamps converted inline in repository callbacks.
- **lawyerIds array on deal document**: Used `resource.data.get('lawyerIds', [])` syntax for safe default when field doesn't exist on older deals — avoids migration requirement.
- **Storage path namespacing**: `legal/attachments/` and `legal/drafts/` prefixes keep legal files separate from conversation attachments in Firebase Storage.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Firestore rules and indexes are deployed separately via `firebase deploy --only firestore:rules` and `firebase deploy --only firestore:indexes`.

## Next Phase Readiness

- Data layer is complete and ready for Plan 02 (Cloud Functions for engagement lifecycle: createEngagement, acceptEngagement, completeEngagement)
- Plan 03-05 (UI layers) can proceed after Plan 02 provides the Cloud Function that creates engagement documents
- firestore.rules and firestore.indexes.json should be deployed before Plan 02 testing: `firebase deploy --only firestore:rules,firestore:indexes`

## Self-Check: PASSED

- FOUND: src/core/constants/legalConstants.js
- FOUND: src/domain/entities/LegalEngagement.js
- FOUND: src/domain/entities/LegalMessage.js
- FOUND: src/data/repositories/LegalEngagementRepository.js
- FOUND: src/data/repositories/LegalMessageRepository.js
- FOUND: .planning/phases/05-legal-consulting/05-01-SUMMARY.md
- FOUND commit: 206efb0 (feat(05-01): add legal constants, entities, and collection names)
- FOUND commit: c259ddd (feat(05-01): add repositories, DI wiring, Firestore rules and indexes)

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-10*

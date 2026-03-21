---
phase: 05-legal-consulting
verified: 2026-03-12T14:00:00Z
status: human_needed
score: 8/8 requirements satisfied (automated); 1 item requires human e2e verification
human_verification:
  - test: "End-to-end legal consulting flow"
    expected: "Full flow passes: browse /lawyers -> hire a lawyer from deal page -> lawyer accepts on dashboard -> both parties use legal channel (chat, quick actions, contract draft upload, risk items) -> close engagement -> channel becomes read-only -> client submits review visible on lawyer profile"
    why_human: "Tests 5-10 and 14 from UAT were skipped because they were blocked by the dealId flow bug (now fixed by plans 07 and 08). No automated UAT re-run has been completed. The notification triggers (onLegalMessageCreated, onContractDraftCreated, onRiskItemCreated) also require deployed Cloud Functions to observe."
---

# Phase 05: Legal Consulting Verification Report

**Phase Goal:** Either deal party can independently hire a lawyer who gets a private, encrypted channel with their client and can review deals, draft contracts, and provide risk analysis — without blocking the trade flow

**Verified:** 2026-03-12T14:00:00Z
**Status:** human_needed — all automated checks pass; one human e2e verification remains
**Re-verification:** No — initial verification

**Note on Plan 05-06:** This plan was partially executed. Task 1 (Navbar lawyer links + Firestore notification triggers: `onLegalMessageCreated`, `onContractDraftCreated`, `onRiskItemCreated`) landed in commit `730ce8a` before the UAT. Task 2 (blocking human gate for end-to-end verification) has never been completed. Plans 05-07 and 05-08 (gap closure) resolved the three UAT failures. The code artifacts for 05-06 Task 1 are verified present in the codebase.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Buyer can independently hire a lawyer for a deal | VERIFIED | `hireLayyer` CF creates `legalEngagements/${dealId}_${clientId}` doc; each client gets an isolated engagement keyed by their UID |
| 2 | Seller can independently hire a different lawyer for the same deal | VERIFIED | Same CF — deterministic ID `dealId_clientId` means buyer and seller get separate engagement docs; Firestore rules isolate by participants array |
| 3 | Private messaging channel isolated from opposing party | VERIFIED | LegalBanner subscribes only with `currentUserUid` as clientId; Firestore rules enforce participants array-contains; opposing party engagement is never queried |
| 4 | Lawyer can view full deal details | VERIFIED | `hireLayyer` CF adds lawyerId to deal.lawyerIds via arrayUnion; firestore.rules deal read: `request.auth.uid in resource.data.get('lawyerIds', [])` allows lawyer to read deal; ChannelLeft renders deal info panel |
| 5 | Contract drafts with version history | VERIFIED | `useLegalChannel.uploadDraft()` calls `getMaxDraftVersion()` + 1; ChannelRight has Contract tab (latest) and Revisions tab (version timeline); `subscribeToContractDrafts` ordered by version asc |
| 6 | Risk analysis with severity levels | VERIFIED | `addRiskItem` / `updateRiskItem` in LegalEngagementRepository; ChannelRight Risks tab shows cards with low/medium/high severity badges; inline add form with severity select |
| 7 | Quick-action buttons for both lawyer and client roles | VERIFIED | QuickActionToolbar filters QUICK_ACTIONS by role key (client: 4 actions, lawyer: 4 actions); actions send `LEGAL_MESSAGE_TYPE.QUICK_ACTION` messages |
| 8 | Legal consulting is optional — deals proceed without hiring a lawyer | VERIFIED | LegalBanner is additive-only on DealPage (no gate added to deal stage transitions); UAT Test 11 confirmed pass; no deal status check gates legal hiring |

**Score:** 8/8 truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/core/constants/legalConstants.js` | VERIFIED | Exports ENGAGEMENT_STATUS, LEGAL_MESSAGE_TYPE, RISK_SEVERITY, RISK_STATUS, QUICK_ACTIONS (8 actions: 4 client + 4 lawyer), ALLOWED_LEGAL_FILE_TYPES, FLAT_PRICING=200 |
| `src/domain/entities/LegalEngagement.js` | VERIFIED | Constructor + fromFirestore + 5 helper methods (isActive, isPending, isCompleted, isParticipant, isLawyer, isClient) |
| `src/domain/entities/LegalMessage.js` | VERIFIED | Constructor + fromFirestore + 4 helper methods (isSystem, isQuickAction, isAttachment, isOwn) |
| `src/data/repositories/LegalEngagementRepository.js` | VERIFIED | 9 methods: subscribeToEngagement, subscribeToEngagementsForLawyer, subscribeToEngagementForDeal, subscribeToContractDrafts, subscribeToRiskItems, addContractDraft, addRiskItem, updateRiskItem, getMaxDraftVersion |
| `src/data/repositories/LegalMessageRepository.js` | VERIFIED | 4 methods: subscribeToMessages, sendMessage, uploadAttachment, uploadDraftFile |
| `src/core/di/container.js` | VERIFIED | getLegalEngagementRepository() at line 287, getLegalMessageRepository() at line 298 |
| `firestore.rules` | VERIFIED | legalEngagements match block with participants array-contains isolation; subcollection rules for legalMessages (create requires active + senderId==uid), contractDrafts, riskItems (lawyer-only create/update); deal read extended with lawyerIds array |
| `firestore.indexes.json` | VERIFIED | legalEngagements indexes present at lines 232 and 246 (participants+updatedAt for lawyer dashboard; dealId+clientId for banner query) |
| `functions/index.js` | VERIFIED | 4 Cloud Functions exported: hireLayyer, respondToHireRequest, closeLegalEngagement, submitLawyerReview; sendLegalNotification helper; 3 Firestore triggers: onLegalMessageCreated, onContractDraftCreated, onRiskItemCreated |
| `src/middleware.js` | VERIFIED | lawyerRoutes = ['/lawyer'] protects /lawyer/* for lawyer+admin roles; /deals/[dealId]/legal not role-restricted (auth-only, correct by design) |
| `src/app/(main)/lawyers/page.jsx` | VERIFIED | Reads dealId from useSearchParams; passes to LawyerDirectory; Suspense boundary present |
| `src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx` | VERIFIED | Accepts dealId prop; passes to each LawyerCard |
| `src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx` | VERIFIED | Accepts dealId prop; href=/profile/${id}?dealId=${dealId} when present |
| `src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx` | VERIFIED | Reads dealId from useSearchParams; calls hireLawyer(dealId, id) when dealId present; shows informational toast when absent |
| `src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx` | VERIFIED | "Find a Lawyer" button uses text-black on gold #FFD700 background; dismisses to localStorage; subscribes with currentUserUid only |
| `src/presentation/components/features/deal/DealPage/DealPage.jsx` | VERIFIED | Renders `<LegalBanner dealId={deal.id} currentUserUid={currentUserUid} />` unconditionally (no stage gate) |
| `src/app/(main)/lawyer/dashboard/page.jsx` | VERIFIED | Renders LawyerDashboard with auth + role guard |
| `src/presentation/components/features/legal/LawyerDashboard/LawyerDashboard.jsx` | VERIFIED | 268 lines; pending/active/completed sections; uses useLegalEngagements |
| `src/presentation/components/features/legal/LawyerDashboard/EngagementCard.jsx` | VERIFIED | 146 lines; shows client name, deal product, status badge; Accept/Decline/Open Channel actions |
| `src/presentation/hooks/legal/useLegalEngagement.js` | VERIFIED | 53 lines; subscribes to engagementForDeal with cleanup |
| `src/presentation/hooks/legal/useLegalEngagements.js` | VERIFIED | 85 lines; subscribes for lawyer with derived pending/active/completed splits |
| `src/presentation/hooks/legal/useLegalActions.js` | VERIFIED | 151 lines; hireLawyer, respondToHireRequest, closeLegalEngagement, submitReview |
| `src/app/(main)/deals/[dealId]/legal/page.jsx` | VERIFIED | 216 lines; auth guard; member vs lawyer engagement lookup paths; pending/no-engagement/access-denied states |
| `src/presentation/hooks/legal/useLegalMessages.js` | VERIFIED | 146 lines; subscribeToMessages + sendMessage + uploadAndSendAttachment with file type validation |
| `src/presentation/hooks/legal/useLegalChannel.js` | VERIFIED | 179 lines; subscribeToContractDrafts + subscribeToRiskItems + uploadDraft (auto-version) + addRisk + toggleRiskStatus |
| `src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx` | VERIFIED | 235 lines; 3-panel layout; uses useLegalMessages + useLegalChannel |
| `src/presentation/components/features/legal/LegalChannel/ChannelLeft.jsx` | VERIFIED | 342 lines; lawyer profile, deal info, merged documents list, consulting status |
| `src/presentation/components/features/legal/LegalChannel/ChannelCenter.jsx` | VERIFIED | 419 lines; 4 message types; auto-scroll; file attach; sendMessage wired to form submit |
| `src/presentation/components/features/legal/LegalChannel/ChannelRight.jsx` | VERIFIED | 565 lines; Contract/Revisions/Risks 3-tab panel; subscribeToContractDrafts + subscribeToRiskItems wired via useLegalChannel |
| `src/presentation/components/features/legal/LegalChannel/QuickActionToolbar.jsx` | VERIFIED | 242 lines; role-filtered actions; inline risk form; draft file picker |
| `src/app/(main)/lawyer/channels/page.jsx` | VERIFIED | 113 lines; real page (not redirect); auth + role guard; renders LawyerChannels |
| `src/app/(main)/lawyer/deals/page.jsx` | VERIFIED | 113 lines; real page (not redirect); auth + role guard; renders LawyerDeals |
| `src/presentation/components/features/legal/LawyerChannels/LawyerChannels.jsx` | VERIFIED | 204 lines; engagement list with status badges; active/completed link to /deals/{dealId}/legal; pending redirects to dashboard |
| `src/presentation/components/features/legal/LawyerDeals/LawyerDeals.jsx` | VERIFIED | 181 lines; deal-centric list; active + completed only; Open/View Channel links |
| `src/presentation/components/homepage/Navbar/Navbar.jsx` | VERIFIED | Contains "Client Channels" -> /lawyer/channels and "Deal Review" -> /lawyer/deals for ROLES.LAWYER and ROLES.ADMIN |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `container.js` | LegalEngagementRepository | `getLegalEngagementRepository()` singleton | WIRED | Lines 287+ in container.js |
| `container.js` | LegalMessageRepository | `getLegalMessageRepository()` singleton | WIRED | Lines 298+ in container.js |
| `firestore.rules legalEngagements` | participants isolation | `request.auth.uid in resource.data.participants` | WIRED | Line 333; subcollections use get() to enforce |
| `firestore.rules deal read` | lawyerIds | `request.auth.uid in resource.data.get('lawyerIds', [])` | WIRED | Line 250 |
| `functions/index.js hireLayyer` | legalEngagements collection | `admin.firestore().doc('legalEngagements/${dealId}_${uid}').set()` | WIRED | Line 3646 confirms arrayUnion to lawyerIds also wired |
| `functions/index.js hireLayyer` | deal.lawyerIds | `FieldValue.arrayUnion(lawyerId)` | WIRED | Line 3646 |
| `functions/index.js respondToHireRequest` | status transition | `runTransaction` -> status: 'active' | WIRED | Lines 3668+ |
| `functions/index.js onLegalMessageCreated` | legalMessages subcollection trigger | `onDocumentCreated('legalEngagements/{e}/legalMessages/{m}')` | WIRED | Lines 3913+ |
| `functions/index.js onContractDraftCreated` | contractDrafts trigger | `onDocumentCreated('legalEngagements/{e}/contractDrafts/{d}')` | WIRED | Lines 3959+ |
| `functions/index.js onRiskItemCreated` | riskItems trigger | `onDocumentCreated('legalEngagements/{e}/riskItems/{r}')` | WIRED | Lines 3988+ |
| `DealPage.jsx` | LegalBanner | `<LegalBanner dealId={deal.id} currentUserUid={currentUserUid} />` | WIRED | Line 195; unconditional |
| `LegalBanner` | subscribeToEngagementForDeal | via useLegalEngagement hook | WIRED | useLegalEngagement imported and used in LegalBanner |
| `/lawyers/page.jsx` | LawyerDirectory | useSearchParams extracts dealId; `<LawyerDirectory dealId={dealId} />` | WIRED | Line 46 |
| `LawyerDirectory` | LawyerCard | `<LawyerCard key={lawyer.id} lawyer={lawyer} dealId={dealId} />` | WIRED | Line 244 |
| `LawyerCard` | /profile/{id}?dealId=... | `href={dealId ? /profile/${id}?dealId=${dealId} : /profile/${id}}` | WIRED | Line 80 |
| `LawyerProfileContent` | hireLawyer CF | `hireLawyer(dealId, id)` when dealId from useSearchParams | WIRED | Lines 171-186 |
| `LegalChannel.jsx` | useLegalMessages + useLegalChannel | Both hooks called in LegalChannel render body | WIRED | Lines 83-90 |
| `ChannelCenter.jsx` | sendMessage | `sendMessage(content, LEGAL_MESSAGE_TYPE.TEXT)` on form submit | WIRED | Line 233 |
| `ChannelRight.jsx` | subscribeToContractDrafts + subscribeToRiskItems | via useLegalChannel prop (drafts, riskItems) | WIRED | Hook wires at lines 55+61 in useLegalChannel |
| `Navbar.jsx` | /lawyer/channels | nav link for ROLES.LAWYER and ROLES.ADMIN | WIRED | Line 45 |
| `Navbar.jsx` | /lawyer/deals | nav link for ROLES.LAWYER and ROLES.ADMIN | WIRED | Line 46 |
| `LawyerChannels.jsx` | useLegalEngagements | `useLegalEngagements(user?.uid)` | WIRED | Line 16 import + usage |
| `LawyerDeals.jsx` | useLegalEngagements | `useLegalEngagements(user?.uid)` | WIRED | Line 16 import + usage |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| LEGAL-01 | 01, 02, 03, 04, 07 | Buyer can independently hire a lawyer for a deal | SATISFIED | hireLayyer CF with deterministic ID; LegalBanner on DealPage; /lawyers directory; LawyerProfileContent calls hireLawyer with dealId |
| LEGAL-02 | 01, 02, 03, 04, 07 | Seller can independently hire a different lawyer for the same deal | SATISFIED | Same CF/flow; engagement ID is `dealId_clientId` so each party gets separate doc; Firestore rules isolate by participants |
| LEGAL-03 | 01, 05, 08 | Private messaging channel isolated from opposing party | SATISFIED | participants array-contains Firestore rules; LegalBanner subscribes with own UID only; LawyerChannels page lists only lawyer's engagements |
| LEGAL-04 | 01, 02, 04, 05, 08 | Lawyer can view full deal details | SATISFIED | lawyerIds arrayUnion on hire; Firestore deal read rule extended; ChannelLeft deal info panel; LawyerDeals shows deal-centric view |
| LEGAL-05 | 01, 05 | Contract drafts with version history | SATISFIED | getMaxDraftVersion + 1 auto-increment; subscribeToContractDrafts ordered by version; ChannelRight Contract + Revisions tabs |
| LEGAL-06 | 01, 05 | Risk analysis with severity levels | SATISFIED | RISK_SEVERITY constants; addRiskItem/updateRiskItem in repository; ChannelRight Risks tab with severity badges and CRUD |
| LEGAL-07 | 01, 05 | Quick-action buttons for both lawyer and client | SATISFIED | QUICK_ACTIONS with role field; QuickActionToolbar filters by isLawyer; 4 client + 4 lawyer actions |
| LEGAL-08 | 02, 04 | Legal consulting is optional | SATISFIED | LegalBanner is display-only addition; no deal stage gate added; UAT Test 11 (no-lawyer path) confirmed pass |

---

## Anti-Patterns Found

No blockers or stubs detected across scanned files. The placeholder text found in search results is all legitimate HTML input `placeholder=` attributes (form field labels), not component stubs. No `return null`, `return {}`, or `TODO/FIXME` markers found in any legal feature file.

---

## Human Verification Required

### 1. End-to-End Legal Consulting Flow (UAT Tests 5-14)

**Test:** Deploy Cloud Functions and Firestore rules, then run the full UAT sequence that was previously blocked by the dealId bug (now fixed):
- Test 5: Lawyer dashboard shows pending request from Test 4; Accept button works
- Test 6: /deals/{dealId}/legal renders 3-panel layout (left: lawyer profile + deal info + docs; center: chat; right: Contract/Revisions/Risks tabs)
- Test 7: Send text message (appears as bubble); upload attachment (appears as card + in docs list)
- Test 8: Quick-action toolbar shows role-appropriate buttons; "Flag Risk" opens inline form
- Test 9: Contract tab shows latest draft; Revisions shows version timeline; Risks tab add/toggle works
- Test 10: Close engagement -> channel becomes read-only; client sees review prompt; review appears on lawyer profile
- Test 14: Notifications fire correctly (hire request to lawyer, acceptance to client, message notification to other participant, draft notification, risk notification)

**Expected:** All 10 tests pass. Channel is fully functional. Notifications appear in the bell/notification list.

**Why human:** Tests 5-10 and 14 from the original UAT were all blocked by the dealId navigation bug (fixed in plans 07 and 08). No automated re-run has been completed since the fix. The notification triggers (onLegalMessageCreated, onContractDraftCreated, onRiskItemCreated) require deployed Cloud Functions to observe. Real-time Firestore subscription behavior cannot be verified by static code analysis alone.

---

## Gaps Summary

No automated gaps found. All 8 LEGAL requirements have supporting artifacts that exist, are substantive (not stubs), and are wired. The three gaps identified in the original UAT (Tests 3, 4, and 13) have been closed:

- **Test 3 (button contrast):** Closed — `text-black` replaces `text-[#0F1C2E]` on "Find a Lawyer" link (plan 07, commit `e4d9743`)
- **Test 4 (dealId lost in navigation):** Closed — dealId flows through all hops: LegalBanner -> /lawyers?dealId -> LawyerDirectory -> LawyerCard -> /profile?dealId -> LawyerProfileContent -> hireLawyer CF (plan 07, commits `e4d9743` + `41aa939`)
- **Test 13 (redirect stubs):** Closed — /lawyer/channels and /lawyer/deals are real functional pages with auth+role guards; Navbar shows all 3 lawyer links (plan 08, commits `6e8d3d8` + `5b021cc`)

The remaining human verification (tests 5-14) is not a gap — it is the standard blocking human gate that Plan 05-06 requires before the phase can be declared complete.

---

_Verified: 2026-03-12T14:00:00Z_
_Verifier: Claude (gsd-verifier)_

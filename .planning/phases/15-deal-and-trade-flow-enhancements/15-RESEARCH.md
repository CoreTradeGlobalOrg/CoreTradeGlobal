# Phase 15: Deal and Trade Flow Enhancements - Research

**Researched:** 2026-04-26
**Domain:** React/Next.js UI enhancements across deal/contract/quote/summary pages — no backend work
**Confidence:** HIGH (entire codebase verified by direct file inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Contract & Approval UX**
- Unaccepted clauses highlighted with yellow background tint + generic instruction text ("Please review and accept this clause")
- Accepted clauses show green checkmark + slightly muted text — clear visual distinction from pending
- All clause checkboxes always expanded (never collapsed/accordion) — user sees everything at once
- Progress indicator at both top and bottom of clause list: "X of Y clauses accepted"
- Bottom progress near the approve button — sticky/visible
- Auto-advance with toast when both parties approve all clauses — deal moves to next stage automatically
- Parties can un-accept a clause anytime until both parties have fully approved
- No "Accept All" button — each clause must be accepted individually
- Instruction text is generic (same text for all unaccepted clauses), not clause-specific

**Hire a Lawyer Placement**
- Hire a Lawyer card appears on all trade stages: Negotiation, Contract, Quotes, and Trade Summary
- Positioned below the deal round / offer area on negotiation pages
- Both buyer and seller see the card independently
- "No thanks" collapses to a slim one-line banner: "⚖️ Need legal advice? [Hire]"
- Collapsed banner has subtle gold/amber accent (left border or background tint)
- Dismissal resets per page — each trade page shows the full card fresh
- Clicking the collapsed banner re-expands the full card
- When a lawyer is already hired, card transforms to show hired lawyer's name, status, and link to legal channel
- On Trade Summary page, shows engagement summary: lawyer name, hire date, key actions taken, link to legal channel

**Skip Quotes & Trade Flow Flexibility**
- Skip button per section (insurance and logistics independently): "Skip — I'll arrange my own"
- Skipped sections show as "⚠️ Not arranged via platform" with an [Undo skip] option
- Trade summary reflects skipped sections appropriately
- Button rename: "Quote Selected" → "Confirm Coverage & Shipment"
- Trade summary message buttons: each party (buyer, seller, insurance provider, logistics provider, lawyer) gets a [✉ Chat] button that opens the existing FAB widget / /messages conversation
- Deal page messaging (negotiation/contract): message button icons that open FAB widget — no inline chat sidebar (keeps pages focused; Phase 13 handles provider chat sidebars on quote pages)
- Trade pages guide: tooltip icons (ⓘ) on key elements (Incoterms, clause sections, quote status, etc.) — hover/click shows brief explanation. Non-intrusive, available on demand.

**Form Inputs & Validation Polish**
- Deal ID visible in page header/breadcrumb area: "Deals > Deal #CTG-2024-001"
- PDF download: gold accent button/link text on the product card within deal pages
- DatePicker audit: replace ALL native HTML date inputs across trade pages with shared DatePicker component
  - DatePicker accent color: gold for product-related contexts, blue for RFQ-related contexts
  - Fix "expected string, received null" error with friendly message: "Please select a delivery date"
- Number inputs: add onFocus={e => e.target.select()} to ALL numeric inputs across deal/trade pages
- Validation messages: audit all Zod schemas to ensure messages are in English. Apply globally across deal/trade pages.

### Claude's Discretion
- Exact tooltip content for trade page guide elements
- Exact placement of the ⓘ icons on each page
- DatePicker component color prop implementation details
- How to detect hired lawyer state for card transformation
- Exact progress indicator styling (sticky bottom bar vs inline)
- Breadcrumb component creation/extension for Deal ID display

### Deferred Ideas (OUT OF SCOPE)
None — all 16 backlog items are covered in this phase.
</user_constraints>

---

## Summary

Phase 15 is a pure frontend enhancement phase — no Cloud Functions, no new Firestore collections, no schema migrations. All work modifies existing React components across four page contexts: DealPage (negotiation), ContractPage (contract review), QuotesPage (provider selection), and TradeSummaryTab (deal summary).

The phase has two architectural clusters. The first cluster (Contract UX, Hire a Lawyer, Tooltips) modifies the interaction model of existing components by adding visual states and behaviors that are entirely local to the component tree. The second cluster (form polish, DatePicker audit, number inputs, validation messages, Deal ID, PDF download) is a systematic sweep across every deal/trade form — roughly 12 files contain `type="number"` inputs and all need `onFocus` handlers.

The biggest complexity is the Hire a Lawyer card behavior change: the current `LegalBanner` component dismisses via localStorage and never re-shows on the same page. The new spec requires "dismissal resets per page" — meaning no localStorage persistence, just per-render local state. The existing `EngagementBadge` (shows when lawyer is hired) maps to the new "card transforms to show hired lawyer" behavior, so that branch is already implemented; the dismiss-and-slim-banner behavior is entirely new.

**Primary recommendation:** Organize plans by page context (Contract page, DealPage, QuotesPage, TradeSummary), not by feature type, so each plan modifies one cohesive component tree.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18+ | Component model | Existing project foundation |
| Next.js App Router | 15+ | Page routing, layouts | Existing project foundation |
| Tailwind CSS | 3+ | Utility-first styling | All existing components use it |
| lucide-react | Latest | Icon set | Used throughout — Scale, Check, Info, MessageCircle, etc. |
| zod | 3+ | Schema validation | Phase 7 standard: zodResolver on every form |
| react-hook-form | 7+ | Form state | Phase 7 standard: mode:onSubmit, reValidateMode:onBlur |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-day-picker | v9 | DatePicker internals | Already in DatePicker.jsx — extend accent colors only |
| date-fns | Latest | Date formatting | Already used in DatePicker — format(), parse(), isValid() |
| react-hot-toast | Latest | Toast notifications | Used for auto-advance toast on contract approval |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local state for dismiss | localStorage | User spec says "resets per page" — localStorage would persist across navigations, which is wrong for the new behavior |
| Custom tooltip | Radix UI Tooltip | Radix not in existing stack; a simple CSS/state tooltip matches existing code patterns |

**Installation:** No new packages needed — all required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files this phase creates:

```
src/presentation/components/common/
├── Tooltip/
│   └── Tooltip.jsx              # Reusable ⓘ tooltip wrapper (Claude's discretion)

src/presentation/components/features/contract/
├── ClauseAccordion/
│   └── ClauseAccordion.jsx      # MODIFY: always-expanded, yellow/green clause rows, progress bar
├── ContractPage/
│   └── ContractPage.jsx         # MODIFY: LegalBanner addition, bottom progress bar

src/presentation/components/features/deal/
├── DealPage/
│   └── DealPage.jsx             # MODIFY: Deal ID breadcrumb, message buttons, LegalBanner behavior
├── ProductHero/
│   └── ProductHero.jsx          # MODIFY: PDF download button, Deal ID
├── TradeSummary/
│   ├── PartiesProvidersSection.jsx  # MODIFY: [✉ Chat] buttons per party
│   └── LegalConsultingSection.jsx  # MODIFY: engagement summary + [✉ Chat]

src/presentation/components/features/legal/
└── LegalBanner/
    └── LegalBanner.jsx          # MODIFY: slim collapsed banner, per-page dismissal

src/presentation/components/features/quote/
├── QuotesPage/
│   └── QuotesPage.jsx           # MODIFY: skip buttons per section, LegalBanner
└── QuotesSidebar/
    └── QuotesSidebar.jsx        # MODIFY: button rename to "Confirm Coverage & Shipment"
```

### Pattern 1: Always-Expanded Clause Rows with Visual State

**What:** Remove accordion expand/collapse from ClauseAccordion. All clauses visible at all times. Each clause row has a yellow background when unaccepted, green check icon + muted text when accepted.

**When to use:** ContractPage only.

**Current ClauseAccordion behavior:**
- Accordion: clauses hidden until section expanded
- Checkboxes disabled until section "has ever been expanded"
- `isExpanded` / `hasEverExpanded` state in `useContractActions`

**New behavior:**
- Remove accordion toggle UI — always show clause content
- Remove `isExpanded`/`hasEverExpanded` gating — all checkboxes always enabled (for non-read-only state)
- Add `bg-yellow-900/20 border-l-2 border-yellow-500/60` to unaccepted clause rows
- Add `bg-green-900/10` + `Check` icon + `text-[#8899AA]` muted text to accepted clause rows
- Generic instruction text under each unaccepted clause: "Please review and accept this clause"

```jsx
// Clause row visual state pattern (Source: CONTEXT.md decisions + Phase 7 Tailwind patterns)
function ClauseRow({ clause, isMyApproved, isReadOnly, onToggle, ... }) {
  return (
    <div className={[
      'flex items-start gap-3 py-3 px-3 rounded-lg border-l-2 transition-colors',
      isMyApproved
        ? 'bg-green-900/10 border-green-500/40'
        : 'bg-yellow-900/15 border-yellow-500/50',
    ].join(' ')}>
      {/* clause content */}
      {!isMyApproved && (
        <p className="text-xs text-yellow-500/80 mt-1">
          Please review and accept this clause
        </p>
      )}
    </div>
  );
}
```

### Pattern 2: Dual Progress Indicator (Top + Bottom)

**What:** "X of Y clauses accepted" shown at top of clause list AND at bottom near the submit button. Bottom bar is sticky.

**Implementation:** Progress derived from `localApprovedClauses.size` (already in `useContractActions`) vs `contract.clauses.length`.

```jsx
// Progress bar pattern (Source: CONTEXT.md)
function ClauseProgressBar({ approved, total }) {
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#8899AA]">{approved} of {total} clauses accepted</span>
        <span className="text-[#FFD700] font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#2A3B52] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#FFD700] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

### Pattern 3: LegalBanner — Per-Page Dismiss + Slim Collapsed State

**What:** Current behavior — localStorage dismiss that persists across page visits. New behavior — local React state only, resets on every page mount. Dismissal shows slim one-line banner (not `null`).

**Key change:** Remove all localStorage reads/writes from LegalBanner. Replace with `useState(false)` for `dismissed`. When dismissed, render slim banner, not `null`.

```jsx
// LegalBanner dismiss pattern (Source: CONTEXT.md + existing LegalBanner.jsx inspection)
const [dismissed, setDismissed] = useState(false);

// No localStorage reads/writes in this phase

if (dismissed) {
  return (
    <button
      onClick={() => setDismissed(false)}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                 border-l-4 border-amber-500/60 bg-amber-900/10 text-left
                 hover:bg-amber-900/20 transition-colors"
    >
      <span className="text-amber-400 text-sm">⚖️</span>
      <span className="text-xs text-[#8899AA]">Need legal advice?</span>
      <span className="text-xs font-semibold text-[#FFD700] hover:text-[#FFE44D]">Hire a Lawyer</span>
    </button>
  );
}
```

**Note on contract page and quotes page:** The CONTEXT says LegalBanner appears on "all trade stages: Negotiation, Contract, Quotes, and Trade Summary". Currently it only exists in DealPage. It must be added to ContractPage and QuotesPage — both already import similar patterns.

### Pattern 4: Skip Section Buttons (Quotes Page)

**What:** Insurance and logistics sections on QuotesPage each get a "Skip — I'll arrange my own" button. Skipped sections show a warning state with Undo. This is client-side local state only — no Firestore writes needed. The skip state informs the "Confirm Coverage & Shipment" button logic (can confirm even without selecting providers).

```jsx
// Skip state pattern (Source: CONTEXT.md)
const [skippedInsurance, setSkippedInsurance] = useState(false);
const [skippedLogistics, setSkippedLogistics] = useState(false);

// Skipped section render
{skippedInsurance ? (
  <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-amber-900/10 border border-amber-500/30">
    <span className="text-amber-400 text-sm">⚠️</span>
    <span className="text-xs text-[#8899AA]">Not arranged via platform</span>
    <button
      onClick={() => setSkippedInsurance(false)}
      className="ml-auto text-xs text-[#FFD700] hover:text-[#FFE44D] underline"
    >
      Undo skip
    </button>
  </div>
) : (
  /* normal quote grid */
)}
```

### Pattern 5: Chat Buttons Using MessagesContext

**What:** [✉ Chat] buttons on TradeSummary's PartiesProvidersSection open the FAB widget for the conversation with that party. Uses `openConversation(conversationId)` from `MessagesContext`.

**Conversation ID discovery:** The existing messaging infrastructure uses deterministic conversation IDs. For buyer/seller conversations: look up existing conversation by participants. For provider conversations: `providerquote_${dealId}_${providerId}`.

```jsx
// Chat button pattern (Source: MessagesContext.jsx inspection)
import { useMessagesContext } from '@/presentation/contexts/MessagesContext';

function ChatButton({ conversationId, label }) {
  const { openConversation } = useMessagesContext();
  return (
    <button
      onClick={() => conversationId && openConversation(conversationId)}
      disabled={!conversationId}
      className="inline-flex items-center gap-1 text-xs text-[#8899AA] hover:text-[#FFD700] transition-colors disabled:opacity-40"
      title={`Message ${label}`}
    >
      <MessageCircle size={12} />
      Chat
    </button>
  );
}
```

### Pattern 6: Deal ID in Header/Breadcrumb

**What:** Display the deal's Firestore document ID in a human-readable "Deal #CTG-..." format. The deal's `id` field is the Firestore document auto-ID (e.g., `abc123xyz`). The user spec says "Deal #CTG-2024-001" — this implies a formatted short ID, not the raw Firestore ID.

**Resolution (Claude's discretion):** Two options:
1. Show raw Firestore ID truncated: "Deal #abc123xz" — simple, no data changes
2. Use deal document `createdAt` + a sequential counter — requires data or index lookups

**Recommended:** Show a truncated version of the Firestore ID (first 8 chars uppercase) with `#` prefix: `Deal #${deal.id.slice(0, 8).toUpperCase()}`. This requires no Firestore changes and is unambiguous to users. The breadcrumb lives in `ProductHero.jsx` which already has access to `deal.id`.

### Pattern 7: Number Input onFocus Auto-Select

**What:** Add `onFocus={e => e.target.select()}` to every `type="number"` input across deal/trade pages.

**Scope (verified by grep):** 28 total `type="number"` inputs across 12 files:
- `DealFormFields.jsx` (3 inputs)
- `DealFormSidebar.jsx` (1 input)
- `CounterOfferForm.jsx` (3 inputs)
- `FreightEstimatorWidget.jsx` (2 inputs)
- `QuoteFormLogistics.jsx` (2 inputs)
- `CommercialRiskSection.jsx` (3 inputs)
- `PremiumAdditionsSection.jsx` (1 input)
- `PoliticalRiskSection.jsx` (2 inputs)
- `CargoMarineSection.jsx` (5 inputs)
- `ProductForm.jsx` (2 inputs)
- `SubmitQuoteDialog.jsx` (2 inputs)
- `RequestForm.jsx` (2 inputs)

**Note:** CONTEXT says "across deal/trade pages" — ProductForm, RequestForm, SubmitQuoteDialog may be outside scope. Plan should clarify: include all 12 files or only the deal/quote-specific ones (first 8 files = 22 inputs).

### Pattern 8: DatePicker — Gold Accent Color

**What:** The existing `DatePicker.jsx` already supports `accentColor` prop with values: `'orange'`, `'green'`, `'blue'`, `'emerald'`. The spec requires a gold accent for product-related contexts.

**Gap:** `'gold'` is not in the current `ACCENT_MAP`. Must add it.

```jsx
// Add to ACCENT_MAP in DatePicker.jsx (Source: DatePicker.jsx inspection)
gold: {
  selected: 'bg-[#FFD700] text-[#0F1C2E]',
  today: 'border-[#FFD700]',
  focus: 'focus:border-[#FFD700]/50',
  icon: 'text-[#FFD700]',
  chevron: 'fill-[#FFD700]',
},
```

### Pattern 9: Tooltip Component

**What:** A reusable `Tooltip.jsx` wrapper — shows an ⓘ icon; hover/click reveals brief explanation text. Non-modal, non-intrusive.

**Implementation approach (Claude's discretion):** Use a simple React state tooltip with absolute positioning — no library needed. The existing pattern in this codebase avoids Radix UI for small UI utilities.

```jsx
// Tooltip pattern (Source: existing codebase patterns)
function Tooltip({ content, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-[#4A5B6E] hover:text-[#8899AA] transition-colors"
      >
        {children || <Info size={13} />}
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                        w-48 bg-[#1A283B] border border-[#2A3B52] rounded-lg
                        p-2.5 text-xs text-[#8899AA] shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4
                          border-transparent border-t-[#2A3B52]" />
        </div>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **localStorage for per-page dismiss:** The new spec requires fresh card on each page visit — localStorage persists across navigations (wrong). Use only `useState`.
- **Firestore writes for skip state:** Quote skip is UI-only local state. No persistence needed for v1.
- **Collapsing clause sections:** CONTEXT explicitly forbids accordion behavior — all clauses must always be visible.
- **"Accept All" button:** Explicitly excluded. Do not add even as a shortcut.
- **Inline chat sidebar on deal/contract pages:** Only quote pages have the full chat sidebar (Phase 13). Deal/contract pages open the FAB widget instead.
- **Using raw Firestore document ID directly as Deal ID display:** Truncate and format it for readability.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date input | Native `<input type="date">` | Existing `DatePicker` component | Consistent dark theme, no browser styling inconsistencies |
| Toast on contract approval | Custom toast UI | `react-hot-toast` (already in project) | Already used elsewhere for notifications |
| Icon for chat button | SVG from scratch | `MessageCircle` from lucide-react | Consistent with existing icon set |
| Tooltip | Third-party library | Simple `useState` + absolute position | No Radix UI in stack; simpler is better for small utility |
| Progress calculation | Complex logic | `localApprovedClauses.size / contract.clauses.length` | Already tracked in `useContractActions` |

**Key insight:** This phase is all about extending existing components, not building new infrastructure. Every feature attaches to something that already exists.

---

## Common Pitfalls

### Pitfall 1: LegalBanner CONTEXT.md Behavior vs Current Implementation

**What goes wrong:** Implementing the slim banner as a "hide on dismiss, re-show on click" using the existing localStorage key — but localStorage persists across page navigations so the collapsed state carries over from DealPage to ContractPage.

**Why it happens:** The current `LegalBanner` uses `localStorage.setItem(DISMISS_KEY(dealId), 'true')` and reads it on mount. The new spec says "resets per page" — each page mount should show the full card.

**How to avoid:** Remove all localStorage usage from `LegalBanner`. Use only `const [dismissed, setDismissed] = useState(false)`. The dismissed state lives only in the component's React lifecycle — navigating to a new page creates a fresh component instance.

**Warning signs:** If the collapsed banner appears on page load without the user clicking "No thanks", localStorage is still being read.

### Pitfall 2: ClauseAccordion Always-Expanded Breaks useContractActions State

**What goes wrong:** The existing `useContractActions` hook manages `expandedSections` and `hasExpanded` Sets — the "must expand before approve" pattern. Removing accordion behavior means these Sets are no longer meaningful, but the hook still initializes all sections as "not expanded" — leaving checkboxes disabled.

**Why it happens:** `isCheckboxActive={hasEverExpanded}` in `ClauseRow` disables the checkbox until section has been expanded. If we keep this logic but never call `onSectionToggle`, checkboxes stay disabled forever.

**How to avoid:** In `ContractPage.jsx`, pass `hasEverExpanded={true}` unconditionally for all sections (since we're always showing all content). Alternatively, initialize `hasExpanded` in `useContractActions` to contain all section IDs from the start.

**Warning signs:** Contract page shows all clauses but checkboxes are greyed out and cursor-not-allowed.

### Pitfall 3: Chat Buttons Need Conversation IDs — May Not Exist Yet

**What goes wrong:** PartiesProvidersSection renders [✉ Chat] buttons for buyer, seller, insurance provider, logistics provider, and lawyer. But the conversation between buyer and seller may not exist as a messaging `Conversation` document if they haven't messaged before.

**Why it happens:** The platform's conversations are created on first message, not pre-created when a deal starts.

**How to avoid:** Make chat buttons gracefully disabled when `conversationId` is null/undefined. `openConversation(null)` should be guarded. Display a tooltip: "Start a conversation to chat". For provider conversations, the deterministic ID pattern (`providerquote_${dealId}_${providerId}`) can be constructed without a lookup, but the conversation must exist in Firestore for the FAB widget to show it.

**Warning signs:** FAB widget opens but shows blank conversation, or `openConversation` throws on null ID.

### Pitfall 4: DatePicker Gold Accent Color Not in ACCENT_MAP

**What goes wrong:** Passing `accentColor="gold"` to DatePicker returns `ACCENT_MAP.blue` (the default fallback) because 'gold' is not in the map.

**Why it happens:** Current `ACCENT_MAP` only defines: orange, green, blue, emerald.

**How to avoid:** Add 'gold' entry to `ACCENT_MAP` before using it. The selected day background must be `bg-[#FFD700]` with `text-[#0F1C2E]` for contrast (matches platform-wide pattern).

**Warning signs:** DatePicker on deal forms shows blue highlight instead of gold after the audit.

### Pitfall 5: Zod `deliveryDate` Null Issue Already Requires `z.string().nullable()`

**What goes wrong:** The CONTEXT mentions fixing "expected string, received null" with friendly message "Please select a delivery date". This error comes from Zod rejecting null where a string is expected.

**Why it happens:** `DatePicker` returns empty string `''` on clear, but the field may be initialized as `null` from the deal data. Zod `z.string()` rejects `null`.

**How to avoid:** Change Zod schema to `z.string().nullable().refine(v => v && v.length > 0, 'Please select a delivery date')` or `z.string().min(1, 'Please select a delivery date')` with a default of `''` in the form. Verify `offerSchema.js` and `submitQuoteSchema.js` (already in English — no Turkish messages found in audit).

**Warning signs:** Form submission shows "Expected string, received null" in console or validation fails silently.

### Pitfall 6: QuotesSidebar "Confirm" Button Rename Affects Cloud Function Contract

**What goes wrong:** The "Quote Selected" button in QuotesSidebar calls `actions.confirmSelection(deal.id)` which maps to the `acceptQuote` / `confirmProviders` Cloud Function. Renaming the button text is UI-only but the confirmation modal text also needs updating.

**Why it happens:** The button text appears in at least two places: the button itself and the ConfirmDialog message.

**How to avoid:** Search for both "Quote Selected" and the confirm dialog message text and update both. New text: "Confirm Coverage & Shipment".

---

## Code Examples

Verified patterns from official sources (direct file inspection):

### Progress Bar at Bottom of Clause List (Sticky)

```jsx
// Source: ContractPage.jsx structure + CONTEXT.md spec
// Add to ContractPage.jsx, inside the "Main column" div, after all ClauseAccordion maps
<div className="sticky bottom-4 z-10">
  <div className="bg-[#1A283B] border border-[#2A3B52] rounded-xl p-3 shadow-lg shadow-black/40">
    <ClauseProgressBar
      approved={actions.localApprovedClauses?.size ?? 0}
      total={contract?.clauses?.length ?? 0}
    />
    {/* Submit button lives here at the bottom, too */}
    {!hasISubmitted && !isFullyApproved && (
      <div className="mt-3">
        <SubmitApprovalsButton ... />
      </div>
    )}
  </div>
</div>
```

### LegalBanner on Contract Page

```jsx
// Source: ContractPage.jsx — add after ApprovalProgressBar
// Uses same LegalBanner component already used in DealPage
import { LegalBanner } from '@/presentation/components/features/legal/LegalBanner/LegalBanner';

// In ContractPage JSX, after <ApprovalProgressBar />:
<LegalBanner dealId={deal.id} currentUserUid={currentUserUid} />
```

### Deal ID in ProductHero

```jsx
// Source: ProductHero.jsx + CONTEXT.md spec
// Add to the product info div in ProductHero.jsx
const shortDealId = deal.id ? deal.id.slice(0, 8).toUpperCase() : null;

// In JSX, above productCategory badge or as breadcrumb:
{shortDealId && (
  <p className="text-[10px] text-[#4A5B6E] mb-1">
    Deal <span className="text-[#8899AA] font-mono">#{shortDealId}</span>
  </p>
)}
```

### Number Input onFocus Select

```jsx
// Source: CONTEXT.md decision — add to every type="number" input
<input
  type="number"
  onFocus={e => e.target.select()}
  {...register('price')}
  className="..."
/>
```

### PDF Download in ProductHero

```jsx
// Source: ProductHero.jsx + DocumentsSection.jsx pattern
// deal.pdfUrl is the product's PDF (from product data on the deal)
{deal.productPdfUrl && (
  <a
    href={deal.productPdfUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs text-[#FFD700] hover:text-[#FFE44D] underline transition-colors"
    title="Download product PDF"
  >
    <Download size={12} />
    PDF
  </a>
)}
```

**Note:** Verify `deal.productPdfUrl` field name against the Deal entity and Firestore schema before implementation.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native `<input type="date">` | Shared `DatePicker` component with react-day-picker v9 | Phase 11 | Consistent dark theme; all new date inputs use it |
| Accordion clause sections | Always-expanded clause list | Phase 15 | Users see all clauses at once; clearer review UX |
| LegalBanner localStorage dismiss (persists across pages) | Per-render local state dismiss | Phase 15 | Fresh card on each trade page visit |
| "Quote Selected" button text | "Confirm Coverage & Shipment" | Phase 15 | Clearer action description |

**Deprecated/outdated patterns in this phase:**
- `onSectionToggle` and `hasEverExpanded` in `useContractActions` — still needed for backward compatibility but no longer drives UX gating
- localStorage `${dealId}_legal_banner_dismissed` key — no longer written or read

---

## Open Questions

1. **PDF download field name on Deal entity**
   - What we know: `DocumentsSection.jsx` links to `/deals/${deal.id}/contract` for contract PDF. `ProductHero` has `deal.productImage` and `deal.productId` but no explicit `productPdfUrl`.
   - What's unclear: Whether products store a PDF URL, and whether it is denormalized onto the Deal document.
   - Recommendation: Inspect `Deal.js` entity and Firestore product documents to find the correct field name before implementing the PDF download button. If no PDF field exists, render nothing (conditional render is already the pattern).

2. **Conversation ID lookup for TradeSummary chat buttons**
   - What we know: Provider conversations use deterministic ID `providerquote_${dealId}_${providerId}`. Buyer/seller direct conversation ID is not deterministic.
   - What's unclear: How to efficiently find the buyer-seller conversation ID from within TradeSummary.
   - Recommendation: `ConversationRepository.getConversationsByUserId` already loads conversations. The TradeSummary can filter loaded conversations for one where participants include both `deal.buyerId` and `deal.sellerId`. Alternatively, use `null` for buyer/seller chat and only show chat buttons for providers and lawyer (where IDs are deterministic). Flag for planner decision.

3. **Scope of number input onFocus — deal/trade pages only or all forms?**
   - What we know: CONTEXT says "across deal/trade pages". ProductForm and RequestForm are admin/provider-facing, not deal pages.
   - What's unclear: Whether provider QuoteForm inputs (CargoMarineSection, PoliticalRiskSection, etc.) count as "trade pages".
   - Recommendation: Include all files under `src/presentation/components/features/deal/` and `src/presentation/components/features/quote/` (8 files, 22 inputs). Exclude `ProductForm.jsx` and `RequestForm.jsx` as non-deal pages. Include provider QuoteForm sections since they are part of the trade flow.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, pytest.ini, or test/ directory found |
| Config file | None |
| Quick run command | N/A — manual browser testing |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONTRACT-UX | Yellow highlight + green checkmark on clause rows | manual | Browser: /deals/[id]/contract | N/A |
| CONTRACT-PROGRESS | Progress bar top + bottom of clause list | manual | Browser: /deals/[id]/contract | N/A |
| CONTRACT-EXPAND | All clauses always visible (no accordion collapse) | manual | Browser: /deals/[id]/contract | N/A |
| LAWYER-ALL-PAGES | LegalBanner appears on negotiation, contract, quotes, summary | manual | Browser: each deal stage page | N/A |
| LAWYER-SLIM | "No thanks" collapses to slim gold banner, click re-expands | manual | Browser: click dismiss | N/A |
| SKIP-QUOTES | Skip insurance/logistics sections independently | manual | Browser: /deals/[id]/quotes | N/A |
| CHAT-BUTTONS | [✉ Chat] buttons in TradeSummary open FAB widget | manual | Browser: TradeSummary tab | N/A |
| DEAL-ID | Deal ID visible in ProductHero breadcrumb | manual | Browser: /deals/[id] | N/A |
| PDF-DOWNLOAD | Gold PDF download link in ProductHero | manual | Browser: /deals/[id] | N/A |
| DATEPICKER | All native date inputs replaced with DatePicker | manual | Grep: type="date" returns 0 | N/A |
| NUM-FOCUS | onFocus auto-selects number input content | manual | Browser: click number input | N/A |
| VALIDATION | English-only validation messages | manual | Submit empty forms, check messages | N/A |

### Sampling Rate
- **Per task commit:** Manual browser smoke-test of modified page
- **Per wave merge:** Full deal flow walkthrough (negotiation → contract → quotes → summary)
- **Phase gate:** All 16 backlog items verified in browser before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements (manual testing only; no automated test framework in project).

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `ContractPage.jsx`, `ClauseAccordion.jsx`, `LegalBanner.jsx`, `DealPage.jsx`, `DealSidebar.jsx`, `ProductHero.jsx`, `DatePicker.jsx`, `PartiesProvidersSection.jsx`, `LegalConsultingSection.jsx`, `QuotesSidebar.jsx`, `QuotesPage.jsx (route)`, `MessagesContext.jsx`, `dealConstants.js`, `incoterms.js`
- Direct grep: All `type="number"` inputs (28 instances, 12 files); all `type="date"` inputs (0 — already migrated or not present)
- Direct grep: Zod validation messages (English only — no Turkish strings found)
- `.planning/phases/15-deal-and-trade-flow-enhancements/15-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — Phase 3 contract patterns, Phase 5 legal patterns, Phase 11 DatePicker patterns

### Tertiary (LOW confidence)
- `deal.productPdfUrl` field existence — not directly verified from Deal entity file; conditional render will handle gracefully if absent

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack verified by direct file inspection
- Architecture: HIGH — all integration points verified; existing component structure understood
- Pitfalls: HIGH — all pitfalls derived from actual code behavior, not assumptions
- Open questions: MEDIUM — conversational-ID lookup strategy and PDF field name need entity-level verification before implementation

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (stable codebase; no external API dependencies in this phase)

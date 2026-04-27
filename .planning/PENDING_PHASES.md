# Pending Phases — Backlog from BUG FIX.docx + User Discussion

**Source:** `other_items/BUG FIX.docx` (Turkish, 71 items) + conversation on 2026-04-08
**Status:** Discussed but not yet added to roadmap. Phase 9 (urgent unsubscribe) already created separately.

---

## Phase Order (after Phase 9 — Unsubscribe Page)

| # | Phase | Notes |
|---|---|---|
| **Phase 9** | Cold email unsubscribe page (signed tokens + Firestore + Sheets sync) | ✅ Already added to roadmap (urgent) |
| **Phase 10** | Settings Page (move account deletion + password reset off profile) | ⏸ Scope to discuss further before adding |
| **Phase 11** | UI/UX Polish & Visual Fixes | From BUG FIX |
| **Phase 12** | Notifications & Email System | From BUG FIX |
| **Phase 13** | Messaging & Communication Improvements | From BUG FIX |
| **Phase 14** | Deal & Trade Flow Enhancements | From BUG FIX |
| **Phase 15** | Insurance Quote System Overhaul (LARGE) | From BUG FIX |
| **Phase 16** | Product & RFQ Features | From BUG FIX |
| **Phase 17** | Registration, Onboarding & Misc | From BUG FIX |

---

## Settings Page (Phase 10 — needs scope discussion)

**Confirmed scope:**
- New `/settings` page
- Move from profile page: Account Deletion + Password Reset

**To discuss before creating phase:**
- Notification preferences?
- Language preference?
- Email subscription preferences (separate from cold email unsubscribe)?
- 2FA?
- Profile field management?

---

## Phase 11: UI/UX Polish & Visual Fixes

1. Profile settings page (top-right profile button) — _moved to Phase 10 if it becomes Settings_
2. Fair card design — add country flag, more colorful bottom section
3. Fair & news card colors — lighter tones, **gold border** to distinguish from background
4. Hero slogan — try silver color
5. Fairs page sorting — newest first; collapsible past fairs section with divider + dropdown
6. Featured cards — unselectable (no copy/select with mouse)
7. Navbar scroll overlap — text too close to navbar at top of page
8. Hero globe rotation — slow down by 20%
9. Navbar shortening + currency marquee moved to top
10. Homepage lazy loading — images load too slowly
11. Delete button wording — clarify to avoid misunderstanding
12. Date picker consistency — use same component (like insurance page) across all pages
13. Product stock image — better placeholder for products without images
14. Featured cards uncopyable

---

## Phase 12: Notifications & Email System

1. New member push notifications — currently only in-app, send push too
2. RFQ notifications — notify all members when new RFQ created (may already exist — verify first)
3. Notification center page — currently shows only last 5
4. Trade notifications sender — change from `info@` to `noreply@`
5. Email on new message — max 1 email/day per user when messages received
6. Auto email designs + SMTP connection
7. Enable push notifications — fix the broken setup
8. LinkedIn share — share news excerpt as text content

---

## Phase 13: Messaging & Communication Improvements

1. Report & block in messages (V2)
2. Contact seller info hidden — show seller info in message window before sending
3. Dual chat opening bug — both full chat and floating chat open simultaneously
4. Insurance provider messaging — insurer and company can chat on insurance page right side
5. Provider dashboard rename — "Quote Requests" (insurance), "Logistics Requests" (logistics)

---

## Phase 14: Deal & Trade Flow Enhancements

1. Contract review — highlight unaccepted clauses in yellow + clear instruction text
2. Tickable checkboxes — always visible (not collapsed)
3. Skip logistics/insurance quote — allow proceeding without selecting
4. Hire a Lawyer on all trade pages, collapsible with "No thanks" (shrinks, doesn't disappear)
5. Negotiation page Deal ID — show reference number on page (currently only in URL)
6. Hire a Lawyer card position — move below deal round
7. Download PDF visibility — yellow text, embed in product card on deal page
8. Quote selected → "Confirm coverage and shipment status update" rename
9. Trade summary — message buttons for seller, ins/log providers, lawyer
10. Trade pages guide — explain what each element is
11. Delivery Date — controlled date picker (react-datepicker/flatpickr) instead of native HTML input
12. Date error message — replace "Invalid input: expected string, received null" with friendly message
13. Number inputs — `onFocus={e => e.target.select()}`
14. Validation messages — verify language/locale (not Turkish-only for everyone)
15. Deal page messaging — buyer/seller/provider chat button within deal
16. Hire a Lawyer kicks off where user clicks no thanks — shrinks, available later

---

## Phase 15: Insurance Quote System Overhaul (LARGE)

### 🔴 Critical — Must Add

**1. Deal Information Panel** (left sidebar additions)
- Buyer name + country (e.g., "Ata Commerce", "US")
- Seller name + country (e.g., "SFKC İnşaat Ltd. Şti.", "TR")
- Payment Terms — "30-Day Payment" / "60-Day Payment" / "Letter of Credit" / "Cash in Advance"
- Insurance arrangement — "Buyer provides" / "Seller provides"
- Quote requested risk types — labels for "Commercial Risk", "Cargo / Marine", "Political Risk"

**2. Commercial Risk Insurance Section** (NEW — doesn't exist)
- Coverage Limit (numeric, e.g., 5,000 USD)
- Currency: USD / EUR / GBP / TRY / CHF
- % of Loss Covered: 70/75/80/85/90/95/100
- Coverage Basis: Single-buyer, Whole-turnover policy, Excess of loss
- Waiting Period for Protracted Default: 60/90/120/180 days after due date

**3. Political Risk Insurance Section** (NEW — doesn't exist)
- Coverage Limit (numeric)
- Currency: USD / EUR / GBP / TRY
- % of Loss Covered: 80/85/90/95/100
- Included Political Perils (checkboxes):
  - Government expropriation
  - Transfer / convertibility block
  - War & civil disturbance
  - Import / export embargo
  - Contract frustration
  - Licence cancellation

**4. Cargo / Marine — % of Loss Covered**
- Add to existing ICC A/B/C selection
- Values: 70/75/80/85/90/95/100

**5. Quote Status** (NEW)
- Indicative — subject to full underwriting review
- Firm — bindable within validity period

**6. Binding Conditions** (when Firm selected)
- Free text area, e.g., "Binding subject to receipt of signed contract, KYC clearance, first premium payment"

### 🟠 Important

**7. Exclusions Section** (currently only has Notes textarea)
- Checkbox list:
  - Pre-existing disputes
  - Wilful default by insured
  - Sanctions — OFAC / EU / UN
  - Nuclear / radiological
  - Cyber attack
  - Delay / loss of market
  - Inherent vice
  - Insufficient packaging
  - Consequential losses
- Plus free text area for deal-specific exclusions

**8. Conditions Precedent** (documents required for policy activation)
- Checkbox list:
  - Signed commercial contract
  - Letter of Credit in place
  - Pre-shipment inspection certificate
  - Valid export licence
  - Clean bill of lading
  - Credit limit approval for buyer
- Plus free text area

**9. Claims Handling Section**
- Claims Jurisdiction dropdown: England & Wales, Germany, France, Netherlands, Turkey, USA — New York, Singapore, Other
- Estimated Claims Response Time dropdown:
  - Acknowledgement within 5 business days
  - Full assessment within 30 days
  - Full assessment within 60 days
  - Full assessment within 90 days
- Claims contact email field

**10. Premium Section Additions**
- Rate (% of insured value) — optional numeric, e.g., 0.50%
- Premium Payment Terms dropdown:
  - 100% upfront on binding
  - 50% on binding, 50% on inception
  - Quarterly instalments
  - Annual — single premium

### 🟡 Nice to Have

**11. Quote Summary Panel** (pre-submit screen)
- Selected risk types
- Total premium and currency
- Quote status (Indicative / Firm)
- Validity date
- Delivery method (Platform + email)

**12. Message to Buyer** field
- Free text area for "alternative structures, higher limits, other info buyer should know"

---

## Phase 16: Product & RFQ Features

1. RFQ reporting — report cards + communicate with reporter via messages (V2)
2. Target budget range — "0 = will be negotiated" option for certain numbers (V2)
3. Favorite products + share button
4. CSV bulk product upload
5. Quote details on page — show submitted quote info at bottom
6. Product category sidebar — categories with search on All Products page
7. Product image zoom on hover
8. Product request upload page — dedicated page (currently modal closes on outside click)
9. Deal start button on product detail page
10. New RFQ → notify all members in-app + email (verify if already done)

---

## Phase 17: Registration, Onboarding & Misc

1. Company Type at register — Trade Company / Logistics Company / Insurance Company
2. Phone number extension picker — auto-fill country code based on country selection
3. New member onboarding guide
4. Register page crashes on Vercel preview — fix
5. FAQ text updates (V2)
6. "Upload my products" request button on profile — admin gets notified, uploads for user
7. Chatbot on homepage — Zoho SalesIQ option (https://www.zoho.com/salesiq/pricing.html?src=headermenu) + manual reply chat
8. Cookies compliance updates
9. Accessibility completion — full audit
10. Erişilebilirlik tamamlanacak (accessibility)

---

## Items marked (V2)

These were noted in the source as V2 / future. Decide whether to defer or include in current milestone:
- RFQ reporting + reporter communication
- Target budget range with "0=negotiate"
- FAQ text updates
- Report & block in messages

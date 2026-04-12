# Phase 10: Settings Page - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a dedicated `/settings` page. Move account deletion, password reset, and logout off the profile page into settings. Add 2FA (TOTP), notification preferences, and email subscription toggles. Fix the user dropdown menu transparency bug. Profile page editing for company/product fields remains unchanged.

</domain>

<decisions>
## Implementation Decisions

### Page layout & structure
- Single scrollable page with vertical stacked glass-card sections (matches existing profile page pattern)
- Full width layout (same as other pages)
- Compact user header at top: small avatar + name + email for account context
- "Back to Profile" link above the header
- Section icons next to each section title (lock for security, bell for notifications, etc.)
- Danger Zone (account deletion) at the very bottom with red-tinted border — matches existing profile pattern
- Toast notifications (react-hot-toast) for all save/success confirmations — consistent with rest of app

### Security section (password + 2FA)
- Password change requires current password field before new password fields (existing behavior preserved)
- 2FA via TOTP authenticator app only (Google Authenticator / Authy style)
- QR code setup flow, 6-digit verification code input
- 8-10 one-time backup codes generated during 2FA setup
- Enable/disable 2FA toggle with re-authentication gate
- Form validation: zodResolver + mode:onSubmit + reValidateMode:onBlur (Phase 7 standard)

### Notification preferences
- Email + push toggles per category (5 categories):
  - Deals (offers, approvals, quotes)
  - Messages (new messages)
  - Legal (engagement requests, draft updates)
  - Providers (quote requests, shipment updates)
  - System (platform announcements, account alerts)
- Stored in `preferences` map field on the existing user document in Firestore
- Toggle switches for each category x channel combination

### Email subscription preferences
- Opt-in/out toggles for email categories (marketing, product updates, deal notifications)
- Integrates with Phase 9 unsubscribes collection in Firestore

### Account actions
- Logout button on settings page (moved from profile)
- Account deletion with existing 15-day recovery period, type "DELETE" confirmation modal

### Profile page cleanup
- Remove the entire "Account Settings" section from profile page (password change + danger zone)
- Remove logout button from profile page
- Remove dead imports: useDeleteAccount, useSoftDeleteAccount, password-related state/handlers
- Profile page keeps its edit mode for company info, products, requests — unchanged

### Navigation & access
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useDeleteAccount` hook (`src/presentation/hooks/auth/useDeleteAccount.js`): Account deletion with 15-day soft delete
- `useSoftDeleteAccount` hook: Soft delete implementation
- `useForgotPassword` hook: Password reset flow
- `useLogout` hook: Logout functionality
- `ConfirmDialog` component: Used for delete confirmation with "DELETE" text input
- `Button`, `Input`, `Modal` UI components: Existing glass-card styled components
- `useAuth` context: Current user data and auth state

### Established Patterns
- Glass-card sections with colored left bar accent (`glass-card p-6`, `w-1 h-5 bg-* rounded-full`)
- Dark theme: `bg-[rgba(255,255,255,0.03)]` inner cards, `text-white` headings, `text-[#A0A0A0]` descriptions
- Form validation: zodResolver + useForm with Zod schemas (Phase 7 standard)
- Co-located sub-components in same directory as parent (Phase 7 pattern)
- next/dynamic with ssr:false for heavy sub-components (Phase 7 pattern)
- Toast notifications via react-hot-toast for user feedback

### Integration Points
- Navbar component: Add user dropdown with avatar (currently has profile link)
- Middleware `protectedRoutes`: Add `/settings` to the allowlist
- Profile page (`src/app/(main)/profile/[userId]/page.jsx`): Remove Account Settings section (~lines 941-1000) and logout button
- User Firestore document: Add `preferences` map field for notification settings
- Phase 9 `unsubscribes` collection: Read/write for email subscription toggles
- Firebase Auth MFA API: For TOTP 2FA enrollment/unenrollment

</code_context>

<specifics>
## Specific Ideas

- User dropdown menu currently has a transparent background — must be fixed to have a solid dark background matching the navbar/app theme
- The profile page is 1000+ lines — removing the Account Settings section and dead imports will reduce its size
- 2FA should use Firebase's built-in multiFactor API for TOTP enrollment
- Notification preferences should have sensible defaults (all enabled) for new accounts

</specifics>

<deferred>
## Deferred Ideas

- Language/locale preference — deferred until i18n is built (currently English-only per PROJECT.md)
- Profile field management from settings — decided to keep on profile page
- SMS as 2FA method — only TOTP for now
- My Deals link in dropdown — keep dropdown minimal (Profile, Settings, Logout)

</deferred>

---

*Phase: 10-settings-page*
*Context gathered: 2026-04-12*

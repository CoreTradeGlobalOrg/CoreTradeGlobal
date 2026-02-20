# Phase 1: Role System and Infrastructure - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the platform to support 5 roles (member, logistics_provider, insurance_provider, lawyer, admin) with Firebase custom claims, admin invite flow for providers/lawyers, role-based navigation filtering, and Firestore security rules. Buyer/seller distinction is contextual per deal, not a registration-time role.

</domain>

<decisions>
## Implementation Decisions

### Admin invite flow
- Email invite link approach: admin enters email + role + name + company, system sends invite link
- Invited user clicks link and goes through a full onboarding wizard (set password, confirm details, add profile photo, configure preferences)
- Invite links expire after 7 days; admin can resend if needed
- Single invites only (no bulk/CSV upload)

### Navigation per role
- Top navbar with dropdowns (existing navbar pattern)
- Unified home page for all roles with role-specific content widgets (not separate dashboards per role)
- Menu items hidden completely for unauthorized areas (not greyed out)
- Existing navbar routes stay as-is; Phase 1 adds role-based filtering to show/hide items
- Existing notification bell remains unchanged
- Providers (insurance/logistics): single dashboard page with tabs/sections for requests, submitted quotes, and history
- Lawyers: separate nav items for client channels and deal review
- Admin: existing admin panel extended with role management features

### Admin panel
- Existing table/list view extended with new role-related features
- Full CRUD + role change capabilities for admin
- Invite status tracking (pending, accepted, expired) with resend option
- Existing summary stats refined and extended with role-specific counts and invite metrics
- Invite flow via modal/dialog from user list (not separate page)
- Existing soft delete and hard delete functionality stays; integrate with role system
- No admin activity/audit log for v1

### Role visibility
- User's own role shown on profile page only (not in navbar)
- Other users' roles shown with role badge in deal views, messages, and interactions
- Color-coded role badges: distinct color per role (e.g., blue for member, green for logistics, orange for insurance, purple for lawyer, red for admin)
- Unauthorized URL access shows a clear "You don't have access" page with link back to dashboard

### Claude's Discretion
- Exact color palette for role badges (within the color-coding decision)
- Onboarding wizard step design and flow details
- Firebase custom claims implementation approach
- Firestore security rules structure
- Role-based route guard implementation

</decisions>

<specifics>
## Specific Ideas

- Existing navbar, notification bell, admin table/list view, summary stats, and soft/hard delete functionality are already implemented — Phase 1 extends these, not rebuilds them
- Provider nav follows a single-dashboard-with-tabs pattern; lawyer nav separates channels and deals into distinct pages
- The invite modal should stay in context of the user list for quick workflow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-role-system-and-infrastructure*
*Context gathered: 2026-02-20*

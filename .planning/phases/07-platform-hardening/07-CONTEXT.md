# Phase 7: Platform Hardening - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Quality sweep of ALL features across the platform for UI consistency, error handling, form validation, and performance. Includes deep refactoring of components over 300 lines. No new features or capabilities -- only fixes, standardization, and optimization of what's already built.

</domain>

<decisions>
## Implementation Decisions

### Sweep Strategy
- Organize by concern type, not by page: first UI consistency, then error handling, then form validation, then performance
- One git branch per concern pass (hardening/ui-consistency, hardening/error-handling, hardening/validation, hardening/performance) so each can be reviewed and reverted independently
- Deep refactor: all components over 300 lines get broken into smaller sub-components
- Extract sub-components co-located in the same feature directory first; only promote to common/ if actually reused by 2+ features
- Standardize UI by identifying the best existing pattern for each element and making all pages match -- no new shared component library

### Error Handling
- Global error boundary (catches fatal crashes, friendly fallback page) + route-level error boundaries for: deal flow, legal consulting, provider portals, admin dashboard
- Toast notifications for user-facing errors (network failures, permission denied, API errors) -- add react-hot-toast or sonner
- Empty states: icon + descriptive message + call-to-action button (e.g., "No deals yet -- Browse Marketplace")
- No offline detection banner -- handle network errors as they come via toast
- Loading states: skeleton placeholders for page content, spinner only for user-triggered actions (submit, save, delete)

### Form Validation
- Zod schemas for all forms across the platform
- Validation timing: on submit, then on blur after first failed submission
- Error display: inline red text under each invalid field, field border turns red
- Server-side validation: Firestore security rules are sufficient as the server guard -- no additional Cloud Function validation layer

### Performance
- Three.js globe on homepage: keep as-is
- Lists (products, companies, news): add infinite scroll with intersection observer
- Console.log cleanup: remove all console.log and console.warn, keep only console.error
- Code splitting: lazy-load all major page components via Next.js dynamic imports

### Claude's Discretion
- Specific toast library choice (react-hot-toast vs sonner vs similar)
- Skeleton loader design and animation style
- Exact threshold for intersection observer triggering on infinite scroll
- Order of components within each concern pass
- Which existing UI pattern to standardize on per element type

</decisions>

<specifics>
## Specific Ideas

- User wants separate branches per concern so changes can be reverted independently: "we need to do deep refactor but different branch so we can revert changes when we need"
- Component refactor threshold is 300+ lines -- aggressive cleanup, maximum risk accepted
- All four critical flows get dedicated error boundaries: deals, legal, providers, admin

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Natural Earth continent outlines already built in TradeRouteMap (Phase 6) -- could serve as alternative to Three.js globe if revisited
- Zod already used in deal creation form (Phase 2) -- validation pattern exists to follow
- LoadingScreen component exists in common/ -- baseline for loading states
- ConfirmDialog exists in common/ -- pattern for modal interactions
- Error constants centralized in src/core/constants/errors.js with getErrorMessage() helper

### Established Patterns
- Dark theme with gold accents, text-black on gold #FFD700 backgrounds (Phases 5, 6)
- Clean Architecture: entities, repositories, hooks, DI container
- Hooks return { data, loading, error } pattern
- Services return { success, message } pattern
- Two-space indentation, no semicolons, single quotes

### Integration Points
- Error boundaries: wrap in src/app/ route layouts
- Toast provider: add to root layout.js alongside existing context providers
- Infinite scroll: integrate into ProductGrid, RequestGrid, CompaniesSection, news page
- Zod schemas: add to src/core/validation/ directory
- Dynamic imports: replace direct imports in src/app/ page files

### Known Fragile Components (from codebase analysis)
- src/app/(main)/profile/[userId]/page.jsx -- 1075 lines, 28+ useState calls
- src/presentation/components/features/admin/UsersTable/UsersTable.jsx -- 839 lines, 26 state vars
- src/presentation/contexts/MessagesContext.jsx -- complex real-time subscriptions
- src/presentation/contexts/AuthContext.jsx -- mixed concerns in single useEffect

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 07-platform-hardening*
*Context gathered: 2026-04-04*

# Architecture

**Analysis Date:** 2026-02-20

## Pattern Overview

**Overall:** Clean Architecture with Clean Domain-Driven Design (DDD) principles

**Key Characteristics:**
- Layered architecture separating domain logic, data access, and presentation
- Dependency Injection container for loose coupling and testability
- Use Case pattern for business logic encapsulation
- Repository pattern for data abstraction
- React Context API for global state management
- Next.js 13+ App Router for routing and server-side capabilities

## Layers

**Domain Layer:**
- Purpose: Pure business logic, framework-independent entities and use cases
- Location: `src/domain/`
- Contains: Domain entities (`src/domain/entities/`), business logic use cases (`src/domain/usecases/`)
- Depends on: Nothing (no external dependencies)
- Used by: Data layer, presentation hooks

**Data Layer:**
- Purpose: Handles all data persistence and external service communication
- Location: `src/data/`
- Contains:
  - Data sources (`src/data/datasources/firebase/`) - Firebase SDK abstractions
  - Repositories (`src/data/repositories/`) - Domain entity access patterns
- Depends on: Domain entities, Firebase SDKs
- Used by: Presentation layer (via DI container)

**Presentation Layer:**
- Purpose: UI components, hooks, and React-specific logic
- Location: `src/presentation/`
- Contains:
  - Components: `src/presentation/components/` (feature and common components)
  - Hooks: `src/presentation/hooks/` (custom React hooks that orchestrate use cases)
  - Contexts: `src/presentation/contexts/` (global state with React Context API)
- Depends on: Domain layer (use cases), data layer (repositories via container)
- Used by: Next.js App Router pages

**Infrastructure Layer:**
- Purpose: Configuration, utilities, and cross-cutting concerns
- Location: `src/core/` and `src/lib/`
- Contains:
  - DI Container: `src/core/di/container.js` - singleton instance management
  - Configuration: `src/core/config/` - Firebase initialization
  - Constants: `src/core/constants/` - error codes, collection names, categories
  - Validation: `src/core/validation/`
  - Utilities: `src/lib/` (rate limiting, Firebase admin)

**Routes/Pages Layer:**
- Purpose: Next.js routing and page composition
- Location: `src/app/`
- Contains:
  - Public routes: `src/app/(main)/`
  - Auth routes: `src/app/(auth)/`
  - Admin routes: `src/app/admin/`
  - API routes: `src/app/api/`
- Route protection: Managed by `middleware.js` (Next.js middleware)

## Data Flow

**Authentication Flow (Example: User Login):**

1. User fills LoginForm → `src/presentation/components/features/auth/LoginForm/LoginForm.jsx`
2. Form calls `useLogin()` hook → `src/presentation/hooks/auth/useLogin.js`
3. Hook retrieves `AuthRepository` from DI container
4. Hook instantiates `LoginUseCase` → `src/domain/usecases/auth/LoginUseCase.js`
5. Use case validates inputs and calls `authRepository.login()`
6. Repository calls Firebase Auth data source → `src/data/datasources/firebase/FirebaseAuthDataSource.js`
7. Auth data source makes Firebase API call
8. Response flows back through repository → use case → hook → component
9. Hook sets `AuthContext` state → `src/presentation/contexts/AuthContext.jsx`
10. Context updates cause components to re-render
11. Hook calls API route `/api/auth/session` to set HTTP-only session cookie

**Product Browsing Flow:**

1. User navigates to `/products` → `src/app/(main)/products/page.jsx`
2. Page renders `ProductList` component
3. Component uses `useProducts()` hook → `src/presentation/hooks/product/useProducts.js`
4. Hook retrieves `ProductRepository` from container
5. Repository queries Firestore → `src/data/datasources/firebase/FirestoreDataSource.js`
6. Products are mapped to `Product` entities → `src/domain/entities/Product.js`
7. Hook returns data to component
8. Component renders product cards with UI from `src/presentation/components/features/product/`

**State Management:**

- **Global Auth State:** `AuthContext` - manages user session, email verification status, admin approval
- **Product View Tracking:** `ProductViewContext` - tracks viewed products for analytics
- **Messages:** `MessagesContext` - manages messaging state
- **Analytics:** `AnalyticsContext` - coordinates event tracking
- **Local Component State:** useState hooks for form inputs, UI toggles

## Key Abstractions

**Use Case:**
- Purpose: Encapsulates a single business operation (LoginUseCase, CreateProductUseCase)
- Examples: `src/domain/usecases/auth/LoginUseCase.js`, `src/domain/usecases/product/CreateProductUseCase.js`
- Pattern: Takes repository in constructor, has single `execute()` method, handles validation and error transformation

**Repository:**
- Purpose: Abstract data access patterns - client of domain entities
- Examples: `src/data/repositories/UserRepository.js`, `src/data/repositories/ProductRepository.js`
- Pattern: Methods return domain entities or raw data, delegates to data sources

**Data Source:**
- Purpose: Direct Firebase SDK integration - lowest level data access
- Examples: `src/data/datasources/firebase/FirestoreDataSource.js`, `src/data/datasources/firebase/FirebaseAuthDataSource.js`
- Pattern: Raw Firebase queries/operations, no business logic

**Domain Entity:**
- Purpose: Business model with validation logic and helper methods
- Examples: `src/domain/entities/User.js`, `src/domain/entities/Product.js`
- Pattern: Constructor with validation, static factory methods (`fromFirestore`), conversion methods (`toFirestore`), permission checks

**Custom Hook (Presentation):**
- Purpose: Reusable logic that orchestrates repositories and use cases
- Examples: `src/presentation/hooks/auth/useLogin.js`, `src/presentation/hooks/product/useCreateProduct.js`
- Pattern: Returns object with function(s), loading state, error state

## Entry Points

**Web Application:**
- Location: `src/app/layout.js`
- Triggers: App initialization on first request
- Responsibilities:
  - Initialize providers (AuthProvider, AnalyticsProvider, MessagesProvider, ProductViewProvider)
  - Set up global styles and metadata
  - Mount Google Analytics script
  - Wrap all pages with context providers

**API Session Endpoint:**
- Location: `src/app/api/auth/session/route.js`
- Triggers: POST after successful login, DELETE on logout
- Responsibilities:
  - Verify Firebase ID token on server-side
  - Create/clear HTTP-only session cookie for middleware
  - Handle rate limiting

**Middleware:**
- Location: `middleware.js` (root level)
- Triggers: Before every request
- Responsibilities:
  - Protect routes requiring authentication (`/dashboard`, `/messages`)
  - Protect admin routes (`/admin`)
  - Redirect guest-only routes (`/login`) if already logged in
  - Parse session cookie to check user role/auth status

**Admin Page:**
- Location: `src/app/admin/page.jsx`
- Requires: Admin role verification by middleware
- Responsibilities: Dashboard for platform management

**Main Public Layout:**
- Location: `src/app/(main)/layout.jsx`
- Contains: Navbar, Footer, page-specific layout
- Responsibilities: Common UI for public pages

## Error Handling

**Strategy:** Layered error handling with user-friendly messages

**Patterns:**
- **Domain Layer (Use Cases):** Validate inputs, throw domain-specific errors with readable messages
- **Data Layer (Repositories):** Catch Firebase errors, log, and throw or transform
- **Presentation Layer (Hooks):** Catch errors, set error state, return via hook return object
- **Components:** Display error messages to users via toast notifications (react-hot-toast)

**Example Flow (LoginUseCase):**
```javascript
// Use case validates and transforms Firebase errors
catch (error) {
  const errorCode = error.code;
  const errorMessage = AUTH_ERRORS[errorCode] || error.message;
  throw new Error(errorMessage);
}

// Hook catches and sets state
catch (err) {
  setError(err.message);
  throw err;
}

// Component handles and shows toast
catch (err) {
  toast.error(error || 'Login failed');
}
```

## Cross-Cutting Concerns

**Logging:** Console logging throughout layers, no centralized logging service implemented

**Validation:**
- Input validation in use cases (email format, password length)
- Form validation in React Hook Form components
- Zod schemas available in `src/core/validation/` for data validation

**Authentication:**
- Firebase Auth for credential-based authentication
- AuthContext provides global auth state
- Middleware enforces route protection on server-side
- Session cookie enables server-side identification

**Rate Limiting:**
- Implemented for `/api/auth/session` endpoint in `src/lib/rate-limit.js`
- Per-IP rate limiter for login attempts

**Analytics:**
- Google Analytics via Firebase
- Custom event tracking via AnalyticsContext
- Track login, product views, searches, etc.
- User ID and properties set on auth state change

---

*Architecture analysis: 2026-02-20*

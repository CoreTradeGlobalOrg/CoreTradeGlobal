# Codebase Structure

**Analysis Date:** 2026-02-20

## Directory Layout

```
core-trade-global/
├── src/
│   ├── app/                          # Next.js App Router (pages & routes)
│   │   ├── (auth)/                   # Auth route group (login, register, password reset)
│   │   ├── (main)/                   # Public route group (products, fairs, companies, etc.)
│   │   ├── admin/                    # Admin dashboard (protected by middleware)
│   │   ├── api/                      # API routes
│   │   ├── layout.js                 # Root layout with providers
│   │   ├── globals.css               # Global styles
│   │   └── sitemap.js                # SEO sitemap
│   │
│   ├── presentation/                 # React UI layer
│   │   ├── components/
│   │   │   ├── common/               # Shared UI components (buttons, modals, etc.)
│   │   │   ├── features/             # Feature-specific components (auth, products, admin)
│   │   │   └── homepage/             # Homepage-specific components (Hero, Navbar, Footer)
│   │   ├── contexts/                 # React Context for global state
│   │   ├── hooks/                    # Custom React hooks organized by feature
│   │   └── components.tsx            # Potentially shared component exports
│   │
│   ├── domain/                       # Business logic layer
│   │   ├── entities/                 # Domain models (User, Product, Request, etc.)
│   │   └── usecases/                 # Business operations (LoginUseCase, CreateProductUseCase)
│   │
│   ├── data/                         # Data access layer
│   │   ├── datasources/
│   │   │   └── firebase/             # Firebase SDK abstractions
│   │   └── repositories/             # Data access patterns for entities
│   │
│   ├── core/                         # Infrastructure & configuration
│   │   ├── di/                       # Dependency injection container
│   │   ├── config/                   # Firebase and app configuration
│   │   ├── constants/                # Error codes, collection names, categories, countries
│   │   └── validation/               # Input validation schemas
│   │
│   ├── lib/                          # Utility libraries
│   ├── services/                     # Service utilities (newsletters)
│   ├── utils/                        # Common utility functions
│   ├── config/                       # Config utilities
│   └── hooks/                        # Legacy hooks (if any)
│
├── public/                           # Static assets
│   ├── icons/                        # Logo and icon SVGs
│   └── files/                        # Public documents
│
├── functions/                        # Firebase Cloud Functions (separate deployment)
│
├── anasyf/                           # Potential separate app/workspace
│
├── middleware.js                     # Next.js middleware (auth protection, session handling)
├── next.config.mjs                   # Next.js configuration
├── package.json                      # Dependencies
├── tailwind.config.js                # Tailwind CSS configuration
└── eslint.config.mjs                 # ESLint configuration
```

## Directory Purposes

**src/app (Routes & Pages):**
- Purpose: Next.js App Router implementation - defines routes and page components
- Contains: page.jsx/page.js files for each route, layouts, API routes
- Key files: `layout.js` (root layout), `sitemap.js` (SEO)

**src/app/(auth) (Authentication Routes):**
- Purpose: Public routes for user authentication
- Key routes:
  - `/login` → `src/app/(auth)/login/page.jsx`
  - `/register` → `src/app/(auth)/register/page.jsx`
  - `/forgot-password` → `src/app/(auth)/forgot-password/page.jsx`
  - `/verify-email` → `src/app/(auth)/verify-email/page.jsx`
  - `/reset-password` → `src/app/(auth)/reset-password/page.jsx`

**src/app/(main) (Public Application Routes):**
- Purpose: Main application routes available to all users
- Key routes:
  - `/` → homepage
  - `/products` → browse products
  - `/product/[productId]` → product details
  - `/requests` (RFQs) → browse requests for quotes
  - `/request/[requestId]` → request details
  - `/fairs` → trade fairs listing
  - `/fair/[fairId]` → fair details
  - `/companies` → company directory
  - `/categories` → product categories
  - `/messages/[conversationId]` → messaging (requires auth via middleware)
  - `/profile/[userId]` → user profiles
  - `/news/[newsId]` → news articles
  - Static pages: `/about-us`, `/contact`, `/faq`, `/privacy-policy`, `/cookie-policy`, `/terms`

**src/app/admin (Admin Routes):**
- Purpose: Admin panel for platform management
- Protected by middleware - requires admin role
- Location: `src/app/admin/page.jsx`

**src/app/api (API Routes):**
- Purpose: Server-side API endpoints
- Key endpoints:
  - `POST /api/auth/session` - Set session cookie after login
  - `DELETE /api/auth/session` - Clear session on logout
  - `GET /api/auth/session` - Get current session (optional)
  - `POST /api/seed-categories` - Seed initial categories (admin only)

**src/presentation/components (UI Components):**
- Purpose: React components for rendering UI
- Structure:
  - `common/` - Reusable components (ConfirmDialog, LoadingScreen, SearchBar, etc.)
  - `features/` - Feature-specific components organized by domain:
    - `auth/` - LoginForm, RegisterForm, DeletedAccountDialog
    - `product/` - ProductCard, ProductForm, ProductGrid, ProductList
    - `request/` - RequestCard, RequestForm, QuotesSection, SubmitQuoteDialog
    - `messaging/` - ConversationList, MessageThread, MessageInput
    - `admin/` - CategoriesManager, ProductsRequestsManager, UsersTable, etc.
    - `profile/` - CompanyDocuments
    - `category/` - CategoryForm
  - `homepage/` - Homepage sections (Hero, Navbar, Footer, Categories, Products, Fairs, News, etc.)

**src/presentation/hooks (Custom React Hooks):**
- Purpose: Reusable React logic for components
- Organized by feature:
  - `auth/` - useLogin, useRegister, useLogout, useForgotPassword, useDeleteAccount
  - `product/` - useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct
  - `request/` - useRequests, useCreateRequest, useUpdateRequest
  - `messaging/` - useConversations, useMessages, useSendMessage
  - `admin/` - admin-specific hooks
  - `analytics/` - useTrackEvent for analytics
  - `fairs/`, `category/`, `news/`, etc.

**src/presentation/contexts (Global State):**
- Purpose: React Context API for global state
- Key contexts:
  - `AuthContext.jsx` - User authentication state, session management
  - `ProductViewContext.jsx` - Track viewed products for analytics
  - `MessagesContext.jsx` - Messaging state
  - `AnalyticsContext.jsx` - Analytics event tracking

**src/domain/entities (Domain Models):**
- Purpose: Business domain models with validation logic
- Contains:
  - `User.js` - User domain entity with permission checks
  - `Product.js` - Product entity
  - `Request.js` - RFQ request entity
  - `Message.js` - Message entity
  - `Conversation.js` - Conversation entity
  - `News.js` - News article entity
  - `Fair.js` - Trade fair entity
  - `Category.js` - Product category entity
  - `Notification.js` - Notification entity

**src/domain/usecases (Business Logic):**
- Purpose: Orchestrate business operations
- Organized by feature:
  - `auth/` - LoginUseCase, RegisterUseCase, LogoutUseCase
  - `product/` - Create, read, update, delete product use cases
  - `request/` - Request/RFQ use cases
  - `messaging/` - Message and conversation use cases
  - `admin/` - Admin operations

**src/data/datasources/firebase (Firebase Abstractions):**
- Purpose: Low-level Firebase SDK integration
- Contains:
  - `FirebaseAuthDataSource.js` - Firebase Authentication operations
  - `FirestoreDataSource.js` - Firestore database operations (CRUD, queries)
  - `FirebaseStorageDataSource.js` - Firebase Storage file operations

**src/data/repositories (Data Access Patterns):**
- Purpose: Abstract data access - bridges domain and data sources
- Contains one repository per domain entity:
  - `UserRepository.js`
  - `ProductRepository.js`
  - `RequestRepository.js`
  - `ConversationRepository.js`
  - `MessageRepository.js`
  - `NewsRepository.js`
  - `FairsRepository.js`
  - `CategoryRepository.js`
  - `NotificationRepository.js`

**src/core/di (Dependency Injection):**
- Purpose: Manage singleton instances and dependency resolution
- Main file: `container.js` - Creates and provides repository instances to entire app

**src/core/config (Configuration):**
- Purpose: App-wide configuration
- `firebase.config.js` - Firebase initialization with SDK imports

**src/core/constants (Constants):**
- Purpose: Centralized constant definitions
- `collections.js` - Firestore collection names
- `errors.js` - Error codes and messages
- `categories.js` - Product categories
- `countries.js` - Country data with flags
- `currencies.js` - Currency codes
- `units.js` - Product measurement units

**src/lib (Utilities):**
- Purpose: Shared utility functions and helpers
- `firebase.js` - Firebase SDK imports
- `firebase-admin.js` - Firebase Admin SDK utilities (server-side)
- `api.js` - API utilities
- `rate-limit.js` - Rate limiting for API endpoints

**src/utils (General Utilities):**
- Purpose: Common utility functions
- `validation.js` - Input validation helpers

## Key File Locations

**Entry Points:**
- `src/app/layout.js` - Root layout that wraps entire app with providers
- `middleware.js` - Next.js middleware for route protection
- `src/core/di/container.js` - DI container for dependency resolution

**Configuration:**
- `package.json` - Dependencies and scripts
- `next.config.mjs` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `src/core/config/firebase.config.js` - Firebase initialization
- `.env` and `.env.local` - Environment variables (secrets, API keys)

**Core Logic:**
- `src/domain/entities/User.js` - User model with permission checks
- `src/domain/usecases/auth/LoginUseCase.js` - Login business logic
- `src/data/repositories/UserRepository.js` - User data access
- `src/data/repositories/AuthRepository.js` - Authentication data access

**Testing:**
- No test files detected in current structure

## Naming Conventions

**Files:**
- Page/Route: `page.jsx` or `page.js` (Next.js convention)
- Layout: `layout.jsx` or `layout.js` (Next.js convention)
- Component: PascalCase with `.jsx` or `.tsx` - `LoginForm.jsx`
- Hook: camelCase with `use` prefix - `useLogin.js`, `useProducts.js`
- Entity: PascalCase - `User.js`, `Product.js`
- Repository: PascalCase with "Repository" suffix - `UserRepository.js`
- Use Case: PascalCase with "UseCase" suffix - `LoginUseCase.js`
- Context: PascalCase with "Context" suffix - `AuthContext.jsx`
- Data Source: PascalCase with "DataSource" suffix - `FirestoreDataSource.js`

**Directories:**
- Feature directories: lowercase with hyphens - `auth`, `product`, `messaging`, `admin`
- Domain directories: lowercase - `entities`, `usecases`, `repositories`, `datasources`
- Shared directories: lowercase plural - `components`, `hooks`, `contexts`, `constants`

## Where to Add New Code

**New Feature (e.g., "Reviews"):**
1. Domain layer:
   - Create `src/domain/entities/Review.js` - Review entity
   - Create `src/domain/usecases/review/` - Use cases for review operations
2. Data layer:
   - Create `src/data/repositories/ReviewRepository.js` - Data access
3. Presentation:
   - Create `src/presentation/hooks/review/useReviews.js`, `useCreateReview.js` - Feature hooks
   - Create `src/presentation/components/features/review/` - Review components
   - Create routes in `src/app/(main)/reviews/` and `src/app/(main)/review/[reviewId]/`
4. Infrastructure:
   - Add Firestore collection constant in `src/core/constants/collections.js`
   - Add repository instance to DI container in `src/core/di/container.js`

**New API Endpoint:**
- Create `src/app/api/[route]/route.js` following Next.js conventions
- Export handler functions: `export async function GET(request) {...}`
- Use rate limiting and error handling from `src/lib/`

**New Component:**
- If shared across features: `src/presentation/components/common/ComponentName/ComponentName.jsx`
- If feature-specific: `src/presentation/components/features/[feature]/ComponentName/ComponentName.jsx`
- Create index file in folder for easier imports

**New Utility/Helper:**
- If related to validation: `src/core/validation/`
- If general utility: `src/utils/`
- If specific to lib (Firebase, etc.): `src/lib/`

**New Hook:**
- Create in appropriate feature folder: `src/presentation/hooks/[feature]/useFeatureAction.js`
- Should orchestrate use cases and repositories
- Return object with action function(s), loading state, error state

## Special Directories

**public/:**
- Purpose: Static assets served directly
- Generated: No
- Committed: Yes
- Contains icons, images, manifest.json for PWA

**.next/:**
- Purpose: Next.js build output
- Generated: Yes (on `npm run build`)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (on `npm install`)
- Committed: No (in .gitignore)

**functions/:**
- Purpose: Firebase Cloud Functions (separate from main app)
- Generated: No (source code)
- Committed: Yes
- Deployed separately to Firebase

**anasyf/:**
- Purpose: Separate application/workspace (unclear purpose - may be experimental)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-02-20*

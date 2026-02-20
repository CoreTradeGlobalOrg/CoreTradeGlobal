# Coding Conventions

**Analysis Date:** 2026-02-20

## Naming Patterns

**Files:**
- Components: PascalCase with `.jsx` extension (e.g., `Button.jsx`, `ProductGrid.jsx`)
- Utilities: camelCase with `.js` extension (e.g., `validation.js`, `rate-limit.js`)
- Services: camelCase ending with "Service" (e.g., `newsletterService.js`)
- Repositories: PascalCase ending with "Repository" (e.g., `ProductRepository.js`, `AuthRepository.js`)
- Hooks: camelCase starting with "use" (e.g., `useNewsletter.js`, `useLogin.js`)
- Pages: kebab-case directory names with `page.js` or `page.jsx` (e.g., `/dashboard/page.js`)
- Constants: SCREAMING_SNAKE_CASE in files like `errors.js`, `collections.js`
- Config files: camelCase (e.g., `firebase.config.js`)

**Functions:**
- camelCase (e.g., `getErrorMessage`, `validateEmail`, `uploadProductImage`)
- Async functions clearly named with action verbs: `getById`, `create`, `update`, `delete`
- Helper functions prefixed with verb: `sanitizeEmail`, `convertToDate`

**Variables:**
- camelCase for all variables and constants
- Boolean variables/functions prefixed with "is" or "has" (e.g., `isAuthenticated`, `hasPermission`)
- Avoid single-letter variables except in loops (`i`, `j`)
- Collections and arrays use plural names (e.g., `products`, `users`, `imageUrls`)

**Types/Classes:**
- PascalCase for all class names (e.g., `FirebaseAuthDataSource`, `ProductRepository`)
- Constructor parameters with JSDoc (e.g., `@param {FirestoreDataSource} firestoreDataSource`)

## Code Style

**Formatting:**
- No formal `.prettierrc` or `.prettierignore` file configured
- Implicit style conventions observed:
  - 2-space indentation (observed in all files)
  - No semicolons at end of statements (JavaScript modern style)
  - Single quotes for strings (when not containing quotes)
  - Trailing commas in multiline objects/arrays
  - Long className strings use template literals with backticks

**Linting:**
- ESLint configured with Next.js defaults in `eslint.config.mjs`
- Uses `@eslint/eslintrc` and `eslint-config-next`
- Configuration extends `next/core-web-vitals`
- Ignores: `node_modules`, `.next`, `out`, `build`, `next-env.d.ts`
- No custom ESLint rules beyond Next.js core rules

## Import Organization

**Order (observed pattern):**
1. External/third-party imports (React, Next.js, libraries like Firebase, Zod)
2. Internal absolute imports using `@/` path alias
3. Relative imports (rarely used due to alias preference)

Example from `container.js`:
```javascript
import { auth, db } from '@/core/config/firebase.config';
import { FirebaseAuthDataSource } from '@/data/datasources/firebase/FirebaseAuthDataSource';
import { FirestoreDataSource } from '@/data/datasources/firebase/FirestoreDataSource';
// ... more imports
```

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `jsconfig.json`)
- All internal imports use `@/path` pattern for cleaner, location-independent imports
- Example: `import { container } from '@/core/di/container'`

## Error Handling

**Patterns:**
- Centralized error constants in `src/core/constants/errors.js`
- Objects for error codes: `AUTH_ERRORS`, `FIRESTORE_ERRORS`, `VALIDATION_ERRORS`, `GENERIC_ERRORS`
- Helper function `getErrorMessage(errorCode)` converts Firebase errors to user-friendly messages
- Try-catch blocks with console.error for logging
- Service methods return `{ success: boolean, message: string, ...data }` objects
- Repository methods throw errors that propagate to use cases
- Hooks catch errors and set error state: `const [error, setError] = useState(null)`

Example error handling pattern from `newsletterService.js`:
```javascript
try {
  const validation = validators.email(email);
  if (!validation.isValid) {
    return { success: false, message: validation.error };
  }
  // ... operation
  return { success: true, message: '...', docId: docRef.id };
} catch (error) {
  console.error('Newsletter subscription error:', error);
  if (error.code === 'permission-denied') {
    return { success: false, message: '...' };
  }
  return { success: false, message: 'Something went wrong...' };
}
```

## Logging

**Framework:** Console (native `console.log`, `console.error`, `console.warn`)

**Patterns:**
- Development-only logging: `if (process.env.NODE_ENV === 'development') { console.log(...) }`
- Error logging always used: `console.error('Context:', error)`
- Warning for non-critical issues: `console.warn('Failed to delete image:', error.message)`
- No dedicated logging library (Sentry, Pino, Winston) configured
- Logs appear in server console and browser DevTools depending on execution context

## Comments

**When to Comment:**
- Complex logic or algorithms
- Reasoning behind non-obvious implementation choices
- Section headers for large files or complex components
- Public API documentation (JSDoc for functions)
- TODO/FIXME items (prefixed with `// TODO:` or `/* TODO: */`)

**JSDoc/TSDoc:**
- Extensively used for classes and public methods
- Format: `@param {Type} name - Description` and `@returns {Type} Description`
- Each repository method documented with parameter and return types
- Example from `ProductRepository.js`:
```javascript
/**
 * Get product by ID
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
async getById(productId) {
  // ...
}
```
- Component props documented in comments: `/** Button Component - Reusable button with loading state */`
- Hooks have detailed usage examples in JSDoc

## Function Design

**Size:**
- Functions kept focused on single responsibility
- Methods in repositories average 10-30 lines
- Services and utility functions typically 20-40 lines
- Components vary widely but organized with clear intent

**Parameters:**
- Destructuring used for component props: `function Button({ children, onClick, type = 'button', ... })`
- Objects for options parameters: `async getByUserId(userId, options = {})`
- Spread operator for additional props: `{...props}`
- No excessive parameters (max 5-6 regular params, then use objects)

**Return Values:**
- Async functions return Promises with clear data shape
- Services return `{ success: boolean, message: string }` objects
- Repositories return database entities or null
- Hooks return objects with state and functions: `{ email, loading, subscribe, reset }`
- Components return JSX elements

## Module Design

**Exports:**
- Named exports used for utility functions and classes (e.g., `export function useNewsletter()`, `export class ProductRepository`)
- Default exports used for main exports: `export default Button`, `export default container`
- Barrel files used to re-export from index (not observed but common pattern)

**Barrel Files:**
- Not heavily used but directory structure suggests them (e.g., `src/core/constants/` with multiple files)
- Main exports from directories done directly (e.g., `import { container } from '@/core/di/container'`)

## Architecture Patterns

**Dependency Injection:**
- Singleton DI container in `src/core/di/container.js`
- Container manages all repository instances
- Used pattern: `const authRepo = container.getAuthRepository()`
- Enables testing with dependency injection

**Repository Pattern:**
- Clean separation of data access
- Each entity type has dedicated repository (ProductRepository, UserRepository, etc.)
- Repositories depend on DataSources (FirestoreDataSource, FirebaseStorageDataSource)

**Use Case Pattern:**
- Business logic in dedicated classes (e.g., `LoginUseCase`)
- Used in hooks: `const loginUseCase = new LoginUseCase(authRepository)`
- Encapsulates domain logic separate from UI

**Service Pattern:**
- Services handle specific business domains (e.g., `newsletterService`)
- Singleton instances exported: `export const newsletterService = new NewsletterService()`
- Called directly from hooks

**Hook Pattern:**
- Custom hooks encapsulate state logic
- Mix of service-based (`useNewsletter`) and repository-based (`useLogin`)
- Return objects with state and functions

---

*Convention analysis: 2026-02-20*

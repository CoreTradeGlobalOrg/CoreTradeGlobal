# Testing Patterns

**Analysis Date:** 2026-02-20

## Test Framework

**Runner:**
- Not configured - `jest.config.js`, `vitest.config.js` files do not exist
- No test framework installed in `package.json`
- No `@testing-library/react`, `jest`, `vitest`, or similar in devDependencies

**Assertion Library:**
- Not configured - testing dependencies absent from project

**Run Commands:**
- None defined - no test scripts in `package.json`
- Current scripts: `dev`, `build`, `start`, `lint`

## Test File Organization

**Current State:**
- No `.test.js`, `.spec.js`, or `.test.jsx` files in `src/` directory
- Test files only exist in `node_modules` (from third-party packages like Zod)
- No dedicated `__tests__/` directories

**Location Convention (if implemented):**
- Would follow Next.js convention: co-locate tests with source files
- Example pattern: `src/components/Button.jsx` → `src/components/Button.test.jsx`

**Naming Convention (if implemented):**
- `*.test.js` or `*.test.jsx` for unit tests
- `*.spec.js` or `*.spec.jsx` for integration tests

## Test Structure

**Current Gap:**
Testing framework is not currently set up. Below is the recommended pattern based on observed code structure:

**Recommended Hook Test Pattern:**
```javascript
// src/hooks/useNewsletter.test.js
import { renderHook, act } from '@testing-library/react';
import { useNewsletter } from './useNewsletter';

describe('useNewsletter', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useNewsletter());

    expect(result.current.email).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.message).toEqual({ text: '', type: '' });
  });

  it('should handle subscription error', async () => {
    const { result } = renderHook(() => useNewsletter());

    await act(async () => {
      await result.current.subscribe();
    });

    expect(result.current.message.type).toBe('error');
  });
});
```

**Recommended Repository Test Pattern:**
```javascript
// src/data/repositories/ProductRepository.test.js
describe('ProductRepository', () => {
  let mockFirestoreDataSource;
  let mockStorageDataSource;
  let repository;

  beforeEach(() => {
    mockFirestoreDataSource = {
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    };
    mockStorageDataSource = {};

    repository = new ProductRepository(
      mockFirestoreDataSource,
      mockStorageDataSource
    );
  });

  it('should create product and update user productIds', async () => {
    const productData = { userId: 'user1', name: 'Test Product' };
    mockFirestoreDataSource.create.mockResolvedValue({ id: 'prod1' });
    mockFirestoreDataSource.getById.mockResolvedValue({ productIds: [] });

    await repository.create(productData);

    expect(mockFirestoreDataSource.create).toHaveBeenCalledWith(
      'products',
      productData
    );
  });
});
```

## Mocking

**Current Testing State:**
- No mocking framework installed (Jest, Vitest, Sinon, etc.)
- No mock files or test utilities present

**Recommended Framework:** Jest (likely candidate given Next.js ecosystem)

**Recommended Mocking Patterns:**

**Service Mocking:**
```javascript
// Mock newsletterService in component tests
jest.mock('@/services/newsletterService', () => ({
  newsletterService: {
    subscribe: jest.fn().mockResolvedValue({
      success: true,
      message: 'Subscribed',
    }),
  },
}));
```

**Firebase Mocking:**
```javascript
// Mock Firebase in repository tests
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));
```

**Component Props Mocking:**
```javascript
// Mock child components in tests
const mockOnClick = jest.fn();
render(<Button onClick={mockOnClick}>Click</Button>);
```

**What to Mock:**
- External services (Firebase, APIs)
- Dependencies injected to repositories
- HTTP calls and async operations
- Time-dependent functions (dates, timers)

**What NOT to Mock:**
- Pure utility functions (validation, formatting)
- UI components being tested
- Application state management (React Context)
- Business logic in use cases

## Fixtures and Factories

**Current State:**
- No fixture files or factory patterns present
- Test data would need to be created per-test

**Recommended Pattern (if implemented):**
```javascript
// src/test/fixtures/product.fixture.js
export const createMockProduct = (overrides = {}) => ({
  id: 'prod-123',
  name: 'Test Product',
  categoryId: 'cat-1',
  userId: 'user-1',
  status: 'active',
  createdAt: new Date(),
  ...overrides,
});

export const mockProducts = [
  createMockProduct(),
  createMockProduct({ id: 'prod-124', name: 'Product 2' }),
];
```

**Recommended Location:**
- `src/test/fixtures/` directory for test data
- `src/test/mocks/` directory for mock implementations
- Organize by domain: `product.fixture.js`, `user.fixture.js`, etc.

## Coverage

**Requirements:** Not enforced - no coverage configuration present

**Current Status:**
- 0% coverage (no tests)
- No coverage reporting configured
- `package.json` has no coverage thresholds

**Recommended Configuration (if implemented):**
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.js',
    '!src/**/index.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

**View Coverage (if implemented):**
```bash
npm test -- --coverage
# Opens coverage/lcov-report/index.html
```

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, services
- Approach (recommended): Test in isolation with mocked dependencies
- Examples to prioritize:
  - Validators in `src/utils/validation.js`
  - Error handling in `src/core/constants/errors.js`
  - Service methods in `src/services/newsletterService.js`

**Integration Tests:**
- Scope: Repository + DataSource combinations, Hook + Service combinations
- Approach: Test with real or realistic mock data
- Examples to prioritize:
  - Repository methods with mocked DataSources
  - Hooks that use Services
  - API routes with mocked Firebase

**E2E Tests:**
- Framework: Not configured - would use Playwright or Cypress
- Current state: Not implemented
- Would test: Complete user flows (login → browse → purchase)

## Common Patterns

**Async Testing (if implemented):**
```javascript
// Using React Testing Library
it('should load products on mount', async () => {
  render(<ProductGrid categoryId="cat-1" />);

  // Wait for async operation
  const products = await screen.findAllByRole('heading', { name: /product/i });

  expect(products).toHaveLength(2);
});

// Using Jest with async/await
it('should create product successfully', async () => {
  const result = await repository.create({ name: 'Test' });

  expect(result).toHaveProperty('id');
  expect(result.name).toBe('Test');
});
```

**Error Testing (if implemented):**
```javascript
it('should handle validation error', () => {
  const result = validators.email('invalid-email');

  expect(result.isValid).toBe(false);
  expect(result.error).toBe('Please enter a valid email address');
});

it('should catch Firebase errors', async () => {
  mockFirestoreDataSource.getById.mockRejectedValue({
    code: 'permission-denied',
  });

  await expect(repository.getById('id')).rejects.toThrow();
});
```

## Testing Gaps & Recommendations

**Critical Gaps:**
1. No testing framework configured at all
2. No test files exist in codebase
3. Complex business logic (repositories, services) untested
4. API routes have no test coverage
5. Custom hooks lack test coverage

**Implementation Priority:**
1. Install Jest + React Testing Library
2. Add configuration and setup files
3. Test utility functions (validators, error handling)
4. Test services and repositories with mocked dependencies
5. Test custom hooks with React Testing Library
6. Test components (especially forms and complex UI)
7. Test API routes
8. Set up CI/CD test pipeline

**Recommended Package.json additions:**
```json
{
  "devDependencies": {
    "jest": "^29",
    "@testing-library/react": "^14",
    "@testing-library/jest-dom": "^6",
    "@testing-library/user-event": "^14",
    "jest-environment-jsdom": "^29"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

*Testing analysis: 2026-02-20*

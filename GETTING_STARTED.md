# Getting Started with CoreTradeGlobal

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Your Firebase credentials are already configured in `.env.local.example`.

Create `.env.local`:
```bash
cp .env.local.example .env.local
```

### 3. Configure Firebase

#### A. Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `core-trade-global`
3. Click "Authentication" → "Sign-in method"
4. Enable "Email/Password"

#### B. Create Firestore Database
1. Click "Firestore Database" → "Create database"
2. Choose "Start in test mode" (we'll add security rules later)
3. Select a location (e.g., `us-central1`)

#### C. Add Security Rules
Go to "Firestore Database" → "Rules" and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == userId;
    }

    // Newsletter collection (existing)
    match /newsletter/{docId} {
      allow read, write: if true;  // Public for now
    }

    // Products (for future)
    match /products/{productId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
  }
}
```

Click "Publish" to save.

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Test Authentication

#### Register a new account:
1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Fill in the form:
   - Full Name: John Doe
   - Email: test@example.com
   - Company: Test Company
   - Password: test123
   - Confirm Password: test123
3. Click "Create Account"
4. You should be redirected to the dashboard

#### Test Login:
1. Click "Logout"
2. Go to [http://localhost:3000/login](http://localhost:3000/login)
3. Login with the same credentials
4. You should see the dashboard again

---

## Project Structure Overview

```
src/
├── core/              # Shared utilities, constants, DI
├── domain/            # Business logic (Use Cases, Entities)
├── data/              # Data access (Repositories, DataSources)
├── presentation/      # UI (Components, Hooks, Contexts)
└── app/               # Next.js routes
```

---

## File Organization Rules

### When creating a new file, ask yourself:

1. **Is it business logic?** → `src/domain/`
   - Pure functions, validation
   - No React, no Firebase imports
   - Example: `LoginUseCase.js`

2. **Is it data access?** → `src/data/`
   - Firebase calls, API calls
   - Example: `ProductRepository.js`

3. **Is it UI?** → `src/presentation/`
   - React components, hooks, contexts
   - Example: `LoginForm.jsx`

4. **Is it shared across layers?** → `src/core/`
   - Constants, utilities, config
   - Example: `collections.js`

5. **Is it a route/page?** → `src/app/`
   - Next.js page files
   - Example: `app/(auth)/login/page.jsx`

---

## Common Tasks

### Adding a New Feature (Example: Products)

1. **Create Entity** (`domain/entities/Product.js`)
2. **Create Use Cases** (`domain/usecases/products/CreateProductUseCase.js`)
3. **Create Repository** (`data/repositories/ProductRepository.js`)
4. **Add to DI Container** (`core/di/container.js`)
5. **Create Hook** (`presentation/hooks/products/useCreateProduct.js`)
6. **Create Component** (`presentation/components/features/products/ProductForm.jsx`)
7. **Create Page** (`app/(main)/products/new/page.jsx`)

See `ARCHITECTURE.md` for detailed examples.

---

## Important Patterns

### 1. Use Hooks for UI Logic
```javascript
// ✅ Good
const { login, loading } = useLogin();

// ❌ Bad - don't call Use Cases directly from components
const useCase = new LoginUseCase(repo);
```

### 2. Use Repository, Not Direct Firebase Calls
```javascript
// ✅ Good
await productRepository.create(data);

// ❌ Bad
await addDoc(collection(db, 'products'), data);
```

### 3. Inject Dependencies
```javascript
// ✅ Good
const repo = container.getAuthRepository();

// ❌ Bad - creating instances manually
const repo = new AuthRepository(new FirebaseAuthDataSource());
```

### 4. Keep Business Logic in Use Cases
```javascript
// ✅ Good - validation in Use Case
class LoginUseCase {
  execute(email, password) {
    this.validateEmail(email);  // ← Business logic
    return this.repository.login(email, password);
  }
}

// ❌ Bad - validation in component
function LoginForm() {
  const handleSubmit = () => {
    if (!email.includes('@')) { /* ... */ }  // ❌ Wrong place
  }
}
```

---

## Folder Naming Conventions

- **Files**: PascalCase for components/classes → `LoginForm.jsx`, `AuthRepository.js`
- **Folders**: camelCase → `auth/`, `products/`
- **Constants**: UPPER_SNAKE_CASE → `COLLECTIONS`, `AUTH_ERRORS`
- **Hooks**: camelCase with "use" prefix → `useLogin.js`

---

## Next Steps

1. ✅ You now have a working authentication system
2. Read `ARCHITECTURE.md` to understand the full architecture
3. Start building your first feature (Products, Requests, or Messages)
4. Follow the same patterns for consistency

---

## Troubleshooting

### "Firebase: Error (auth/...)"
- Check your `.env.local` file has correct Firebase credentials
- Make sure Email/Password is enabled in Firebase Console

### "Permission denied" errors
- Check Firestore Security Rules are set up correctly
- Make sure you're signed in

### Components not rendering
- Check if you wrapped your app with `<AuthProvider>` in `app/layout.js`
- Check browser console for errors

### Import errors
- Make sure you're using `@/` prefix for imports (configured in `jsconfig.json`)
- Example: `import { useLogin } from '@/presentation/hooks/auth/useLogin'`

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Hooks](https://react.dev/reference/react)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

Happy coding! 🚀

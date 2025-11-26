# CoreTradeGlobal - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Architecture Layers](#architecture-layers)
4. [How to Use](#how-to-use)
5. [Adding New Features](#adding-new-features)
6. [Firebase Setup](#firebase-setup)

---

## Overview

This project follows **Clean Architecture** principles with a clear separation of concerns across multiple layers. The architecture is designed to be:

- **Scalable**: Easy to add new features
- **Maintainable**: Each layer has a single responsibility
- **Testable**: Business logic is framework-independent
- **Flexible**: Easy to swap implementations (e.g., Firebase → another backend)

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                │
│  (UI Components, Hooks, Contexts)           │
│  - React Components                         │
│  - Custom Hooks                             │
│  - Context Providers                        │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│            Domain Layer                     │
│  (Business Logic - Framework Independent)   │
│  - Entities                                 │
│  - Use Cases                                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│             Data Layer                      │
│  (Data Access & Repository Pattern)         │
│  - Repositories                             │
│  - Data Sources                             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│          External Services                  │
│  (Firebase, APIs, etc.)                     │
└─────────────────────────────────────────────┘
```

---

## Project Structure

```
src/
├── app/                          # Next.js App Router (Routing)
│   ├── (auth)/                   # Auth route group (login, register)
│   ├── (main)/                   # Protected routes (dashboard, etc.)
│   ├── layout.js                 # Root layout with AuthProvider
│   └── page.js                   # Landing page
│
├── core/                         # Core/Shared Module
│   ├── constants/                # Constants (collections, errors)
│   ├── config/                   # Configuration (firebase)
│   ├── di/                       # Dependency Injection container
│   └── utils/                    # Utility functions
│
├── domain/                       # Domain Layer (Business Logic)
│   ├── entities/                 # Domain models (User, Product, etc.)
│   └── usecases/                 # Business operations (LoginUseCase, etc.)
│
├── data/                         # Data Layer
│   ├── repositories/             # Repository implementations
│   └── datasources/              # Data sources (Firebase, local, etc.)
│
└── presentation/                 # Presentation Layer
    ├── components/               # React components
    │   ├── common/               # Shared UI components (Button, Input)
    │   ├── features/             # Feature-specific components (LoginForm)
    │   └── layout/               # Layout components (Header, Sidebar)
    ├── hooks/                    # Custom React hooks
    ├── contexts/                 # React Context providers
    └── providers/                # Combined providers
```

---

## Architecture Layers

### 1. Core Layer (`src/core/`)

**Purpose**: Shared utilities, constants, and configuration used across all layers.

**Files**:
- `constants/collections.js` - Firestore collection names
- `constants/errors.js` - Error messages
- `config/firebase.config.js` - Firebase initialization
- `di/container.js` - Dependency injection container

**When to add here**: Anything that's shared across multiple layers.

---

### 2. Domain Layer (`src/domain/`)

**Purpose**: Business logic - framework independent, pure JavaScript.

**Files**:
- `entities/User.js` - User domain model with business methods
- `usecases/auth/LoginUseCase.js` - Login business logic
- `usecases/auth/RegisterUseCase.js` - Registration business logic

**Rules**:
- No React imports
- No Firebase imports
- Only business logic
- Receives dependencies via constructor (Repository)

**Example Use Case**:
```javascript
export class LoginUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(email, password) {
    // 1. Validate
    this.validateEmail(email);
    // 2. Call repository
    return await this.authRepository.login(email, password);
  }
}
```

---

### 3. Data Layer (`src/data/`)

**Purpose**: Data access and repository pattern implementation.

**Structure**:
- **DataSources**: Direct API/Firebase calls
- **Repositories**: Abstraction over data sources

**Example**:
```javascript
// DataSource: Direct Firebase calls
class FirebaseAuthDataSource {
  async login(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  }
}

// Repository: Combines multiple data sources
class AuthRepository {
  constructor(authDataSource, firestoreDataSource) {
    this.authDataSource = authDataSource;
    this.firestoreDataSource = firestoreDataSource;
  }

  async login(email, password) {
    const authUser = await this.authDataSource.login(email, password);
    const profile = await this.firestoreDataSource.getById('users', authUser.uid);
    return { ...authUser, ...profile };
  }
}
```

---

### 4. Presentation Layer (`src/presentation/`)

**Purpose**: UI components, hooks, and state management.

**Structure**:
- **Components**: React components
- **Hooks**: Custom React hooks (useLogin, useRegister)
- **Contexts**: Global state (AuthContext)

**Example Hook**:
```javascript
export function useLogin() {
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    const authRepo = container.getAuthRepository();
    const useCase = new LoginUseCase(authRepo);
    const user = await useCase.execute(email, password);
    setLoading(false);
    return user;
  };

  return { login, loading };
}
```

---

## How to Use

### 1. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Copy `.env.local.example` to `.env.local`
5. Fill in your Firebase credentials

### 2. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Products collection
    match /products/{productId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        resource.data.companyId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId;
    }
  }
}
```

### 3. Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### 4. Testing Authentication

1. Go to `/register` to create an account
2. Fill in the form (email, password, name, company)
3. You'll be redirected to `/dashboard`
4. Click "Logout" to test logout

---

## Adding New Features

### Example: Adding Product CRUD

#### Step 1: Create Entity
```javascript
// src/domain/entities/Product.js
export class Product {
  constructor(id, name, price, companyId) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.companyId = companyId;
  }
}
```

#### Step 2: Create Use Case
```javascript
// src/domain/usecases/products/CreateProductUseCase.js
export class CreateProductUseCase {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(productData) {
    // Validation
    if (!productData.name) throw new Error('Name required');
    if (productData.price < 0) throw new Error('Invalid price');

    // Create product
    return await this.productRepository.create(productData);
  }
}
```

#### Step 3: Create Repository
```javascript
// src/data/repositories/ProductRepository.js
export class ProductRepository {
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  async create(productData) {
    return await this.firestoreDataSource.create('products', productData);
  }

  async getAll(companyId) {
    return await this.firestoreDataSource.query('products', {
      where: [['companyId', '==', companyId]]
    });
  }
}
```

#### Step 4: Add to DI Container
```javascript
// src/core/di/container.js
let productRepository = null;

export const container = {
  // ... existing methods

  getProductRepository() {
    if (!productRepository) {
      productRepository = new ProductRepository(this.getFirestoreDataSource());
    }
    return productRepository;
  }
};
```

#### Step 5: Create Hook
```javascript
// src/presentation/hooks/products/useCreateProduct.js
export function useCreateProduct() {
  const [loading, setLoading] = useState(false);

  const createProduct = async (productData) => {
    setLoading(true);
    const repo = container.getProductRepository();
    const useCase = new CreateProductUseCase(repo);
    const product = await useCase.execute(productData);
    setLoading(false);
    return product;
  };

  return { createProduct, loading };
}
```

#### Step 6: Create Component
```javascript
// src/presentation/components/features/products/ProductForm/ProductForm.jsx
export function ProductForm() {
  const { createProduct, loading } = useCreateProduct();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createProduct({ name, price, companyId });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Step 7: Create Page
```javascript
// src/app/(main)/products/new/page.jsx
import { ProductForm } from '@/presentation/components/features/products/ProductForm/ProductForm';

export default function NewProductPage() {
  return <ProductForm />;
}
```

---

## Key Patterns

### 1. Dependency Injection

All dependencies are injected via constructor:

```javascript
class LoginUseCase {
  constructor(authRepository) {  // ← Dependency injection
    this.authRepository = authRepository;
  }
}
```

Get instances from DI container:
```javascript
const authRepo = container.getAuthRepository();
const useCase = new LoginUseCase(authRepo);
```

### 2. Repository Pattern

Repositories abstract data access:

```javascript
// Instead of calling Firebase directly:
await addDoc(collection(db, 'users'), userData);  // ❌ Bad

// Use repository:
await userRepository.create(userData);  // ✅ Good
```

### 3. Use Case Pattern

Each business operation = one Use Case:

```javascript
// LoginUseCase - handles login
// RegisterUseCase - handles registration
// CreateProductUseCase - handles product creation
```

### 4. Custom Hooks

UI logic goes in hooks:

```javascript
// useLogin - login state + calls LoginUseCase
// useProducts - products state + calls GetProductsUseCase
```

---

## Benefits of This Architecture

### 1. **Testability**
- Use Cases can be tested without React
- Mock repositories easily
- Test business logic in isolation

### 2. **Scalability**
- Add new features without touching existing code
- Clear separation of concerns
- Each layer can grow independently

### 3. **Maintainability**
- Easy to find where code lives
- Each class has one responsibility
- Clear dependencies

### 4. **Flexibility**
- Easy to switch Firebase to another backend
- Can swap implementations without changing business logic
- Framework independent domain layer

---

## Next Steps

1. ✅ Authentication system (COMPLETED)
2. ⬜ Add Product CRUD
3. ⬜ Add Request management
4. ⬜ Add Messaging system
5. ⬜ Add Company management
6. ⬜ Add real-time features (Firebase realtime listeners)
7. ⬜ Add file upload (Firebase Storage)
8. ⬜ Add unit tests

---

## Questions?

Read through this document carefully. Each section explains:
- **What** the layer does
- **Why** it exists
- **How** to use it
- **When** to add to it

The architecture is designed to scale with your application. Start simple, follow the patterns, and expand as needed.

# Admin Panel Setup Guide

## Overview

The admin panel allows authorized users to view user statistics and manage all registered users on the CoreTradeGlobal platform.

## Access Control

Currently, admin access is controlled by **email whitelist** in the admin layout component.

### Configuring Admin Access

**File:** `src/app/(main)/admin/layout.jsx`

Find this line (around line 25):

```javascript
const adminEmails = ['admin@coretradeglobal.com', 'your-email@example.com'];
```

**To grant admin access:**

1. Add your email address to the `adminEmails` array
2. Register an account with that email
3. Navigate to `/admin`

**Example:**

```javascript
const adminEmails = [
  'admin@coretradeglobal.com',
  'yourname@yourcompany.com',
  'manager@yourcompany.com',
];
```

## Future Enhancement: Role-Based Access Control

In the future, you can implement proper role-based access control by:

1. **Adding a `role` field to user profiles in Firestore:**

```javascript
// When registering a user
const userProfile = {
  email: user.email,
  displayName: 'John Doe',
  companyName: 'Acme Corp',
  role: 'member', // or 'admin'
  // ... other fields
};
```

2. **Update admin check in layout:**

```javascript
// Instead of checking email array
if (user.role !== 'admin') {
  toast.error('Access denied. Admin privileges required.');
  router.push('/dashboard');
}
```

3. **Create admin role assignment interface:**
   - Build UI to promote users to admin
   - Only allow existing admins to grant admin access
   - Store role changes in Firestore

## Admin Panel Features

### Dashboard Overview (`/admin`)

**Statistics Cards:**

- **Total Users** - All registered users
- **Verified Users** - Users who verified their email
- **Unverified Users** - Users pending email verification
- **New Users (7 days)** - Recent registrations

**Users Table:**

- View all registered users
- Search by name, email, or company
- Filter by verification status (All / Verified / Unverified)
- See user details:
  - Name, email, position
  - Company name and category
  - Country with flag
  - Verification status
  - Registration date

**Features:**

- Real-time data from Firestore
- Search functionality
- Filter options
- Refresh button
- Responsive design

## Security Considerations

### Current Implementation

- Admin check happens **client-side only**
- Layout redirects non-admin users to dashboard
- This prevents UI access but not API access

### Recommendations

**For production, implement:**

1. **Server-side middleware protection:**

```javascript
// middleware.js
export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    // Verify admin role server-side
    // Check session/token for admin claim
  }
}
```

2. **Firebase Security Rules:**

```
// firestore.rules
match /users/{userId} {
  // Only admins can list all users
  allow list: if request.auth != null &&
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

3. **API Route Protection:**

```javascript
// app/api/admin/users/route.js
export async function GET(request) {
  // Verify admin token
  const token = request.headers.get('authorization');
  const decodedToken = await admin.auth().verifyIdToken(token);

  if (decodedToken.role !== 'admin') {
    return new Response('Unauthorized', { status: 403 });
  }

  // Return users data
}
```

## Testing Admin Panel

1. **Add your email to admin whitelist**
2. **Register with that email**
3. **Navigate to `/admin`**
4. **You should see:**
   - Admin header with your email
   - Statistics cards
   - Users table

5. **Test features:**
   - Search for users
   - Filter by verification status
   - Click refresh to reload data

## Troubleshooting

### "Access denied. Admin privileges required."

- Check that your email is in the `adminEmails` array
- Make sure you're logged in with that email
- Verify the email matches exactly (case-sensitive)

### "Error Loading Data"

- Check Firebase Firestore permissions
- Make sure you have at least one registered user
- Check browser console for errors
- Verify Firebase configuration is correct

### No users showing in table

- Register at least one test user
- Click "Refresh Data" button
- Check Firestore console to verify users collection exists
- Check browser console for errors

## Next Steps

After testing the admin panel, consider:

1. **Implementing role-based access control** (as described above)
2. **Adding more admin features:**
   - Edit user details
   - Delete/disable users
   - Send notifications to users
   - Export user data to CSV
   - View detailed user analytics
3. **Adding server-side protection** for production security
4. **Setting up Firebase Security Rules** to restrict admin queries

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify Firebase configuration
3. Check Firestore security rules
4. Review this documentation

---

**Admin Panel is ready to use!** 🎉

Navigate to `/admin` after logging in with an admin email to see your dashboard.

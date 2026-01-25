# Firebase Email Action URL Setup

## 📧 Custom Email Action Handler

We've created custom pages to handle Firebase email actions (verification, password reset) instead of using Firebase's default pages.

---

## 🔧 Firebase Console Configuration

Follow these steps to configure Firebase to use your custom pages:

### Step 1: Go to Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project: **core-trade-global**
3. Click **Authentication** in the left menu
4. Click **Templates** tab

---

### Step 2: Configure Email Templates

#### A. Email Verification Template

1. Click on **Email address verification** template
2. Click **Edit template** (pencil icon)
3. Scroll down to **Action URL** section
4. **Replace the URL** with:
   ```
   http://localhost:3000/auth/action
   ```
   (For production, use: `https://yourdomain.com/auth/action`)

5. Click **Save**

#### B. Password Reset Template

1. Click on **Password reset** template
2. Click **Edit template** (pencil icon)
3. Scroll down to **Action URL** section
4. **Replace the URL** with:
   ```
   http://localhost:3000/auth/action
   ```
   (For production, use: `https://yourdomain.com/auth/action`)

5. Click **Save**

---

## 🎯 How It Works

### Email Verification Flow:

```
1. User registers
   ↓
2. Firebase sends verification email with link:
   http://localhost:3000/auth/action?mode=verifyEmail&oobCode=ABC123
   ↓
3. User clicks link
   ↓
4. Our /auth/action page handles it:
   - Extracts mode and oobCode
   - Calls verifyEmail(oobCode)
   - Shows success message
   - Redirects to /login
```

### Password Reset Flow:

```
1. User goes to /forgot-password
   ↓
2. Enters email
   ↓
3. Firebase sends reset email with link:
   http://localhost:3000/auth/action?mode=resetPassword&oobCode=XYZ789
   ↓
4. User clicks link
   ↓
5. /auth/action redirects to /reset-password?oobCode=XYZ789
   ↓
6. User enters new password
   ↓
7. Password is reset using oobCode
   ↓
8. Redirects to /login
```

---

## 📝 Email Template Customization (Optional)

You can also customize the email templates while you're there:

### Verification Email Example:
```
Subject: Verify your email for CoreTradeGlobal

Hello,

Welcome to CoreTradeGlobal! Please verify your email address by clicking the button below:

<% action %>

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Thanks,
CoreTradeGlobal Team
```

### Password Reset Email Example:
```
Subject: Reset your password

Hello,

We received a request to reset your password for CoreTradeGlobal.

Click the button below to reset your password:

<% action %>

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

Thanks,
CoreTradeGlobal Team
```

---

## ✅ Testing

After configuration:

### Test Email Verification:
1. Register a new account
2. Check email inbox
3. Click verification link
4. Should see your custom verification page
5. Should redirect to login with success message

### Test Password Reset:
1. Go to /forgot-password
2. Enter email
3. Check email inbox
4. Click reset link
5. Should see your custom reset password page
6. Enter new password
7. Should redirect to login

---

## 🚀 Production Setup

When deploying to production:

1. Replace `http://localhost:3000` with your domain:
   ```
   https://yourdomain.com/auth/action
   ```

2. Update in Firebase Console for all email templates

3. Test all flows in production

---

## 🎨 Benefits of Custom Pages

✅ **Consistent branding** - Users stay on your domain
✅ **Better UX** - Customize the experience
✅ **Full control** - Add analytics, logging, etc.
✅ **Professional** - Looks more polished
✅ **Flexible** - Add extra features easily

---

## 🔍 Troubleshooting

### "Invalid action link" error
- Check that you've updated the Action URL in Firebase Console
- Make sure the URL matches exactly (no trailing slash)
- Clear browser cache and try again

### Email not arriving
- Check spam folder
- Verify SMTP settings in Firebase (usually auto-configured)
- Wait a few minutes (can take 1-2 minutes)

### Link expired
- Verification links expire in 24 hours
- Password reset links expire in 1 hour
- Request a new link from the app

---

## 📌 Important Notes

- Action URL must be **exactly**: `http://localhost:3000/auth/action` (no trailing slash)
- For production, use HTTPS: `https://yourdomain.com/auth/action`
- Changes in Firebase Console take effect immediately
- Test both email verification and password reset after configuration

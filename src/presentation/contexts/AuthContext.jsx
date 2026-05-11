/**
 * Auth Context
 *
 * Manages global authentication state
 * Provides auth state to all components in the app
 *
 * Performance: Auth state resolves fast (~100ms) via onAuthStateChanged.
 * Profile data loads in the background and merges into the user object.
 * Components see `loading` (= authLoading) resolve quickly, while
 * `profileLoading` tracks the slower Firestore fetch separately.
 */

'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { container } from '@/core/di/container';

const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Wrap your app with this to provide auth state
 *
 * Usage in layout.js:
 * <AuthProvider>
 *   {children}
 * </AuthProvider>
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track whether session cookie has been set this session to avoid re-posting
  const sessionCookieSet = useRef(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const authRepository = container.getAuthRepository();

    const unsubscribe = authRepository.onAuthStateChanged(
      (firebaseUser) => {
        if (firebaseUser) {
          // Immediately set a basic user from Firebase Auth (fast, no Firestore)
          const basicUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
          };

          setUser(basicUser);
          setAuthLoading(false);

          // Fetch full profile in the background
          setProfileLoading(true);
          fetchProfileAndSession(authRepository, firebaseUser);
        } else {
          // User is signed out
          setUser(null);
          setAuthLoading(false);
          setProfileLoading(false);
          sessionCookieSet.current = false;

          // Clear session cookie in background (fire-and-forget)
          fetch('/api/auth/session', { method: 'DELETE' }).catch((cookieError) => {
            console.error('Failed to clear session cookie:', cookieError);
          });
        }
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetches the full user profile from Firestore and sets the session cookie.
   * Runs in the background after auth state resolves.
   */
  const fetchProfileAndSession = async (authRepository, firebaseUser) => {
    try {
      let userProfile = await authRepository.getUserProfile(
        firebaseUser.uid
      );

      // Retry once after 1s — on hard refresh, Firestore may not be ready yet
      if (!userProfile) {
        await new Promise((r) => setTimeout(r, 1000));
        userProfile = await authRepository.getUserProfile(firebaseUser.uid);
      }

      // Check if user profile exists in Firestore
      if (!userProfile) {
        console.error('User profile not found in Firestore. Logging out...');
        await authRepository.logout();
        setUser(null);
        setProfileLoading(false);
        return;
      }

      // Check if user is deleted
      if (userProfile.isDeleted === true) {
        console.error('User account is deleted. Logging out...');
        await authRepository.logout();
        setUser(null);
        setProfileLoading(false);
        return;
      }

      // Sync emailVerified status from Firebase Auth to Firestore
      if (firebaseUser.emailVerified !== userProfile.emailVerified) {
        // Fire-and-forget — don't block on this
        authRepository.updateUserProfile(firebaseUser.uid, {
          emailVerified: firebaseUser.emailVerified,
          updatedAt: new Date(),
        }).catch((err) => {
          console.error('Failed to sync emailVerified:', err);
        });
      }

      const userData = {
        ...userProfile,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified, // Use Firebase Auth value (must be after spread)
      };

      setUser(userData);

      // Set session cookie only once per session (avoid re-posting on every auth state change)
      if (!sessionCookieSet.current) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (sessionResponse.ok) {
            sessionCookieSet.current = true;
          } else {
            console.error(
              `Session cookie not set (status ${sessionResponse.status}). ` +
              'Role-based route protection may not work. ' +
              'Check FIREBASE_SERVICE_ACCOUNT_KEY in .env.local.'
            );
          }
        } catch (cookieError) {
          console.error('Failed to set session cookie:', cookieError);
        }
      }
    } catch (err) {
      console.error('Auth state change error:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Force refresh user data
  const refreshUser = async () => {
    try {
      setProfileLoading(true);
      const authRepository = container.getAuthRepository();

      // Reload Firebase Auth user
      await authRepository.reloadUser();

      const currentUser = authRepository.getCurrentUser();

      if (currentUser) {
        // Get fresh profile from Firestore
        const userProfile = await authRepository.getUserProfile(currentUser.uid);

        // Check if user profile exists in Firestore
        if (!userProfile) {
          console.error('User profile not found in Firestore. Logging out...');
          await authRepository.logout();
          setUser(null);
          return;
        }

        // Check if user is deleted
        if (userProfile.isDeleted === true) {
          console.error('User account is deleted. Logging out...');
          await authRepository.logout();
          setUser(null);
          return;
        }

        // Sync emailVerified status
        if (currentUser.emailVerified !== userProfile.emailVerified) {
          authRepository.updateUserProfile(currentUser.uid, {
            emailVerified: currentUser.emailVerified,
            updatedAt: new Date(),
          }).catch((err) => {
            console.error('Failed to sync emailVerified:', err);
          });
        }

        setUser({
          ...userProfile,
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified, // Must be after spread
        });
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const value = {
    user,
    // Backward compatibility: `loading` maps to authLoading (fast check)
    loading: authLoading,
    authLoading,
    profileLoading,
    error,
    isAuthenticated: !!user && user.emailVerified === true,
    isEmailVerified: user?.emailVerified === true,
    refreshUser, // Expose refresh function
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * Access auth state from any component
 *
 * Usage:
 * const { user, loading, isAuthenticated } = useAuth()
 * const { user, authLoading, profileLoading } = useAuth()
 *
 * if (loading) return <Loading />        // resolves fast (~100ms)
 * if (profileLoading) return <Skeleton /> // resolves after Firestore fetch
 * if (!isAuthenticated) return <Login />
 * return <Dashboard user={user} />
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export default AuthContext;

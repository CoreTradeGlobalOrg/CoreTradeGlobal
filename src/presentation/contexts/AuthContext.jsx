/**
 * Auth Context
 *
 * Manages global authentication state
 * Provides auth state to all components in the app
 *
 * This replaces the need for Redux/Zustand for auth state
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const authRepository = container.getAuthRepository();

    const unsubscribe = authRepository.onAuthStateChanged(
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // User is signed in, fetch full profile
            const userProfile = await authRepository.getUserProfile(
              firebaseUser.uid
            );

            // Sync emailVerified status from Firebase Auth to Firestore
            if (userProfile && firebaseUser.emailVerified !== userProfile.emailVerified) {
              await authRepository.updateUserProfile(firebaseUser.uid, {
                emailVerified: firebaseUser.emailVerified,
                updatedAt: new Date(),
              });
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified, // Use Firebase Auth value
              ...userProfile,
            });
          } else {
            // User is signed out
            setUser(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
          setError(err.message);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Force refresh user data
  const refreshUser = async () => {
    try {
      setLoading(true);
      const authRepository = container.getAuthRepository();

      // Reload Firebase Auth user
      await authRepository.reloadUser();

      const currentUser = authRepository.getCurrentUser();

      if (currentUser) {
        // Get fresh profile from Firestore
        const userProfile = await authRepository.getUserProfile(currentUser.uid);

        // Sync emailVerified status
        if (userProfile && currentUser.emailVerified !== userProfile.emailVerified) {
          await authRepository.updateUserProfile(currentUser.uid, {
            emailVerified: currentUser.emailVerified,
            updatedAt: new Date(),
          });
        }

        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          ...userProfile,
        });
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
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
 *
 * if (loading) return <Loading />
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

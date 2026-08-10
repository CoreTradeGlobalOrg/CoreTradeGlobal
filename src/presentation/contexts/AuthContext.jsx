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
import { bumpLastLoginAt } from '@/lib/analytics/tracking';

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
// Session cookie lives 7 days (see /api/auth/session). We refresh at 6 days so
// there is always a valid cookie ahead of expiry — the httpOnly cookie can't
// be inspected from JS, so we track write time in localStorage instead.
// v2 forces a one-time cookie rewrite for every returning user; the previous
// key held stale timestamps from before role='admin' was landing in cookies.
const SESSION_COOKIE_HINT_KEY = 'session_cookie_written_at_v2';
const SESSION_COOKIE_REFRESH_MS = 6 * 24 * 60 * 60 * 1000;

function readSessionHint() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(SESSION_COOKIE_HINT_KEY) : null;
    if (!raw) return 0;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

function writeSessionHint() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_COOKIE_HINT_KEY, String(Date.now()));
    }
  } catch {
    // localStorage may be blocked (private mode, quota) — fall back to per-tab ref.
  }
}

function clearSessionHint() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_COOKIE_HINT_KEY);
    }
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce concurrent fetchProfileAndSession runs. onAuthStateChanged can
  // fire in quick succession (login → token refresh → tab focus); only the
  // latest run should be allowed to update React state.
  const latestFetchId = useRef(0);

  useEffect(() => {
    // Subscribe to auth state changes
    const authRepository = container.getAuthRepository();

    // Firebase Auth's persistence restore is async. When the auth SDK is
    // lazily loaded (see firebase.config.js / FirebaseAuthDataSource.js),
    // onAuthStateChanged can fire TWICE on a fresh page load for a user
    // who is actually signed in:
    //   1. First fire (null) — subscribe raced restore; persistence hasn't
    //      hydrated yet, so currentUser is null.
    //   2. Second fire (real user) — restore completes and Firebase fires
    //      again with the restored user.
    //
    // Naively treating the first null as "signed out" wipes the session
    // cookie, drops authLoading to false with user=null, and any protected
    // page's `if (!loading && !isAuthenticated) router.replace('/login')`
    // guard fires — the user is booted back to /login before the second
    // fire can land. Middleware then sees a still-valid session cookie on
    // /login and bounces them to '/'. Symptom: "I logged in but I got
    // sent back to /login, then to '/' when I refreshed."
    //
    // Fix: if we have a session-hint cookie marker on mount (i.e. we
    // wrote the session cookie at least once this browser), ignore the
    // first null fire. Wait for the real user. A 2s safety timeout
    // releases authLoading if the second fire never arrives (stale hint,
    // wiped IndexedDB, revoked session), so protected pages can still
    // make a redirect decision instead of spinning forever.
    const hasHintOnMount = readSessionHint() > 0;
    let hasEverSeenUser = false;

    const unsubscribe = authRepository.onAuthStateChanged(
      (firebaseUser) => {
        if (firebaseUser) {
          hasEverSeenUser = true;

          // Immediately set a basic user from Firebase Auth (fast, no Firestore).
          // Include displayName / photoURL so the Navbar avatar can render
          // straight from the Firebase Auth record for OAuth users — the
          // previous shape omitted them, so between basicUser landing and
          // fetchProfileAndSession completing the header had no image
          // source, and any code that ran <Image src={undefined}> flashed
          // a broken-image state until the Firestore fetch finished.
          const basicUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
          };

          setUser(basicUser);
          setAuthLoading(false);

          // Fetch full profile in the background
          setProfileLoading(true);
          fetchProfileAndSession(authRepository, firebaseUser);
        } else {
          // Race guard — see the block comment above. On a fresh page
          // with a session hint present, the first null fire is almost
          // always the pre-restore state, not a real sign-out.
          if (!hasEverSeenUser && hasHintOnMount) {
            return;
          }

          // Real sign-out (or no prior session at all).
          setUser(null);
          setAuthLoading(false);
          setProfileLoading(false);
          clearSessionHint();

          // Clear session cookie in background (fire-and-forget)
          fetch('/api/auth/session', { method: 'DELETE' }).catch((cookieError) => {
            console.error('Failed to clear session cookie:', cookieError);
          });
        }
      }
    );

    // Safety valve: if the second fire (real user) never comes, unlock
    // authLoading so the app doesn't hang on a spinner forever. Leaves
    // user=null and preserves the cookie/hint so the next request lets
    // the server (middleware / API) make the final call.
    const releaseTimer = setTimeout(() => {
      if (!hasEverSeenUser && hasHintOnMount) {
        setAuthLoading(false);
        setProfileLoading(false);
      }
    }, 2000);

    // Cleanup subscription on unmount
    return () => {
      clearTimeout(releaseTimer);
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetches the full user profile from Firestore and sets the session cookie.
   * Runs in the background after auth state resolves.
   *
   * Reliability guarantees:
   * - Never signs the user out on a transient Firestore failure. A missing
   *   profile is only treated as "not created yet" when Firestore explicitly
   *   returns "no document"; network/permission errors keep the basic user.
   * - Never nullifies `user` in the top-level catch. Firebase Auth session
   *   remains valid; only the profile fetch failed.
   * - Only the latest run wins (debounced via latestFetchId) so a slow first
   *   fetch can't overwrite a fast second one with stale data.
   */
  const fetchProfileAndSession = async (authRepository, firebaseUser) => {
    const fetchId = ++latestFetchId.current;
    const isStale = () => fetchId !== latestFetchId.current;

    try {
      let userProfile = null;
      let profileFetchFailed = false;

      try {
        userProfile = await authRepository.getUserProfile(firebaseUser.uid);
      } catch (err) {
        profileFetchFailed = true;
        console.error('getUserProfile failed:', err);
      }

      if (!userProfile && !profileFetchFailed) {
        // On hard refresh Firestore may not be ready yet — one retry.
        await new Promise((r) => setTimeout(r, 1000));
        if (isStale()) return;
        try {
          userProfile = await authRepository.getUserProfile(firebaseUser.uid);
        } catch (err) {
          profileFetchFailed = true;
          console.error('getUserProfile retry failed:', err);
        }
      }

      if (isStale()) return;

      // A transient fetch failure must NOT log the user out. Keep the basic
      // user and let the next auth-state fire retry the profile hydration.
      if (profileFetchFailed) {
        setProfileLoading(false);
        return;
      }

      // No profile document exists. Before assuming "brand-new user"
      // and letting the layout guard kick them to /complete-profile,
      // rule out the two false-positive cases we've hit on hard refresh:
      //
      //   1. Custom claim proof — the ID token carries a `role` claim
      //      (admin / lawyer / provider …) only after a Cloud Function
      //      onboarded them. If the claim exists, this user has finished
      //      registration; the null Firestore read is transient (cold
      //      Firestore SDK on hard refresh, offline persistence off).
      //      Seed the state with the role claim as evidence so the
      //      MainLayout profileComplete guard finds it.
      //
      //   2. Session cookie hint — this browser has previously written
      //      the httpOnly session cookie, meaning we've hydrated a real
      //      profile here at least once. Treat any null now as transient.
      //
      // In both cases we mark profileComplete: true so the layout guard
      // does not run its redirect. The next auth-state fire (natural
      // token refresh, tab focus) will re-hit fetchProfileAndSession
      // and land the full profile. Only truly-new users fall past this
      // block into the fresh-signup fallback.
      if (!userProfile) {
        const providerId = firebaseUser.providerData?.[0]?.providerId;
        const isOAuth = !providerId || providerId !== 'password';
        const authProvider = isOAuth
          ? (providerId === 'google.com' ? 'google' : (providerId || 'linkedin'))
          : 'password';

        let roleClaim = null;
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          roleClaim = tokenResult?.claims?.role || null;
        } catch (claimErr) {
          console.warn('getIdTokenResult failed while checking role claim:', claimErr);
        }
        if (isStale()) return;

        const hasSessionHint = readSessionHint() > 0;

        if (roleClaim || hasSessionHint) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            authProvider,
            role: roleClaim || undefined,
            profileComplete: true,
          });
          setProfileLoading(false);
          return;
        }

        // Truly-new user: no claim, no prior session — send to /complete-profile.
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          authProvider,
          profileComplete: false,
        });
        setProfileLoading(false);
        return;
      }

      // Explicit soft-delete: this is a definitive state (not a fetch error).
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

      if (isStale()) return;

      const userData = {
        ...userProfile,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        profileComplete: userProfile.profileComplete !== false,
      };

      setUser(userData);

      // Feed the Active-30d KPI on the analytics dashboard. Client-side
      // throttled to at most once per hour per browser, fire-and-forget
      // so a Firestore hiccup can't stall the login flow.
      bumpLastLoginAt(firebaseUser.uid);

      // Refresh the session cookie when the local hint is missing or older
      // than 6 days. Uses a forced token refresh so newly-added custom
      // claims (e.g. role='admin') land in the cookie right away instead of
      // waiting up to an hour for the cached token to naturally rotate.
      const hint = readSessionHint();
      const cookieStale = !hint || Date.now() - hint > SESSION_COOKIE_REFRESH_MS;
      if (cookieStale) {
        try {
          const idToken = await firebaseUser.getIdToken(true);
          if (isStale()) return;
          const sessionResponse = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          if (sessionResponse.ok) {
            writeSessionHint();
          } else {
            console.error(
              `Session cookie not set (status ${sessionResponse.status}). ` +
              'Role-based route protection may not work.'
            );
          }
        } catch (cookieError) {
          console.error('Failed to set session cookie:', cookieError);
        }
      }
    } catch (err) {
      // Do NOT nullify `user` here. Firebase Auth session is still valid;
      // only the profile hydration failed. Header stays authenticated and
      // the next auth-state fire retries the work.
      console.error('Auth state change error:', err);
      setError(err.message);
    } finally {
      if (!isStale()) setProfileLoading(false);
    }
  };

  // Force refresh user data. Follows the same reliability rules as
  // fetchProfileAndSession: transient failures never sign the user out.
  const refreshUser = async () => {
    try {
      setProfileLoading(true);
      const authRepository = container.getAuthRepository();

      await authRepository.reloadUser();
      const currentUser = authRepository.getCurrentUser();
      if (!currentUser) return;

      let userProfile = null;
      let profileFetchFailed = false;
      try {
        userProfile = await authRepository.getUserProfile(currentUser.uid);
      } catch (err) {
        profileFetchFailed = true;
        console.error('refreshUser: getUserProfile failed:', err);
      }

      // Transient failure — keep current user; do not sign out.
      if (profileFetchFailed) return;

      if (!userProfile) {
        // Same false-positive guard as fetchProfileAndSession — see the
        // longer comment there. Custom role claim OR a prior session
        // cookie is evidence this user was already onboarded; don't
        // stomp them into a /complete-profile-bound bare state just
        // because a refetch raced null.
        const providerId = currentUser.providerData?.[0]?.providerId;
        const isOAuth = !providerId || providerId !== 'password';
        const authProvider = isOAuth
          ? (providerId === 'google.com' ? 'google' : (providerId || 'linkedin'))
          : 'password';

        let roleClaim = null;
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          roleClaim = tokenResult?.claims?.role || null;
        } catch (claimErr) {
          console.warn('refreshUser: getIdTokenResult failed:', claimErr);
        }

        const hasSessionHint = readSessionHint() > 0;

        if (roleClaim || hasSessionHint) {
          setUser({
            uid: currentUser.uid,
            email: currentUser.email,
            emailVerified: currentUser.emailVerified,
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            authProvider,
            role: roleClaim || undefined,
            profileComplete: true,
          });
          return;
        }

        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          authProvider,
          profileComplete: false,
        });
        return;
      }

      if (userProfile.isDeleted === true) {
        console.error('User account is deleted. Logging out...');
        await authRepository.logout();
        setUser(null);
        return;
      }

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
        emailVerified: currentUser.emailVerified,
        profileComplete: userProfile.profileComplete !== false,
      });
    } catch (err) {
      // Same rule as fetchProfileAndSession — do not clear `user`.
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
    // TODO: Re-enable email verification check when verification flow is finalized
    // isAuthenticated: !!user && user.emailVerified === true,
    isAuthenticated: !!user,
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

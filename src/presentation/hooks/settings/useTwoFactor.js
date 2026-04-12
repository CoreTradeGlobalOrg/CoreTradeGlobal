import { useState, useEffect, useRef } from 'react';
import {
  multiFactor,
  TotpMultiFactorGenerator,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/core/config/firebase.config';

/**
 * useTwoFactor
 *
 * Manages full TOTP 2FA lifecycle:
 *   idle -> reauthenticating -> scanning -> verifying -> showCodes -> idle
 *
 * Backup codes are generated client-side using SubtleCrypto, hashed with SHA-256,
 * and stored in Firestore under users/{uid}/security/backupCodes.
 */
export function useTwoFactor() {
  const [step, setStep] = useState('idle');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const totpSecretRef = useRef(null);

  // Check enrollment status on mount
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const factors = multiFactor(user).enrolledFactors;
      const enrolled = factors.some((f) => f.factorId === 'totp');
      setIsEnrolled(enrolled);
    } catch {
      // multiFactor may throw if user not loaded yet — ignore
    }
  }, []);

  /** Step 1: Signal intent to enroll — caller renders reauth form */
  const startEnrollment = () => {
    setError(null);
    setStep('reauthenticating');
  };

  /** Step 2: Reauthenticate, generate TOTP secret and QR code URL */
  const reauthAndGenerateSecret = async (currentPassword) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      const session = await multiFactor(user).getSession();
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
      totpSecretRef.current = totpSecret;

      const url = totpSecret.generateQrCodeUrl(user.email, 'CoreTradeGlobal');
      setQrCodeUrl(url);
      setStep('scanning');
    } catch (err) {
      setError(_mapError(err));
    } finally {
      setLoading(false);
    }
  };

  /** Step 3: Verify 6-digit TOTP code and complete enrollment, then generate backup codes */
  const verifyAndEnroll = async (sixDigitCode) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      if (!totpSecretRef.current) throw new Error('Session expired. Please start again.');

      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        totpSecretRef.current,
        sixDigitCode
      );
      await multiFactor(user).enroll(assertion, 'TOTP Authenticator');

      // Generate 10 backup codes: each 5 random bytes -> uppercase hex -> XXXXX-XXXXX
      const plainCodes = await _generateBackupCodes(10);

      // Hash each code with SHA-256 and store in Firestore
      const hashedCodes = await Promise.all(plainCodes.map(_sha256Hex));
      await setDoc(doc(db, 'users', user.uid, 'security', 'backupCodes'), {
        codes: hashedCodes,
        createdAt: new Date(),
      });

      setBackupCodes(plainCodes);
      setIsEnrolled(true);
      setStep('showCodes');
    } catch (err) {
      setError(_mapError(err));
    } finally {
      setLoading(false);
    }
  };

  /** Disable 2FA: reauthenticate, unenroll TOTP factor, delete backup codes */
  const disableTwoFactor = async (currentPassword) => {
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      const factors = multiFactor(user).enrolledFactors;
      const totpFactor = factors.find((f) => f.factorId === 'totp');
      if (!totpFactor) throw new Error('No TOTP factor enrolled');

      await multiFactor(user).unenroll(totpFactor.uid);

      // Clean up stored backup codes
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'security', 'backupCodes'));
      } catch {
        // Non-critical — ignore if already missing
      }

      setIsEnrolled(false);
      setStep('idle');
    } catch (err) {
      if (err.code === 'auth/user-token-expired') {
        setError('You have been signed out. Please log in again.');
        // Redirect handled by caller after seeing this error
      } else {
        setError(_mapError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  /** Reset all state back to idle (e.g. after user saves backup codes) */
  const reset = () => {
    setStep('idle');
    setQrCodeUrl(null);
    setBackupCodes([]);
    setError(null);
    totpSecretRef.current = null;
  };

  return {
    step,
    qrCodeUrl,
    backupCodes,
    loading,
    error,
    isEnrolled,
    startEnrollment,
    reauthAndGenerateSecret,
    verifyAndEnroll,
    disableTwoFactor,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function _generateBackupCodes(count) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(5);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(`${hex.slice(0, 5)}-${hex.slice(5)}`);
  }
  return codes;
}

async function _sha256Hex(text) {
  const encoded = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function _mapError(err) {
  switch (err.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Current password is incorrect';
    case 'auth/requires-recent-login':
      return 'Please log in again to continue';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    case 'auth/invalid-verification-code':
      return 'Invalid code. Please check your authenticator app';
    default:
      return err.message || 'An error occurred. Please try again';
  }
}

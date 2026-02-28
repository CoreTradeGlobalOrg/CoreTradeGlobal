/**
 * OnboardingWizard Component
 *
 * Multi-step wizard for invited users to complete their account setup:
 *   Step 1 — Verify Identity & Set Password (sign in with email link + set password)
 *   Step 2 — Confirm Details (read Firestore profile, confirm role)
 *   Step 3 — Profile Photo (upload to Storage, skippable)
 *   Step 4 — Preferences & Complete (save prefs, update invite status, redirect by role)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  Eye,
  EyeOff,
  Upload,
  User,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { auth, db, storage } from '@/core/config/firebase.config';
import { ROLES, ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS } from '@/core/constants/roles';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const step1Schema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const step4Schema = z.object({
  emailNotifications: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Identity', description: 'Verify & set password' },
  { id: 2, label: 'Details', description: 'Confirm your profile' },
  { id: 3, label: 'Photo', description: 'Upload profile photo' },
  { id: 4, label: 'Preferences', description: 'Configure & complete' },
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 60 : -60, opacity: 0 }),
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const colors = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS[ROLES.MEMBER];
  const darkMap = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${darkMap[colors.color] || darkMap.blue}`}>
      {ROLE_DISPLAY_NAMES[role] || role}
    </span>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 ${isCurrent ? 'text-[#FFD700]' : isCompleted ? 'text-green-400' : 'text-gray-500'}`}>
              {isCompleted ? (
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
              ) : (
                <Circle className={`w-6 h-6 flex-shrink-0 ${isCurrent ? 'fill-[#FFD700]/20' : ''}`} />
              )}
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-8 h-px mx-2 ${isCompleted ? 'bg-green-400/50' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard({ uid: initialUid }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 state
  const [emailForLink, setEmailForLink] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step1Done, setStep1Done] = useState(false);

  // Step 2 state
  const [userProfile, setUserProfile] = useState(null);
  const [step2Loading, setStep2Loading] = useState(false);

  // Step 3 state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Step 4 state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Pre-fill email: try URL search params (from invite link), then localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const stored = localStorage.getItem('emailForSignIn');

    if (uid) {
      // Fetch email from Firestore invite doc using the uid from the invite link
      getDoc(doc(db, 'invites', uid)).then((snap) => {
        if (snap.exists()) {
          setEmailForLink(snap.data().email);
        } else if (stored) {
          setEmailForLink(stored);
        }
      }).catch(() => {
        if (stored) setEmailForLink(stored);
      });
    } else if (stored) {
      setEmailForLink(stored);
    }
  }, []);

  // Step 1 form
  const {
    register: registerStep1,
    handleSubmit: handleStep1Submit,
    formState: { errors: step1Errors },
    setValue: setStep1Value,
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  // Pre-fill email in form when detected
  useEffect(() => {
    if (emailForLink) setStep1Value('email', emailForLink);
  }, [emailForLink, setStep1Value]);

  // Fetch profile on step 2 entry
  const fetchUserProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setStep2Loading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile({ id: currentUser.uid, ...userDoc.data() });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast.error('Could not load your profile. Please try again.');
    } finally {
      setStep2Loading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2) fetchUserProfile();
  }, [step, fetchUserProfile]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => {
    // Prevent going back to step 1 — the sign-in link is single-use and already consumed
    if (step <= 2) return;
    setDirection(-1);
    setStep((s) => s - 1);
  };

  // ── Step 1: Verify Identity & Set Password ───────────────────────────────

  const onStep1Submit = async (data) => {
    setIsLoading(true);
    try {
      const href = window.location.href;

      if (!isSignInWithEmailLink(auth, href)) {
        toast.error('This link is not a valid sign-in link. Please use the invite link from your email.');
        setIsLoading(false);
        return;
      }

      // Sign in with email link
      const credential = await signInWithEmailLink(auth, data.email, href);
      const user = credential.user;

      // Clear localStorage email
      localStorage.removeItem('emailForSignIn');

      // Set password
      await updatePassword(user, data.password);

      // Force token refresh to get custom claims
      await user.getIdToken(true);

      // Update session cookie with fresh token
      try {
        const freshToken = await user.getIdToken();
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: freshToken }),
        });
      } catch (cookieErr) {
        console.error('Failed to update session cookie:', cookieErr);
      }

      setStep1Done(true);
      toast.success('Identity verified! Let\'s confirm your details.');
      goNext();
    } catch (err) {
      console.error('Step 1 error:', err);
      if (err.code === 'auth/invalid-action-code' || err.code === 'auth/expired-action-code') {
        toast.error('This invite link has expired or already been used. Please ask your admin to resend.');
      } else if (err.code === 'auth/invalid-email') {
        toast.error('The email you entered does not match the invite. Please check and try again.');
      } else {
        toast.error(err.message || 'Failed to verify identity. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Confirm Details ──────────────────────────────────────────────

  const onStep2Continue = () => {
    goNext();
  };

  // ── Step 3: Profile Photo ─────────────────────────────────────────────────

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    const user = auth.currentUser;
    if (!user || !photoFile) return;

    setPhotoUploading(true);
    try {
      const ext = photoFile.name.split('.').pop();
      const path = `users/${user.uid}/profile.${ext}`;
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, photoFile, { contentType: photoFile.type });
      const photoURL = await getDownloadURL(snapshot.ref);

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL });

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), { photoURL, updatedAt: serverTimestamp() });

      toast.success('Profile photo uploaded!');
      goNext();
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error('Failed to upload photo. You can skip and add it later.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSkipPhoto = () => {
    toast('Photo skipped — you can add it from your profile later.', { icon: 'ℹ️' });
    goNext();
  };

  // ── Step 4: Preferences & Complete ───────────────────────────────────────

  const handleComplete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setCompleting(true);
    try {
      const now = serverTimestamp();

      // Save preferences + mark onboarding complete
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: {
          emailNotifications,
          marketingEmails,
        },
        onboardingComplete: true,
        inviteStatus: 'accepted',
        updatedAt: now,
      });

      // Update invite doc status
      try {
        await updateDoc(doc(db, 'invites', user.uid), {
          status: 'accepted',
          acceptedAt: now,
        });
      } catch {
        // Invite doc might have been cleaned up by TTL; not fatal
        console.warn('Could not update invite doc — may have expired');
      }

      // Force session refresh one more time with final claims
      try {
        const freshToken = await user.getIdToken(true);
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: freshToken }),
        });
      } catch (cookieErr) {
        console.error('Failed to refresh session cookie:', cookieErr);
      }

      toast.success('Welcome aboard! Redirecting to your dashboard...');

      // Get fresh claims for role-based redirect
      const idTokenResult = await user.getIdTokenResult(true);
      const role = idTokenResult.claims.role;

      // Redirect by role
      setTimeout(() => {
        if (role === ROLES.LOGISTICS_PROVIDER || role === ROLES.INSURANCE_PROVIDER) {
          window.location.href = '/provider';
        } else if (role === ROLES.LAWYER) {
          window.location.href = '/lawyer';
        } else {
          window.location.href = '/';
        }
      }, 1500);
    } catch (err) {
      console.error('Complete error:', err);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Complete Your Account Setup</h1>
        <p className="text-sm text-[#A0A0A0] mt-2">Step {step} of {STEPS.length} — {STEPS[step - 1].description}</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} totalSteps={STEPS.length} />

      {/* Step Content */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* ── Step 1: Verify Identity ────────────────────────────────── */}
            {step === 1 && (
              <div className="login-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Verify Your Identity</h2>
                    <p className="text-xs text-gray-400">Sign in with your invite link and set a password</p>
                  </div>
                </div>

                <form onSubmit={handleStep1Submit(onStep1Submit)} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      {...registerStep1('email')}
                      placeholder="you@company.com"
                      disabled={isLoading}
                      className="form-input-anasyf"
                    />
                    {step1Errors.email && (
                      <p className="mt-1 text-xs text-red-400">{step1Errors.email.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the email address this invite was sent to
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                      Set Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...registerStep1('password')}
                        placeholder="Min. 8 characters"
                        disabled={isLoading}
                        className="form-input-anasyf pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {step1Errors.password && (
                      <p className="mt-1 text-xs text-red-400">{step1Errors.password.message}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        {...registerStep1('confirmPassword')}
                        placeholder="Re-enter your password"
                        disabled={isLoading}
                        className="form-input-anasyf pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {step1Errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-400">{step1Errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Continue
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ── Step 2: Confirm Details ────────────────────────────────── */}
            {step === 2 && (
              <div className="login-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Confirm Your Details</h2>
                    <p className="text-xs text-gray-400">Review the information associated with your account</p>
                  </div>
                </div>

                {step2Loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" />
                  </div>
                ) : userProfile ? (
                  <div className="space-y-4 mb-6">
                    <div className="bg-[#0F1B2B]/60 rounded-xl p-4 border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">Full Name</span>
                        <span className="text-white font-medium">{userProfile.displayName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">Email</span>
                        <span className="text-white font-medium">{userProfile.email || auth.currentUser?.email}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">Company</span>
                        <span className="text-white font-medium">{userProfile.companyName || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#A0A0A0] uppercase tracking-wider">Role</span>
                        <RoleBadge role={userProfile.role} />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                      Your role has been set by the administrator. Contact your admin if any details are incorrect.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">Could not load profile data.</p>
                )}

                <button
                  type="button"
                  onClick={onStep2Continue}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 transition-all"
                >
                  Looks Good, Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ── Step 3: Profile Photo ──────────────────────────────────── */}
            {step === 3 && (
              <div className="login-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Profile Photo</h2>
                    <p className="text-xs text-gray-400">Optional — helps others recognize you</p>
                  </div>
                </div>

                {/* Photo Preview */}
                <div className="flex flex-col items-center gap-4 mb-6">
                  {photoPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="w-28 h-28 rounded-full object-cover border-2 border-[#FFD700]/40"
                      />
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-[#0F1B2B] border-2 border-dashed border-white/20 flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-600" />
                    </div>
                  )}

                  <label className="cursor-pointer">
                    <span className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-all">
                      <Upload className="w-4 h-4" />
                      {photoPreview ? 'Change Photo' : 'Choose Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>

                  <p className="text-xs text-gray-500 text-center">
                    Supported: JPG, PNG, GIF (max 5MB)
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipPhoto}
                    disabled={photoUploading}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 font-medium rounded-xl transition-all disabled:opacity-50"
                  >
                    Skip for now
                  </button>

                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    disabled={!photoFile || photoUploading}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {photoUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        Upload & Continue
                        <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Preferences & Complete ───────────────────────── */}
            {step === 4 && (
              <div className="login-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#FFD700]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Preferences</h2>
                    <p className="text-xs text-gray-400">Customize your experience</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between p-4 bg-[#0F1B2B]/60 rounded-xl border border-white/10">
                    <div>
                      <p className="text-white font-medium text-sm">Email Notifications</p>
                      <p className="text-xs text-gray-400 mt-0.5">Receive updates about trade deals and messages</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailNotifications((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        emailNotifications ? 'bg-[#FFD700]' : 'bg-white/20'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {/* Marketing Emails */}
                  <div className="flex items-center justify-between p-4 bg-[#0F1B2B]/60 rounded-xl border border-white/10">
                    <div>
                      <p className="text-white font-medium text-sm">Platform Announcements</p>
                      <p className="text-xs text-gray-400 mt-0.5">News about new features and platform updates</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMarketingEmails((v) => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        marketingEmails ? 'bg-[#FFD700]' : 'bg-white/20'
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        marketingEmails ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completing}
                    className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {completing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Completing Setup...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <CheckCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingWizard;

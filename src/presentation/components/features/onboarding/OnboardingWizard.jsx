/**
 * OnboardingWizard Component
 *
 * Multi-step wizard for invited users to complete their account setup.
 * Orchestrates: IdentityStep, DetailsStep, PhotoStep, PreferencesStep
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  isSignInWithEmailLink, signInWithEmailLink, updatePassword, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth, db, storage } from '@/core/config/firebase.config';
import { ROLES } from '@/core/constants/roles';
import { IdentityStep } from './steps/IdentityStep';
import { DetailsStep } from './steps/DetailsStep';
import { PhotoStep } from './steps/PhotoStep';
import { PreferencesStep } from './steps/PreferencesStep';

const step1Schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

const STEPS = [
  { id: 1, label: 'Identity', description: 'Verify & set password' },
  { id: 2, label: 'Details', description: 'Confirm your profile' },
  { id: 3, label: 'Photo', description: 'Upload profile photo' },
  { id: 4, label: 'Preferences', description: 'Configure & complete' },
];

const slideVariants = {
  enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d) => ({ x: d < 0 ? 60 : -60, opacity: 0 }),
};

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 ${isCurrent ? 'text-[#FFD700]' : isCompleted ? 'text-green-400' : 'text-gray-500'}`}>
              {isCompleted ? <CheckCircle className="w-6 h-6 flex-shrink-0" /> : <Circle className={`w-6 h-6 flex-shrink-0 ${isCurrent ? 'fill-[#FFD700]/20' : ''}`} />}
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && <div className={`w-8 h-px mx-2 ${isCompleted ? 'bg-green-400/50' : 'bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function OnboardingWizard({ uid: initialUid }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailForLink, setEmailForLink] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [step2Loading, setStep2Loading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [completing, setCompleting] = useState(false);

  const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, STEPS.length)); };
  const goBack = () => { if (step <= 2) return; setDirection(-1); setStep((s) => s - 1); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('uid');
    const stored = localStorage.getItem('emailForSignIn');
    if (uid) {
      getDoc(doc(db, 'invites', uid)).then((snap) => {
        setEmailForLink(snap.exists() ? snap.data().email : stored || '');
      }).catch(() => { if (stored) setEmailForLink(stored); });
    } else if (stored) {
      setEmailForLink(stored);
    }
  }, []);

  const { register: registerStep1, handleSubmit: handleStep1Submit, formState: { errors: step1Errors }, setValue: setStep1Value } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => { if (emailForLink) setStep1Value('email', emailForLink); }, [emailForLink, setStep1Value]);

  const fetchUserProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setStep2Loading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) setUserProfile({ id: currentUser.uid, ...userDoc.data() });
    } catch { toast.error('Could not load your profile. Please try again.'); }
    finally { setStep2Loading(false); }
  }, []);

  useEffect(() => { if (step === 2) fetchUserProfile(); }, [step, fetchUserProfile]);

  const onStep1Submit = async (data) => {
    setIsLoading(true);
    try {
      const href = window.location.href;
      if (!isSignInWithEmailLink(auth, href)) { toast.error('This link is not a valid sign-in link. Please use the invite link from your email.'); return; }
      const { user } = await signInWithEmailLink(auth, data.email, href);
      localStorage.removeItem('emailForSignIn');
      await updatePassword(user, data.password);
      await user.getIdToken(true);
      try {
        const token = await user.getIdToken();
        await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
      } catch (e) { console.error('Failed to update session cookie:', e); }
      toast.success("Identity verified! Let's confirm your details.");
      goNext();
    } catch (err) {
      if (err.code === 'auth/invalid-action-code' || err.code === 'auth/expired-action-code') toast.error('This invite link has expired or already been used. Please ask your admin to resend.');
      else if (err.code === 'auth/invalid-email') toast.error('The email you entered does not match the invite. Please check and try again.');
      else toast.error(err.message || 'Failed to verify identity. Please try again.');
    } finally { setIsLoading(false); }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) { setPhotoFile(null); setPhotoPreview(null); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5MB.'); return; }
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoUpload = async () => {
    const user = auth.currentUser;
    if (!user || !photoFile) return;
    setPhotoUploading(true);
    try {
      const ext = photoFile.name.split('.').pop();
      const storageRef = ref(storage, `users/${user.uid}/profile.${ext}`);
      const snapshot = await uploadBytes(storageRef, photoFile, { contentType: photoFile.type });
      const photoURL = await getDownloadURL(snapshot.ref);
      await updateProfile(user, { photoURL });
      await updateDoc(doc(db, 'users', user.uid), { photoURL, updatedAt: serverTimestamp() });
      toast.success('Profile photo uploaded!');
      goNext();
    } catch { toast.error('Failed to upload photo. You can skip and add it later.'); }
    finally { setPhotoUploading(false); }
  };

  const handleComplete = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setCompleting(true);
    try {
      const now = serverTimestamp();
      await updateDoc(doc(db, 'users', user.uid), { preferences: { emailNotifications, marketingEmails }, onboardingComplete: true, inviteStatus: 'accepted', updatedAt: now });
      try { await updateDoc(doc(db, 'invites', user.uid), { status: 'accepted', acceptedAt: now }); } catch { /* Invite doc may have expired — non-fatal */ }
      try {
        const freshToken = await user.getIdToken(true);
        await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: freshToken }) });
      } catch (e) { console.error('Failed to refresh session cookie:', e); }
      toast.success('Welcome aboard! Redirecting to your dashboard...');
      const { claims } = await user.getIdTokenResult(true);
      setTimeout(() => {
        if (claims.role === ROLES.LOGISTICS_PROVIDER || claims.role === ROLES.INSURANCE_PROVIDER) window.location.href = '/provider';
        else if (claims.role === ROLES.LAWYER) window.location.href = '/lawyer';
        else window.location.href = '/';
      }, 1500);
    } catch { toast.error('Failed to complete setup. Please try again.'); }
    finally { setCompleting(false); }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Complete Your Account Setup</h1>
        <p className="text-sm text-[#A0A0A0] mt-2">Step {step} of {STEPS.length} — {STEPS[step - 1].description}</p>
      </div>
      <StepIndicator currentStep={step} />
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: 'easeInOut' }}>
            {step === 1 && <IdentityStep registerStep1={registerStep1} handleStep1Submit={handleStep1Submit} onSubmit={onStep1Submit} step1Errors={step1Errors} isLoading={isLoading} showPassword={showPassword} setShowPassword={setShowPassword} showConfirm={showConfirm} setShowConfirm={setShowConfirm} />}
            {step === 2 && <DetailsStep userProfile={userProfile} step2Loading={step2Loading} onContinue={goNext} />}
            {step === 3 && <PhotoStep photoPreview={photoPreview} photoUploading={photoUploading} photoFile={photoFile} onPhotoSelect={handlePhotoSelect} onPhotoUpload={handlePhotoUpload} onSkip={() => { toast('Photo skipped — you can add it from your profile later.', { icon: 'ℹ️' }); goNext(); }} onBack={goBack} />}
            {step === 4 && <PreferencesStep emailNotifications={emailNotifications} setEmailNotifications={setEmailNotifications} marketingEmails={marketingEmails} setMarketingEmails={setMarketingEmails} completing={completing} onComplete={handleComplete} onBack={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingWizard;

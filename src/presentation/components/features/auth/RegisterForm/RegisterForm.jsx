/**
 * RegisterForm Component
 *
 * 3-step registration form orchestrator.
 * Step 1: Email + Privacy consent
 * Step 2: Personal Information
 * Step 3: Company Information + Password + reCAPTCHA + Submit
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ReCAPTCHA from 'react-google-recaptcha';
import Link from 'next/link';

import { httpsCallable } from 'firebase/functions';
import { registerSchema } from '@/core/validation/registerSchema';
import { useRegister } from '@/presentation/hooks/auth/useRegister';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useTrackEvent } from '@/presentation/hooks/analytics';
import { auth, getFunctionsInstance } from '@/core/config/firebase.config';
import { COMPANY_TYPE_TO_ROLE } from '@/core/constants/companyTypes';
import { RegisterFormFields } from './RegisterFormFields';
import { SocialAuthButtons } from '@/presentation/components/features/auth/SocialAuthButtons/SocialAuthButtons';

// SECURITY: Google's test reCAPTCHA key - should NEVER be used in production
const RECAPTCHA_TEST_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const isTestKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY === RECAPTCHA_TEST_KEY;
const isProduction = process.env.NODE_ENV === 'production';

if (isTestKey && isProduction) {
  console.error(
    'SECURITY WARNING: Using test reCAPTCHA key in production! ' +
    'Get a real key from https://www.google.com/recaptcha/admin'
  );
}

// Fields to validate per step
const STEP_FIELDS = {
  1: ['email', 'acceptPolicies'],
  2: ['firstName', 'lastName', 'phone', 'position'],
  3: ['companyType', 'companyName', 'companyCategory', 'country', 'password', 'confirmPassword'],
};

const STEP_TITLES = {
  1: 'Join CoreTradeGlobal',
  2: 'Personal Information',
  3: 'Company Information',
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { register: registerUser, loading } = useRegister();
  const { categories, loading: categoriesLoading } = useCategories();
  const { trackSignUp, track } = useTrackEvent();
  const [step, setStep] = useState(1);

  useEffect(() => {
    track('begin_registration');
  }, [track]);

  useEffect(() => {
    if (redirectTo) {
      localStorage.setItem('ctg_auth_redirect', redirectTo);
    }
  }, [redirectTo]);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [recaptchaValue, setRecaptchaValue] = useState(null);
  const recaptchaRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      companyType: '',
      companyName: '',
      companyCategory: '',
      country: '',
      password: '',
      confirmPassword: '',
      acceptPolicies: false,
    },
  });

  const handleNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid = await trigger(fields);
    if (valid) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const onSubmit = async (data) => {
    if (!recaptchaValue) {
      toast.error('Please complete the reCAPTCHA verification');
      return;
    }

    try {
      const displayName = `${data.firstName} ${data.lastName}`.trim();
      const role = COMPANY_TYPE_TO_ROLE[data.companyType] || 'member';

      const registerData = {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        displayName,
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        position: data.position,
        companyCategory: data.companyCategory,
        companyType: data.companyType,
        country: data.country,
        role,
        companyLogoFile: logoFile,
        recaptchaToken: recaptchaValue,
      };

      await registerUser(registerData);
      trackSignUp('email');

      if (role !== 'member') {
        try {
          const setRoleClaim = httpsCallable(getFunctionsInstance(), 'setRoleClaimOnRegistration');
          await setRoleClaim({ role });
          if (auth.currentUser) {
            await auth.currentUser.getIdToken(true);
          }
        } catch (claimErr) {
          console.error('setRoleClaimOnRegistration failed (non-critical):', claimErr);
        }
      }

      toast.success(
        'Account created! Please check your email to verify your account.',
        { duration: 6000 }
      );
      // TODO: Re-enable redirect to /verify-email when verification flow is finalized
      // router.push('/verify-email');
      router.push('/');
    } catch (err) {
      console.error('Registration failed:', err);
      toast.error(err.message || 'Registration failed. Please try again.');
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaValue(null);
      }
    }
  };

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="register-card w-full p-6 space-y-5">

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s === step
                    ? 'bg-[#FFD700] text-[#0F1B2B]'
                    : s < step
                    ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40'
                    : 'bg-[rgba(255,255,255,0.05)] text-[#A0A0A0] border border-[rgba(255,255,255,0.1)]'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-0.5 ${s < step ? 'bg-[#FFD700]/40' : 'bg-[rgba(255,255,255,0.1)]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-[24px] font-bold text-white mb-1">{STEP_TITLES[step]}</h1>
          <p className="text-sm text-[#A0A0A0]">
            {step === 1 && 'Join an end-to-end trade ecosystem designed to grow your business.'}
            {step === 2 && 'Tell us about yourself.'}
            {step === 3 && 'Tell us about your company and set your password.'}
          </p>
        </div>

        {/* Step Content */}
        <RegisterFormFields
          step={step}
          register={register}
          errors={errors}
          loading={loading}
          setValue={setValue}
          watch={watch}
          categories={categories}
          categoriesLoading={categoriesLoading}
        />

        {/* Step Actions */}
        <div className="flex flex-col items-center gap-4 pt-2">
          {/* reCAPTCHA — only on step 3 */}
          {step === 3 && (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              onChange={(value) => setRecaptchaValue(value)}
              onExpired={() => setRecaptchaValue(null)}
              theme="dark"
            />
          )}

          <div className="flex items-center gap-3 w-full">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3 border border-[rgba(255,255,255,0.15)] text-white font-medium rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-all"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200"
              >
                {step === 1 ? 'Get Started Free' : 'Continue'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !recaptchaValue}
                className="flex-1 py-3 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>

          {step === 1 && (
            <div className="w-full">
              <SocialAuthButtons redirectTo={redirectTo} label="or sign up with" />
            </div>
          )}

          <div className="text-sm">
            <span className="text-[#A0A0A0]">Already have an account? </span>
            <Link href="/login" className="font-semibold text-[#FFD700] hover:text-white hover:underline transition-colors">
              Login
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

export default RegisterForm;

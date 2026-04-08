/**
 * RegisterForm Component
 *
 * Registration form orchestrator. Owns form state (react-hook-form + zodResolver),
 * reCAPTCHA, logo upload, and submit flow. Delegates field rendering to RegisterFormFields.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ReCAPTCHA from 'react-google-recaptcha';
import Link from 'next/link';

import { registerSchema } from '@/core/validation/registerSchema';
import { useRegister } from '@/presentation/hooks/auth/useRegister';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useTrackEvent } from '@/presentation/hooks/analytics';
import { RegisterFormFields } from './RegisterFormFields';

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

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { register: registerUser, loading } = useRegister();
  const { categories, loading: categoriesLoading } = useCategories();
  const { trackSignUp, track } = useTrackEvent();

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
      companyName: '',
      companyCategory: '',
      country: '',
      password: '',
      confirmPassword: '',
      acceptPolicies: false,
    },
  });

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    if (!recaptchaValue) {
      toast.error('Please complete the reCAPTCHA verification');
      return;
    }

    try {
      const displayName = `${data.firstName} ${data.lastName}`.trim();
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
        country: data.country,
        companyLogoFile: logoFile,
        recaptchaToken: recaptchaValue,
      };

      await registerUser(registerData);
      trackSignUp('email');
      toast.success(
        'Account created! Please check your email to verify your account.',
        { duration: 6000 }
      );
      router.push('/verify-email');
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
    <div className="w-full max-w-[1000px] mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="register-card w-full p-6 space-y-5">

        <div className="text-center mb-6">
          <h1 className="text-[28px] font-bold text-white mb-2">Create Account</h1>
          <p className="text-sm text-[#A0A0A0]">Join the world's leading premium B2B marketplace.</p>
        </div>

        <RegisterFormFields
          register={register}
          errors={errors}
          loading={loading}
          setValue={setValue}
          watch={watch}
          categories={categories}
          categoriesLoading={categoriesLoading}
        />

        {/* Terms & Conditions */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              {...register('acceptPolicies')}
              disabled={loading}
              className="w-5 h-5 mt-0.5 text-[#FFD700] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] rounded focus:ring-2 focus:ring-[#FFD700] cursor-pointer flex-shrink-0"
            />
            <span className={`text-sm ${errors.acceptPolicies ? 'text-red-400' : 'text-[#A0A0A0]'}`}>
              I accept the{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
                Terms of Service
              </a>
              ,{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </a>
              , and{' '}
              <a href="/product-listing-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
                Product Listing Policy
              </a>
              {' '}<span className="text-red-400">*</span>
            </span>
          </label>
          {errors.acceptPolicies && (
            <p className="text-xs text-red-400 ml-8">{errors.acceptPolicies.message}</p>
          )}
        </div>

        {/* reCAPTCHA, Submit & Login Link */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
            onChange={(value) => setRecaptchaValue(value)}
            onExpired={() => setRecaptchaValue(null)}
            theme="dark"
          />

          <button
            type="submit"
            disabled={loading || !recaptchaValue}
            className="w-full max-w-[300px] py-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

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

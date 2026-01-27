/**
 * RegisterForm Component
 *
 * Complete registration form with validation, file upload, and reCAPTCHA
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { COUNTRIES } from '@/core/constants/countries';
import { COMPANY_CATEGORIES } from '@/core/constants/categories';

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const { register: registerUser, loading } = useRegister();

  // Store redirect URL in localStorage for after email verification
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
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: '',
      companyName: '',
      companyCategory: '',
      companyWebsite: '',
      linkedinProfile: '',
      country: '',
      password: '',
      confirmPassword: '',
      acceptPolicies: false,
    },
  });

  const country = watch('country');
  const companyCategory = watch('companyCategory');

  // Handle logo file upload
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
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const onSubmit = async (data) => {
    // Verify reCAPTCHA
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
        companyWebsite: data.companyWebsite,
        linkedinProfile: data.linkedinProfile,
        country: data.country,
        companyLogoFile: logoFile,
        recaptchaToken: recaptchaValue,
      };

      await registerUser(registerData);

      toast.success(
        'Account created! Please check your email to verify your account.',
        { duration: 6000 }
      );

      router.push('/verify-email');
    } catch (err) {
      console.error('Registration failed:', err);
      toast.error(err.message || 'Registration failed. Please try again.');

      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaValue(null);
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-5 relative bg-radial-auth">

      <form onSubmit={handleSubmit(onSubmit)}
        className="register-card w-full max-w-[800px] p-10 relative z-10 space-y-8">

        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold text-white mb-2">Create Account</h1>
          <p className="text-sm text-[#A0A0A0]">Join the world's leading premium B2B marketplace.</p>
        </div>

        {/* Personal Information */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-[rgba(255,255,255,0.1)] pb-2">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                {...register('firstName')}
                className="form-input-anasyf"
                placeholder="John"
                disabled={loading}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                {...register('lastName')}
                className="form-input-anasyf"
                placeholder="Doe"
                disabled={loading}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="form-input-anasyf"
                placeholder="john@company.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="form-input-anasyf"
                placeholder="+1 234 567 8900"
                disabled={loading}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="position" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Position/Title <span className="text-red-500">*</span>
              </label>
              <input
                id="position"
                type="text"
                {...register('position')}
                className="form-input-anasyf"
                placeholder="Sales Manager"
                disabled={loading}
              />
              {errors.position && (
                <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="linkedinProfile" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                LinkedIn Profile (Optional)
              </label>
              <input
                id="linkedinProfile"
                type="url"
                {...register('linkedinProfile')}
                className="form-input-anasyf"
                placeholder="https://linkedin.com/in/yourprofile"
                disabled={loading}
              />
              {errors.linkedinProfile && (
                <p className="mt-1 text-sm text-red-600">{errors.linkedinProfile.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="pt-6 border-t border-slate-200/10">
          <h3 className="text-lg font-semibold text-white mb-4">
            Company Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="companyName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                {...register('companyName')}
                className="form-input-anasyf"
                placeholder="Acme Corporation"
                disabled={loading}
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="companyCategory" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Company Category <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={COMPANY_CATEGORIES}
                value={companyCategory}
                onChange={(value) => setValue('companyCategory', value, { shouldValidate: true })}
                placeholder="Select category"
                disabled={loading}
                error={!!errors.companyCategory}
              />
              {errors.companyCategory && (
                <p className="mt-1 text-sm text-red-600">{errors.companyCategory.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="country" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={COUNTRIES}
                value={country}
                onChange={(value) => setValue('country', value, { shouldValidate: true })}
                placeholder="Select country"
                disabled={loading}
                error={!!errors.country}
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="companyWebsite" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Company Website (Optional)
              </label>
              <input
                id="companyWebsite"
                type="url"
                {...register('companyWebsite')}
                className="form-input-anasyf"
                placeholder="https://www.company.com"
                disabled={loading}
              />
              {errors.companyWebsite && (
                <p className="mt-1 text-sm text-red-600">{errors.companyWebsite.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="pt-6 border-t border-slate-200/10">
          <h3 className="text-lg font-semibold text-white mb-4">
            Security
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="form-input-anasyf"
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className="form-input-anasyf"
                placeholder="••••••••"
                disabled={loading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="pt-6 border-t border-slate-200/10">
          <h3 className="text-lg font-semibold text-white mb-4">
            Terms & Conditions
          </h3>

          <p className="text-sm text-[#A0A0A0] mb-4">
            Please read and accept our policies before creating your account:
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                {...register('acceptPolicies')}
                disabled={loading}
                className="w-5 h-5 mt-0.5 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              <span className={`text-sm ${errors.acceptPolicies ? 'text-red-600' : 'text-[#A0A0A0]'}`}>
                I accept the{' '}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#D4AF37] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </a>
                ,{' '}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#D4AF37] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </a>
                , and{' '}
                <a
                  href="/product-listing-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#D4AF37] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Product Listing Policy
                </a>
                {' '}<span className="text-red-500">*</span>
              </span>
            </label>
            {errors.acceptPolicies && (
              <p className="text-sm text-red-600 ml-8">{errors.acceptPolicies.message}</p>
            )}
          </div>
        </div>

        {/* reCAPTCHA */}
        <div className="flex justify-center">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
            onChange={(value) => setRecaptchaValue(value)}
            onExpired={() => setRecaptchaValue(null)}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !recaptchaValue}
          className="w-full p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold text-base rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        {/* Login Link */}
        <div className="text-center text-sm">
          <span className="text-[#A0A0A0]">Already have an account? </span>
          <Link href="/login" className="font-semibold text-[#D4AF37] hover:text-white hover:underline transition-colors">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}

export default RegisterForm;

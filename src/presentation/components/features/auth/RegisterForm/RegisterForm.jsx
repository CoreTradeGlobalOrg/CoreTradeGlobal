/**
 * RegisterForm Component
 *
 * Complete registration form with validation, file upload, and reCAPTCHA
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import ReCAPTCHA from 'react-google-recaptcha';

import { registerSchema } from '@/core/validation/registerSchema';
import { useRegister } from '@/presentation/hooks/auth/useRegister';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { COUNTRIES } from '@/core/constants/countries';
import { COMPANY_CATEGORIES } from '@/core/constants/categories';

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, loading } = useRegister();
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

    console.log('📸 [RegisterForm] onSubmit called');
    console.log('📸 [RegisterForm] logoFile state:', logoFile);
    console.log('📸 [RegisterForm] logoFile details:', {
      hasFile: !!logoFile,
      name: logoFile?.name,
      type: logoFile?.type,
      size: logoFile?.size,
    });

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

      console.log('📸 [RegisterForm] registerData prepared:', {
        ...registerData,
        companyLogoFile: registerData.companyLogoFile ? 'FILE_PRESENT' : 'NO_FILE',
      });

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
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-lg rounded-lg p-8 space-y-8">
      {/* Personal Information */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="firstName"
              type="text"
              {...register('firstName')}
              error={!!errors.firstName}
              disabled={loading}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="lastName"
              type="text"
              {...register('lastName')}
              error={!!errors.lastName}
              disabled={loading}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              error={!!errors.email}
              disabled={loading}
              placeholder="john@company.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
              Phone <span className="text-red-500">*</span>
            </label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              error={!!errors.phone}
              disabled={loading}
              placeholder="+1 234 567 8900"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="position" className="block text-sm font-medium text-slate-700 mb-2">
              Position/Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="position"
              type="text"
              {...register('position')}
              error={!!errors.position}
              disabled={loading}
              placeholder="Sales Manager"
            />
            {errors.position && (
              <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="linkedinProfile" className="block text-sm font-medium text-slate-700 mb-2">
              LinkedIn Profile (Optional)
            </label>
            <Input
              id="linkedinProfile"
              type="url"
              {...register('linkedinProfile')}
              error={!!errors.linkedinProfile}
              disabled={loading}
              placeholder="https://linkedin.com/in/yourprofile"
            />
            {errors.linkedinProfile && (
              <p className="mt-1 text-sm text-red-600">{errors.linkedinProfile.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="companyName"
              type="text"
              {...register('companyName')}
              error={!!errors.companyName}
              disabled={loading}
              placeholder="Acme Corporation"
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyCategory" className="block text-sm font-medium text-slate-700 mb-2">
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
            <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-2">
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
            <label htmlFor="companyWebsite" className="block text-sm font-medium text-slate-700 mb-2">
              Company Website (Optional)
            </label>
            <Input
              id="companyWebsite"
              type="url"
              {...register('companyWebsite')}
              error={!!errors.companyWebsite}
              disabled={loading}
              placeholder="https://www.company.com"
            />
            {errors.companyWebsite && (
              <p className="mt-1 text-sm text-red-600">{errors.companyWebsite.message}</p>
            )}
          </div>

          {/* Company Logo Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Logo (Optional)
            </label>

            {!logoPreview ? (
              <div className="mt-2">
                <label
                  htmlFor="companyLogo"
                  className="flex items-center justify-center w-full h-32 px-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-slate-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                  <input
                    id="companyLogo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={loading}
                    className="sr-only"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-2 relative">
                <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg">
                  <img
                    src={logoPreview}
                    alt="Company logo preview"
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{logoFile?.name}</p>
                    <p className="text-xs text-slate-500">
                      {(logoFile?.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Security
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              disabled={loading}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              disabled={loading}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="pt-6 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Terms & Conditions
        </h3>

        <p className="text-sm text-slate-600 mb-4">
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
            <span className={`text-sm ${errors.acceptPolicies ? 'text-red-600' : 'text-slate-700'}`}>
              I accept the{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>
              ,{' '}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
              , and{' '}
              <a
                href="/product-listing-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
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
          sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
          onChange={(value) => setRecaptchaValue(value)}
          onExpired={() => setRecaptchaValue(null)}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading || !recaptchaValue}
        className="w-full"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>

      {/* Login Link */}
      <div className="text-center text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Login
        </a>
      </div>
    </form>
  );
}

export default RegisterForm;

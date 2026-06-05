/**
 * RegisterFormFields Component
 *
 * 3-step registration form matching the landing page design.
 * Step 1: Email + Privacy consent
 * Step 2: Personal Information
 * Step 3: Company Information + Password
 *
 * Props: step, register, errors, loading, setValue, watch, categories, categoriesLoading
 */

'use client';

import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { COUNTRIES, COUNTRY_PHONE_CODES, PHONE_CODE_OPTIONS } from '@/core/constants/countries';
import { COMPANY_TYPES } from '@/core/constants/companyTypes';
import { Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export function RegisterFormFields({ step, register, errors, loading, setValue, watch, categories, categoriesLoading }) {
  const country = watch('country');
  const companyCategory = watch('companyCategory');
  const companyType = watch('companyType');
  const email = watch('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localPhone, setLocalPhone] = useState('');
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState('');

  // Pre-fill phone country from company country on first selection only
  useEffect(() => {
    if (country && !selectedPhoneCountry) {
      setSelectedPhoneCountry(country);
    }
  }, [country, selectedPhoneCountry]);

  const selectedPhoneOption = PHONE_CODE_OPTIONS.find((opt) => opt.value === selectedPhoneCountry);

  // Re-compute form phone value when phone country code changes
  useEffect(() => {
    if (!localPhone || localPhone.startsWith('+')) return;
    const dialCode = COUNTRY_PHONE_CODES[selectedPhoneCountry] || '';
    if (dialCode) {
      setValue('phone', `${dialCode}${localPhone}`, { shouldValidate: false });
    }
  }, [selectedPhoneCountry, localPhone, setValue]);

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    setLocalPhone(raw);

    if (!raw) {
      setValue('phone', '', { shouldValidate: false });
      return;
    }

    const dialCode = COUNTRY_PHONE_CODES[selectedPhoneCountry] || '';

    if (raw.startsWith('+')) {
      setValue('phone', raw, { shouldValidate: false });
    } else if (dialCode) {
      setValue('phone', `${dialCode}${raw}`, { shouldValidate: false });
    } else {
      setValue('phone', raw, { shouldValidate: false });
    }
  };

  // ─── STEP 1: Email + Consent ───
  if (step === 1) {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Business Email <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="form-input-anasyf text-sm"
            placeholder="john@company.com"
            disabled={loading}
            autoFocus
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            {...register('acceptPolicies')}
            disabled={loading}
            className="w-5 h-5 mt-0.5 text-[#FFD700] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] rounded focus:ring-2 focus:ring-[#FFD700] cursor-pointer flex-shrink-0"
          />
          <span className={`text-sm ${errors.acceptPolicies ? 'text-red-400' : 'text-[#A0A0A0]'}`}>
            I agree to the{' '}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
              Privacy Policy
            </a>
            {' '}and{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
              Terms of Service
            </a>
            , and consent to receiving trade communications. <span className="text-red-400">*</span>
          </span>
        </label>
        {errors.acceptPolicies && (
          <p className="text-xs text-red-400 ml-8">{errors.acceptPolicies.message}</p>
        )}
      </div>
    );
  }

  // ─── STEP 2: Personal Information ───
  if (step === 2) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className="form-input-anasyf text-sm"
              placeholder="John"
              disabled={loading}
              autoFocus
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              {...register('lastName')}
              className="form-input-anasyf text-sm"
              placeholder="Doe"
              disabled={loading}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="emailDisplay" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            id="emailDisplay"
            type="email"
            value={email || ''}
            disabled
            className="form-input-anasyf text-sm opacity-65 cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Phone <span className="text-red-400">*</span>
          </label>
          <div className="flex">
            <div className="relative flex-shrink-0" style={{ width: '130px' }}>
              <SearchableSelect
                options={PHONE_CODE_OPTIONS}
                value={selectedPhoneCountry}
                onChange={(val) => setSelectedPhoneCountry(val)}
                placeholder="Code"
                disabled={loading}
                className="dark-select phone-code-select [&_button]:!py-[14px] [&_button]:!rounded-r-none [&_button]:!border-r-0"
                searchPlaceholder="Search country..."
                dropdownClassName="!min-w-[280px]"
                renderSelectedLabel={(opt) => `${opt.label.split(' ')[0]} ${opt.dialCode}`}
              />
            </div>
            <input
              id="phone"
              type="tel"
              value={localPhone}
              onChange={handlePhoneChange}
              className="form-input-anasyf text-sm flex-1 rounded-l-none border-l-0"
              placeholder={selectedPhoneOption ? '555 123 4567' : '+1 234 567 8900'}
              disabled={loading}
            />
          </div>
          {errors.phone && (
            <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="position" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Position/Title <span className="text-red-400">*</span>
          </label>
          <input
            id="position"
            type="text"
            {...register('position')}
            className="form-input-anasyf text-sm"
            placeholder="Sales Manager"
            disabled={loading}
          />
          {errors.position && (
            <p className="mt-1 text-xs text-red-400">{errors.position.message}</p>
          )}
        </div>
      </div>
    );
  }

  // ─── STEP 3: Company Information + Password ───
  if (step === 3) {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="companyType" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Company Type <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={COMPANY_TYPES}
            value={companyType}
            onChange={(value) => setValue('companyType', value, { shouldValidate: true })}
            placeholder="Select company type"
            disabled={loading}
            error={!!errors.companyType}
            className="dark-select"
          />
          {errors.companyType && (
            <p className="mt-1 text-xs text-red-400">{errors.companyType.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            {...register('companyName')}
            className="form-input-anasyf text-sm"
            placeholder="Acme Corporation"
            disabled={loading}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-red-400">{errors.companyName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="companyCategory" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Company Category <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={categories}
            value={companyCategory}
            onChange={(value) => setValue('companyCategory', value, { shouldValidate: true })}
            placeholder={categoriesLoading ? "Loading categories..." : "Select category"}
            disabled={loading || categoriesLoading}
            error={!!errors.companyCategory}
            className="dark-select"
          />
          {errors.companyCategory && (
            <p className="mt-1 text-xs text-red-400">{errors.companyCategory.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="country" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Country <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={COUNTRIES}
            value={country}
            onChange={(value) => setValue('country', value, { shouldValidate: true })}
            placeholder="Select country"
            disabled={loading}
            error={!!errors.country}
            className="dark-select"
            showFlags={true}
          />
          {errors.country && (
            <p className="mt-1 text-xs text-red-400">{errors.country.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="form-input-anasyf text-sm pr-12"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className="form-input-anasyf text-sm pr-12"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default RegisterFormFields;

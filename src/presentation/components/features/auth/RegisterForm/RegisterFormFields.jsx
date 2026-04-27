/**
 * RegisterFormFields Component
 *
 * Renders the Personal Information, Company Information, and Security
 * sections of the registration form. Controlled by the parent RegisterForm.
 *
 * Props: register, errors, loading, setValue, watch, categories, categoriesLoading
 */

'use client';

import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { COUNTRIES } from '@/core/constants/countries';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

/**
 * @param {Object} props
 * @param {Function} props.register - react-hook-form register
 * @param {Object} props.errors - react-hook-form errors
 * @param {boolean} props.loading
 * @param {Function} props.setValue - react-hook-form setValue
 * @param {Function} props.watch - react-hook-form watch
 * @param {Array} props.categories
 * @param {boolean} props.categoriesLoading
 */
export function RegisterFormFields({ register, errors, loading, setValue, watch, categories, categoriesLoading }) {
  const country = watch('country');
  const companyCategory = watch('companyCategory');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
      {/* Two Column Layout: Personal & Company Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-5 border border-[rgba(255,255,255,0.05)]">
          <h3 className="text-base font-semibold text-white mb-4 pb-2 border-b border-[rgba(255,255,255,0.1)]">
            Personal Information
          </h3>
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
              <label htmlFor="email" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="form-input-anasyf text-sm"
                placeholder="john@company.com"
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="form-input-anasyf text-sm"
                placeholder="+1 234 567 8900"
                disabled={loading}
              />
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
        </div>

        {/* Company Information */}
        <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-5 border border-[rgba(255,255,255,0.05)]">
          <h3 className="text-base font-semibold text-white mb-4 pb-2 border-b border-[rgba(255,255,255,0.1)]">
            Company Information
          </h3>
          <div className="space-y-4">
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
          </div>
        </div>
      </div>

      {/* Security - Full Width */}
      <div className="bg-[rgba(255,255,255,0.02)] rounded-xl p-5 border border-[rgba(255,255,255,0.05)]">
        <h3 className="text-base font-semibold text-white mb-4 pb-2 border-b border-[rgba(255,255,255,0.1)]">
          Security
        </h3>
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
    </>
  );
}

export default RegisterFormFields;

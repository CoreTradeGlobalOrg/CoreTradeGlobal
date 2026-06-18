/**
 * CompleteProfileForm
 *
 * Shown to OAuth users (Google/LinkedIn) after first sign-in to collect the
 * business details the provider does not supply. Name/email are prefilled.
 * On submit it creates the full Firestore user profile (role derived from
 * companyType) and marks profileComplete: true.
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';

import { completeProfileSchema } from '@/core/validation/completeProfileSchema';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { COUNTRIES, COUNTRY_PHONE_CODES, PHONE_CODE_OPTIONS } from '@/core/constants/countries';
import { COMPANY_TYPES, COMPANY_TYPE_TO_ROLE } from '@/core/constants/companyTypes';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { container } from '@/core/di/container';
import { auth, getFunctionsInstance } from '@/core/config/firebase.config';

export function CompleteProfileForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();

  const [loading, setLoading] = useState(false);
  const [localPhone, setLocalPhone] = useState('');
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState('');

  // Prefill first/last name by splitting the provider display name.
  const nameParts = (user?.displayName || '').trim().split(/\s+/).filter(Boolean);
  const prefillFirst = nameParts[0] || '';
  const prefillLast = nameParts.slice(1).join(' ') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      firstName: prefillFirst,
      lastName: prefillLast,
      phone: '',
      position: '',
      companyType: '',
      companyName: '',
      companyCategory: '',
      country: '',
      acceptPolicies: false,
    },
  });

  const companyType = watch('companyType');
  const companyCategory = watch('companyCategory');
  const country = watch('country');

  const selectedPhoneOption = PHONE_CODE_OPTIONS.find((opt) => opt.value === selectedPhoneCountry);
  const phoneCodeMissing =
    localPhone.trim().length > 0 &&
    !selectedPhoneCountry &&
    !localPhone.trim().startsWith('+');

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

  const onSubmit = async (data) => {
    if (!user?.uid) {
      toast.error('Your session expired. Please sign in again.');
      return;
    }
    setLoading(true);
    try {
      const displayName = `${data.firstName} ${data.lastName}`.trim();
      const role = COMPANY_TYPE_TO_ROLE[data.companyType] || 'member';

      const authRepo = container.getAuthRepository();
      await authRepo.createUserProfile(user.uid, {
        email: user.email,
        displayName,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        position: data.position,
        companyName: data.companyName,
        companyCategory: data.companyCategory,
        country: data.country,
        role,
        companyLogo: user.photoURL || null,
        authProvider: user.authProvider || 'google',
        emailVerified: true, // OAuth provider email is already verified
        adminApproved: false,
        isSuspended: false,
        profileComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Providers/insurance need a role custom claim (members use the default).
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

      await refreshUser();
      toast.success('Profile completed! Welcome to CoreTradeGlobal.', { duration: 5000 });
      router.push('/');
    } catch (err) {
      console.error('CompleteProfileForm submit failed:', err);
      toast.error(err?.message || 'Failed to complete your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="register-card w-full p-6 space-y-5">
        {/* Title */}
        <div className="text-center mb-2">
          <h1 className="text-[24px] font-bold text-white mb-1">Complete your profile</h1>
          <p className="text-sm text-[#A0A0A0]">
            Just a few details so we can set up your account.
          </p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="form-input-anasyf text-sm opacity-65 cursor-not-allowed"
          />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
              First Name <span className="text-red-400">*</span>
            </label>
            <input id="firstName" type="text" {...register('firstName')} className="form-input-anasyf text-sm" placeholder="John" disabled={loading} />
            {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName.message}</p>}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
              Last Name <span className="text-red-400">*</span>
            </label>
            <input id="lastName" type="text" {...register('lastName')} className="form-input-anasyf text-sm" placeholder="Doe" disabled={loading} />
            {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* Phone */}
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
                error={phoneCodeMissing}
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
          {phoneCodeMissing ? (
            <p className="mt-1 text-xs text-red-400">Please select a country code for your phone number.</p>
          ) : errors.phone ? (
            <p className="mt-1 text-xs text-red-400">{errors.phone.message}</p>
          ) : null}
        </div>

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Position/Title <span className="text-red-400">*</span>
          </label>
          <input id="position" type="text" {...register('position')} className="form-input-anasyf text-sm" placeholder="Sales Manager" disabled={loading} />
          {errors.position && <p className="mt-1 text-xs text-red-400">{errors.position.message}</p>}
        </div>

        {/* Company Type */}
        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
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
          {errors.companyType && <p className="mt-1 text-xs text-red-400">{errors.companyType.message}</p>}
        </div>

        {/* Company Name */}
        <div>
          <label htmlFor="companyName" className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Company Name <span className="text-red-400">*</span>
          </label>
          <input id="companyName" type="text" {...register('companyName')} className="form-input-anasyf text-sm" placeholder="Acme Corporation" disabled={loading} />
          {errors.companyName && <p className="mt-1 text-xs text-red-400">{errors.companyName.message}</p>}
        </div>

        {/* Company Category */}
        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
            Company Category <span className="text-red-400">*</span>
          </label>
          <SearchableSelect
            options={categories}
            value={companyCategory}
            onChange={(value) => setValue('companyCategory', value, { shouldValidate: true })}
            placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'}
            disabled={loading || categoriesLoading}
            error={!!errors.companyCategory}
            className="dark-select"
          />
          {errors.companyCategory && <p className="mt-1 text-xs text-red-400">{errors.companyCategory.message}</p>}
        </div>

        {/* Country */}
        <div>
          <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-1.5">
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
          {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country.message}</p>}
        </div>

        {/* Accept policies */}
        <div>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              {...register('acceptPolicies')}
              disabled={loading}
              className="w-5 h-5 mt-0.5 text-[#FFD700] bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] rounded focus:ring-2 focus:ring-[#FFD700] cursor-pointer flex-shrink-0"
            />
            <span className={`text-sm text-left ${errors.acceptPolicies ? 'text-red-400' : 'text-[#A0A0A0]'}`}>
              I agree to the{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD700] hover:underline" onClick={(e) => e.stopPropagation()}>
                Terms of Service
              </a>
              , and consent to receiving trade communications. <span className="text-red-400">*</span>
            </span>
          </label>
          {errors.acceptPolicies && <p className="mt-1 text-xs text-red-400 ml-8">{errors.acceptPolicies.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Complete Profile'}
        </button>
      </form>
    </div>
  );
}

export default CompleteProfileForm;

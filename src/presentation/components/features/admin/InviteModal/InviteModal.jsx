/**
 * InviteModal Component
 *
 * Modal for admins to invite logistics providers, insurance providers, or lawyers.
 * Uses react-hook-form + zod for validation.
 * Calls the inviteUser Cloud Function via useInviteUser hook.
 */

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { useInviteUser } from '@/presentation/hooks/admin/useInviteUser';
import { VALID_INVITE_ROLES, ROLE_DISPLAY_NAMES } from '@/core/constants/roles';

const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  role: z.enum(VALID_INVITE_ROLES, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  company: z.string().min(2, 'Company name must be at least 2 characters'),
});

export function InviteModal({ isOpen, onClose, onSuccess }) {
  const { inviteUser, loading } = useInviteUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
      role: '',
      name: '',
      company: '',
    },
  });

  // Portal to document.body — the ancestor UsersTable wrapper uses
  // backdrop-blur which traps fixed positioning inside it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!isOpen || !mounted) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      await inviteUser(data);
      reset();
      onClose();
      if (onSuccess) onSuccess();
    } catch {
      // Error already shown via toast in hook
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-[#1a283b] to-[#0f1b2b] border border-white/10 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Invite User</h2>
              <p className="text-xs text-gray-400">Send an invite link to a provider or lawyer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="user@company.com"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#0F1B2B] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors disabled:opacity-50 text-sm"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              {...register('role')}
              disabled={loading}
              className="w-full px-4 py-3 bg-[#0F1B2B] border border-white/10 rounded-xl text-white focus:border-[#FFD700] focus:outline-none transition-colors disabled:opacity-50 text-sm cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23FFD700' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '3rem',
              }}
            >
              <option value="" className="bg-[#0F1B2B] text-gray-400">Select a role...</option>
              {VALID_INVITE_ROLES.map((role) => (
                <option key={role} value={role} className="bg-[#0F1B2B] text-white">
                  {ROLE_DISPLAY_NAMES[role]}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-400">{errors.role.message}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              placeholder="John Smith"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#0F1B2B] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors disabled:opacity-50 text-sm"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              {...register('company')}
              placeholder="Acme Logistics Ltd."
              disabled={loading}
              className="w-full px-4 py-3 bg-[#0F1B2B] border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:border-[#FFD700] focus:outline-none transition-colors disabled:opacity-50 text-sm"
            />
            {errors.company && (
              <p className="mt-1 text-xs text-red-400">{errors.company.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-xl shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(255,215,0,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Invite
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default InviteModal;

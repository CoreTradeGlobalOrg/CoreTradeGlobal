'use client';

import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { auth } from '@/core/config/firebase.config';
import { ROLES, ROLE_DISPLAY_NAMES, ROLE_BADGE_COLORS } from '@/core/constants/roles';

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

/**
 * DetailsStep (Step 2) - Confirm profile details fetched from Firestore.
 */
export function DetailsStep({ userProfile, step2Loading, onContinue }) {
  return (
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
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 transition-all"
      >
        Looks Good, Continue
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

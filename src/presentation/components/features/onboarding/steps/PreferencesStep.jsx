'use client';

import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

/**
 * PreferencesStep (Step 4) - Email notification preferences and final completion.
 */
export function PreferencesStep({ emailNotifications, setEmailNotifications, marketingEmails, setMarketingEmails, completing, onComplete, onBack }) {
  return (
    <div className="login-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Preferences</h2>
          <p className="text-xs text-gray-400">Customize your experience</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 bg-[#0F1B2B]/60 rounded-xl border border-white/10">
          <div>
            <p className="text-white font-medium text-sm">Email Notifications</p>
            <p className="text-xs text-gray-400 mt-0.5">Receive updates about trade deals and messages</p>
          </div>
          <button
            type="button"
            onClick={() => setEmailNotifications((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-[#FFD700]' : 'bg-white/20'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-[#0F1B2B]/60 rounded-xl border border-white/10">
          <div>
            <p className="text-white font-medium text-sm">Platform Announcements</p>
            <p className="text-xs text-gray-400 mt-0.5">News about new features and platform updates</p>
          </div>
          <button
            type="button"
            onClick={() => setMarketingEmails((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${marketingEmails ? 'bg-[#FFD700]' : 'bg-white/20'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${marketingEmails ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={onComplete} disabled={completing} className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {completing ? <><Loader2 className="w-5 h-5 animate-spin" /> Completing Setup...</> : <>Complete Setup <CheckCircle className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
}

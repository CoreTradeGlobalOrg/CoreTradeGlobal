'use client';

import { ArrowLeft, ArrowRight, Loader2, Upload, User } from 'lucide-react';

/**
 * PhotoStep (Step 3) - Optional profile photo upload.
 */
export function PhotoStep({ photoPreview, photoUploading, onPhotoSelect, onPhotoUpload, onSkip, onBack, photoFile }) {
  return (
    <div className="login-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
          <Upload className="w-5 h-5 text-[#FFD700]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Profile Photo</h2>
          <p className="text-xs text-gray-400">Optional — helps others recognize you</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mb-6">
        {photoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Profile preview" className="w-28 h-28 rounded-full object-cover border-2 border-[#FFD700]/40" />
            <button
              type="button"
              onClick={() => onPhotoSelect({ target: { files: [] } })}
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-28 h-28 rounded-full bg-[#0F1B2B] border-2 border-dashed border-white/20 flex items-center justify-center">
            <User className="w-12 h-12 text-gray-600" />
          </div>
        )}

        <label className="cursor-pointer">
          <span className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium rounded-xl transition-all">
            <Upload className="w-4 h-4" />
            {photoPreview ? 'Change Photo' : 'Choose Photo'}
          </span>
          <input type="file" accept="image/*" onChange={onPhotoSelect} className="hidden" />
        </label>

        <p className="text-xs text-gray-500 text-center">Supported: JPG, PNG, GIF (max 5MB)</p>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button type="button" onClick={onSkip} disabled={photoUploading} className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 font-medium rounded-xl transition-all disabled:opacity-50">
          Skip for now
        </button>
        <button type="button" onClick={onPhotoUpload} disabled={!photoFile || photoUploading} className="flex-1 flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold rounded-full shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
          {photoUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <>Upload & Continue <ArrowRight className="w-4 h-4 flex-shrink-0" /></>}
        </button>
      </div>
    </div>
  );
}

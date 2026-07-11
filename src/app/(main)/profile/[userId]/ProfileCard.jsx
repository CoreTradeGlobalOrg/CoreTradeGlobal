'use client';

import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/presentation/components/common/RoleBadge/RoleBadge';
import { COUNTRIES } from '@/core/constants/countries';

function getCountryLabel(countryCode) {
  if (!countryCode) return 'Not set';
  const country = COUNTRIES.find((c) => c.value === countryCode);
  return country ? country.label : countryCode;
}

function formatCategory(name) {
  if (!name) return 'Not set';
  return name.toUpperCase();
}

/**
 * ProfileCard - The main profile info card with logo, bio, and editable fields.
 * Covers: logo, name, bio, and the 2x2 detail grid.
 */
export function ProfileCard({
  profileUser,
  categoryName,
  canEdit,
  isEditing,
  isOwnProfile,
  // Form state
  phone,
  setPhone,
  about,
  setAbout,
  linkedinProfile,
  setLinkedinProfile,
  companyWebsite,
  setCompanyWebsite,
  // Logo state
  logoLoading,
  logoPreview,
  profileUpdating,
  // Handlers
  onEditToggle,
  onLogoChange,
  onRemoveLogo,
  onProfileUpdate,
  onCancelEdit,
  highlightFields = new Set(),
}) {
  const hl = (field) =>
    highlightFields.has(field) ? ' animate-highlight-incomplete border-2' : '';
  return (
    <div className="glass-card p-6">
      <form onSubmit={onProfileUpdate}>
        {/* Header Row: Logo + Name + Edit Button */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
          {/* Logo Section */}
          <div className={`flex-shrink-0 rounded-2xl${hl('companyLogo')}`}>
            {logoLoading ? (
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#FFD700] bg-[rgba(255,215,0,0.1)] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (isEditing ? logoPreview : profileUser?.companyLogo) ? (
              <div className="relative">
                <img
                  src={isEditing ? logoPreview : profileUser?.companyLogo}
                  alt="Company logo"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover rounded-2xl border-2 border-[rgba(255,215,0,0.3)]"
                />
                {canEdit && isEditing && (
                  <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-2">
                    <label className="cursor-pointer bg-[#FFD700] text-[#0F1B2B] text-xs px-2 py-1 rounded font-medium hover:bg-white transition-colors">
                      Change
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onLogoChange}
                        className="sr-only"
                        disabled={profileUpdating}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={onRemoveLogo}
                      disabled={profileUpdating}
                      className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium hover:bg-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
                  <span className="text-4xl">🏭</span>
                </div>
                {canEdit && isEditing && (
                  <label className="absolute -bottom-2 left-0 right-0 flex justify-center cursor-pointer">
                    <span className="bg-[#FFD700] text-[#0F1B2B] text-xs px-3 py-1 rounded font-medium hover:bg-white transition-colors">
                      Upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onLogoChange}
                      className="sr-only"
                      disabled={profileUpdating}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Name & Bio Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {profileUser?.displayName || 'User'}
                </h2>
                <p className="text-[#FFD700] font-medium">
                  {profileUser?.companyName || 'No company'}
                  {profileUser?.position && <span className="text-[#A0A0A0]"> • {profileUser.position}</span>}
                </p>
              </div>
              {canEdit && !isEditing && (
                <button
                  type="button"
                  onClick={onEditToggle}
                  className="flex-shrink-0 px-5 py-2 text-sm font-bold bg-[#FFD700] text-[#0F1B2B] rounded-lg hover:bg-white transition-all"
                >
                  Edit Profile
                </button>
              )}
              {canEdit && isEditing && (
                <div className="flex flex-shrink-0 gap-2">
                  <Button
                    type="submit"
                    disabled={profileUpdating}
                    className="!bg-gradient-to-r !from-[#FFD700] !to-[#FDB931] !text-black font-bold border-none hover:shadow-lg disabled:opacity-70 text-sm px-4 py-2"
                  >
                    {profileUpdating ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    disabled={profileUpdating}
                    className="bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] border-none text-sm px-4 py-2"
                    onClick={onCancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Bio */}
            <div className={`mt-4 rounded-xl${hl('about')}`}>
              {isEditing ? (
                <textarea
                  value={about}
                  onChange={(e) => {
                    setAbout(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                  placeholder="Tell us about yourself and your company..."
                  className="w-full bg-[rgba(255,255,255,0.05)] border-2 border-[#FFD700]/50 rounded-xl p-4 text-white text-sm leading-relaxed placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700] resize-none min-h-[80px] overflow-hidden shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
                />
              ) : (
                <p className="text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-wrap">
                  {profileUser?.about || 'Add a brief overview of your company…'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
          <div className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]${hl('companyName')}`}>
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Company</p>
            <p className="text-white font-semibold text-lg truncate">{profileUser?.companyName || 'Not set'}</p>
          </div>

          <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Category</p>
            <p className="text-white font-semibold text-lg truncate">{formatCategory(categoryName)}</p>
          </div>

          <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-wider mb-3 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Role</p>
            <RoleBadge role={profileUser?.role} size="md" />
          </div>

          <div className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]${hl('country')}`}>
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Country</p>
            <p className="text-white font-semibold text-lg truncate">{getCountryLabel(profileUser?.country)}</p>
          </div>

          {canEdit && (
            <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Email</p>
                <span className="text-[10px] text-[#A0A0A0]/60">(Private)</span>
              </div>
              <p className="text-white font-semibold text-lg truncate">{profileUser?.email || 'Not set'}</p>
            </div>
          )}

          {canEdit && (
            <div className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]${hl('phone')}`}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Phone</p>
                <span className="text-[10px] text-[#A0A0A0]/60">(Private)</span>
              </div>
              {isEditing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className={`w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-lg focus:outline-none focus:border-[#FFD700] rounded-xl px-3 py-2 ${phone ? 'border border-[rgba(255,255,255,0.15)]' : 'border-2 border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow'}`}
                />
              ) : (
                <p className="text-white font-semibold text-lg truncate">{profileUser?.phone || 'Not set'}</p>
              )}
            </div>
          )}

          <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">LinkedIn</p>
            {canEdit && isEditing ? (
              <input
                type="url"
                value={linkedinProfile}
                onChange={(e) => setLinkedinProfile(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-base focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
              />
            ) : profileUser?.linkedinProfile ? (
              <a
                href={profileUser.linkedinProfile}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0A66C2] font-semibold text-base truncate block hover:underline"
              >
                {profileUser.linkedinProfile.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : (
              <p className="text-[#A0A0A0] font-semibold text-lg">{canEdit ? 'Not set - Add LinkedIn' : 'Not set'}</p>
            )}
          </div>

          <div className={`bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]${hl('companyWebsite')}`}>
            <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Website</p>
            {canEdit && isEditing ? (
              <input
                type="url"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="https://www.company.com"
                className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-base focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
              />
            ) : profileUser?.companyWebsite ? (
              <a
                href={profileUser.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFD700] font-semibold text-base truncate block hover:underline"
              >
                {profileUser.companyWebsite.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : (
              <p className="text-[#A0A0A0] font-semibold text-lg">{canEdit ? 'Not set - Add website' : 'Not set'}</p>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}

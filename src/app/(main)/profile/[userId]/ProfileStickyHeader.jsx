'use client';

/**
 * ProfileStickyHeader - Appears when scrolling past the fold on the profile page.
 */
export function ProfileStickyHeader({ profileUser, isOwnProfile, currentUser, showStickyHeader, onAdminClick, onHomeClick }) {
  return (
    <header
      className={`border-b border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.95)] backdrop-blur-md fixed top-[var(--navbar-height)] left-0 right-0 z-40 py-4 transition-all duration-300 ${
        showStickyHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* User Info with Logo */}
          <div className="flex items-center gap-4 sm:gap-6">
            {profileUser?.companyLogo ? (
              <img
                src={profileUser.companyLogo}
                alt="Company logo"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[rgba(255,215,0,0.3)] shadow-[0_0_20px_rgba(0,0,0,0.3)]"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <span className="text-2xl sm:text-3xl">🏭</span>
              </div>
            )}

            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 truncate">
                {profileUser?.displayName || profileUser?.email || 'User'}
              </h1>
              <p className="text-[#A0A0A0] flex items-center gap-2 text-sm sm:text-base flex-wrap">
                <span className="text-[#FFD700] font-medium truncate">{profileUser?.companyName || 'No company'}</span>
                {profileUser?.position && <span className="w-1 h-1 rounded-full bg-[#A0A0A0] hidden sm:block"></span>}
                {profileUser?.position && <span className="hidden sm:inline truncate">{profileUser.position}</span>}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {isOwnProfile && currentUser?.role === 'admin' && (
              <button
                onClick={onAdminClick}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-all font-medium text-sm sm:text-base"
              >
                Admin
              </button>
            )}
            <button
              onClick={onHomeClick}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-all font-medium text-sm sm:text-base"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

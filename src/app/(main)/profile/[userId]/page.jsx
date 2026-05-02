/**
 * Profile Page - Dynamic
 * URL: /profile/[userId]
 * Orchestrates: ProfileStickyHeader, ProfileCard, ProfileProducts,
 *               ProfileRequests, CompanyDocuments, LawyerProfileContent
 */
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Settings, Heart } from 'lucide-react';
import { ProfileStickyHeader } from './ProfileStickyHeader';
import { ProfileCard } from './ProfileCard';
import { useProfilePage } from './useProfilePage';
import { ProductUploadRequestButton } from '@/presentation/components/features/profile/ProductUploadRequestButton/ProductUploadRequestButton';

// ProfileCompletionCard reads sessionStorage — must be client-side only
const ProfileCompletionCard = dynamic(
  () =>
    import(
      '@/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard'
    ).then((m) => ({ default: m.ProfileCompletionCard })),
  { ssr: false }
);

// Heavy sub-components loaded lazily to reduce initial bundle
const CompanyDocuments = dynamic(
  () => import('@/presentation/components/features/profile/CompanyDocuments/CompanyDocuments').then(m => ({ default: m.CompanyDocuments })),
  { loading: () => <div className="h-32 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />, ssr: false }
);
const LawyerProfileContent = dynamic(
  () => import('@/presentation/components/features/legal/LawyerProfile/LawyerProfileContent').then(m => ({ default: m.LawyerProfileContent })),
  { loading: () => <div className="h-48 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />, ssr: false }
);
const ProfileProducts = dynamic(
  () => import('./ProfileProducts').then(m => ({ default: m.ProfileProducts })),
  { loading: () => <div className="h-64 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />, ssr: false }
);
const ProfileRequests = dynamic(
  () => import('./ProfileRequests').then(m => ({ default: m.ProfileRequests })),
  { loading: () => <div className="h-48 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />, ssr: false }
);

const SPINNER = (
  <div className="min-h-screen flex items-center justify-center bg-radial-navy">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto" />
      <p className="mt-4 text-[#A0A0A0]">Loading...</p>
    </div>
  </div>
);

function ProfileContent() {
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const { logout } = useLogout();
  const router = useRouter();
  const { userId } = useParams();

  const page = useProfilePage({ userId, currentUser, authLoading, isAuthenticated, logout });

  if (authLoading || page.loading) return SPINNER;
  if (!isAuthenticated || !page.profileUser) return null;

  return (
    <div className="min-h-screen bg-radial-navy pb-20">
      <ProfileStickyHeader
        profileUser={page.profileUser} isOwnProfile={page.isOwnProfile} currentUser={currentUser}
        showStickyHeader={page.showStickyHeader}
        onAdminClick={() => router.push('/admin')} onHomeClick={() => router.push('/')}
      />

      <main className="max-w-7xl mx-auto pt-[var(--navbar-height)] pb-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <ProfileCard
          profileUser={page.profileUser} categoryName={page.categoryName}
          canEdit={page.canEdit} isEditing={page.isEditing} isOwnProfile={page.isOwnProfile}
          phone={page.phone} setPhone={page.setPhone}
          about={page.about} setAbout={page.setAbout}
          linkedinProfile={page.linkedinProfile} setLinkedinProfile={page.setLinkedinProfile}
          companyWebsite={page.companyWebsite} setCompanyWebsite={page.setCompanyWebsite}
          logoLoading={page.logoLoading} logoPreview={page.logoPreview} profileUpdating={page.profileUpdating}
          onEditToggle={() => page.setIsEditing(true)}
          onLogoChange={page.handleLogoChange}
          onRemoveLogo={page.handleRemoveLogo}
          onProfileUpdate={page.handleProfileUpdate}
          onCancelEdit={page.handleCancelEdit}
        />

        {/* Profile completion card — own profile only, hides at 100% */}
        {page.isOwnProfile && currentUser && (
          <ProfileCompletionCard user={currentUser} />
        )}

        {page.isOwnProfile && (
          <div className="flex justify-start">
            <ProductUploadRequestButton user={currentUser} />
          </div>
        )}

        {page.isOwnProfile && (
          <div className="flex justify-end gap-4">
            <Link
              href="/favorites"
              className="text-sm text-[#A0A0A0] hover:text-[#FFD700] flex items-center gap-1 transition-colors"
            >
              <Heart className="w-4 h-4" /> My Favorites
            </Link>
            <Link
              href="/settings"
              className="text-sm text-[#A0A0A0] hover:text-white flex items-center gap-1 transition-colors"
            >
              <Settings className="w-4 h-4" /> Settings
            </Link>
          </div>
        )}

        {page.profileUser?.role === 'lawyer' && (
          <LawyerProfileContent profileUser={page.profileUser} isOwnProfile={page.isOwnProfile} currentUser={currentUser} />
        )}

        {page.profileUser?.role !== 'lawyer' && (
          <>
            <div className="glass-card p-6">
              <CompanyDocuments userId={userId} documents={page.profileUser?.companyDocuments || []}
                isOwnProfile={page.isOwnProfile}
                onDocumentsChange={(docs) => page.setProfileUser((p) => ({ ...p, companyDocuments: docs }))} />
            </div>

            <ProfileProducts
              userId={userId} products={page.products} productsLoading={page.productsLoading}
              canEdit={page.canEdit} isOwnProfile={page.isOwnProfile} isAdmin={page.isAdmin}
              productPage={page.productPage} setProductPage={page.setProductPage} itemsPerPage={page.itemsPerPage}
              productModalOpen={page.productModalOpen} editingProduct={page.editingProduct}
              onOpenModal={() => { page.setEditingProduct(null); page.setProductModalOpen(true); }}
              onEditProduct={(p) => { page.setEditingProduct(p); page.setProductModalOpen(true); }}
              onDeleteProduct={page.handleDeleteProduct} onToggleProductStatus={page.handleToggleProductStatus}
              onProductSubmit={page.handleProductSubmit} onCloseModal={() => page.setProductModalOpen(false)}
            />

            <ProfileRequests
              userId={userId} requests={page.requests} requestsLoading={page.requestsLoading}
              categories={page.categories} canEdit={page.canEdit} isOwnProfile={page.isOwnProfile}
              requestPage={page.requestPage} setRequestPage={page.setRequestPage} itemsPerPage={page.itemsPerPage}
              requestModalOpen={page.requestModalOpen} editingRequest={page.editingRequest}
              onOpenModal={() => { page.setEditingRequest(null); page.setRequestModalOpen(true); }}
              onEditRequest={(r) => { page.setEditingRequest(r); page.setRequestModalOpen(true); }}
              onDeleteRequest={page.handleDeleteRequest} onCloseRequest={page.handleCloseRequest}
              onReopenRequest={page.handleReopenRequest}
              onSendMessage={() => {}} // TODO: messaging
              onRequestSubmit={page.handleRequestSubmit} onCloseModal={() => page.setRequestModalOpen(false)}
            />

          </>
        )}
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={SPINNER}><ProfileContent /></Suspense>;
}

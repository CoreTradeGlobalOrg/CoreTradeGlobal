'use client';

import { useEffect, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { container } from '@/core/di/container';
import { useProducts } from '@/presentation/hooks/product/useProducts';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { useUpdateProduct } from '@/presentation/hooks/product/useUpdateProduct';
import { useDeleteProduct } from '@/presentation/hooks/product/useDeleteProduct';
import { useRequests } from '@/presentation/hooks/request/useRequests';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { useUpdateRequest } from '@/presentation/hooks/request/useUpdateRequest';
import { useDeleteRequest } from '@/presentation/hooks/request/useDeleteRequest';
import { useCategories } from '@/presentation/hooks/category/useCategories';

/**
 * useProfilePage - All state, effects, and action handlers for the profile page.
 * Returns everything the orchestrator needs to pass to sub-components.
 */
export function useProfilePage({ userId, currentUser, authLoading, isAuthenticated, logout }) {
  const router = useRouter();
  const isOwnProfile = currentUser?.uid === userId;
  const canEdit = isOwnProfile || currentUser?.role === 'admin';
  const isAdmin = currentUser?.role === 'admin' && !isOwnProfile;

  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // Core state
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [categoryName, setCategoryName] = useState(null);

  // Modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  // Pagination
  const [productPage, setProductPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  // Profile form fields
  const [phone, setPhone] = useState('');
  const [about, setAbout] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Data hooks
  const { products, loading: productsLoading, refetch: refetchProducts } = useProducts(userId);
  const { createProduct } = useCreateProduct();
  const { updateProduct } = useUpdateProduct();
  const { deleteProduct } = useDeleteProduct();
  const { requests, loading: requestsLoading, refetch: refetchRequests } = useRequests(userId);
  const { createRequest } = useCreateRequest();
  const { updateRequest } = useUpdateRequest();
  const { deleteRequest } = useDeleteRequest();
  const { categories } = useCategories();

  // Effects
  useEffect(() => {
    const update = () => setItemsPerPage(window.innerWidth < 768 ? 1 : 3);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!userId || authLoading) return;
    setLoading(true);
    container.getUserRepository().getById(userId)
      .then((userData) => {
        if (!userData) { toast.error('User not found'); router.push('/'); return; }
        setProfileUser(userData);
        if (canEdit) {
          setPhone(userData.phone || ''); setAbout(userData.about || '');
          setLinkedinProfile(userData.linkedinProfile || ''); setCompanyWebsite(userData.companyWebsite || '');
          setLogoPreview(userData.companyLogo || null);
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [userId, authLoading]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace(`/login?redirect=/profile/${userId}`);
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const h = () => setShowStickyHeader(window.scrollY > 300);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    if (!profileUser?.companyCategory) { setCategoryName(null); return; }
    container.getFirestoreDataSource().getById('categories', profileUser.companyCategory)
      .then((cat) => setCategoryName(cat?.name || profileUser.companyCategory))
      .catch(() => setCategoryName(profileUser.companyCategory));
  }, [profileUser?.companyCategory]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleRemoveLogo = () => {
    setLogoFile(null); setLogoPreview(null); setLogoRemoved(true);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image size must be less than 5MB'); return; }
    setLogoFile(file); setLogoRemoved(false); setLogoLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => { setLogoPreview(reader.result); setLogoLoading(false); };
    reader.onerror = () => { toast.error('Failed to load image'); setLogoLoading(false); };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    setProfileUpdating(true);
    try {
      const repo = container.getUserRepository();
      let logoUrl = profileUser.companyLogo;
      if (logoRemoved) logoUrl = null;
      else if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        logoUrl = await container.getFirebaseStorageDataSource().uploadFile(`${userId}/company-logo/image.${ext}`, logoFile);
      }
      await repo.update(userId, { phone, about, linkedinProfile, companyWebsite, companyLogo: logoUrl, updatedAt: new Date() });
      const updated = await repo.getById(userId);
      setProfileUser(updated); setLogoPreview(updated.companyLogo || null);
      toast.success('Profile updated successfully!');
      setIsEditing(false); setLogoFile(null); setLogoRemoved(false);
    } catch { toast.error('Failed to update profile'); }
    finally { setProfileUpdating(false); }
  };

  const handleCancelEdit = () => {
    setIsEditing(false); setPhone(profileUser?.phone || ''); setAbout(profileUser?.about || '');
    setLinkedinProfile(profileUser?.linkedinProfile || ''); setCompanyWebsite(profileUser?.companyWebsite || '');
    setLogoPreview(profileUser?.companyLogo || null); setLogoFile(null); setLogoRemoved(false);
  };

  const handleProductSubmit = async (data, imageFiles) => {
    try {
      if (editingProduct) await updateProduct(editingProduct.id, userId, data, imageFiles, { isAdmin });
      else { await createProduct(data, imageFiles); setProductPage(1); }
      setProductModalOpen(false); setEditingProduct(null); refetchProducts();
    } catch { /* hook shows error */ }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteProduct(productId, userId, { isAdmin });
      const max = Math.ceil(((products?.length || 1) - 1) / itemsPerPage) || 1;
      if (productPage > max) setProductPage(max);
      refetchProducts();
    } catch { /* hook shows error */ }
  };

  const handleToggleProductStatus = async (productId, newStatus) => {
    try {
      await updateProduct(productId, userId, { status: newStatus }, [], { isAdmin });
      refetchProducts(); toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
    } catch { toast.error('Failed to update product status'); }
  };

  const handleRequestSubmit = async (data) => {
    try {
      if (editingRequest) await updateRequest(editingRequest.id, userId, data, { isAdmin });
      else { await createRequest(data); setRequestPage(1); }
      setRequestModalOpen(false); setEditingRequest(null); refetchRequests();
    } catch { /* hook shows error */ }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await deleteRequest(requestId, userId, { isAdmin });
      const max = Math.ceil(((requests?.length || 1) - 1) / itemsPerPage) || 1;
      if (requestPage > max) setRequestPage(max);
      refetchRequests();
    } catch { /* hook shows error */ }
  };

  const handleCloseRequest = async (id) => {
    try { await updateRequest(id, userId, { status: 'closed' }, { isAdmin }); refetchRequests(); toast.success('Request closed!'); }
    catch { toast.error('Failed to close request'); }
  };

  const handleReopenRequest = async (id) => {
    try { await updateRequest(id, userId, { status: 'active' }, { isAdmin }); refetchRequests(); toast.success('Request reopened!'); }
    catch { toast.error('Failed to reopen request'); }
  };

  return {
    // State
    profileUser, setProfileUser, loading, isEditing, setIsEditing, showStickyHeader, categoryName,
    productModalOpen, setProductModalOpen, editingProduct, setEditingProduct,
    requestModalOpen, setRequestModalOpen, editingRequest, setEditingRequest,
    productPage, setProductPage, requestPage, setRequestPage, itemsPerPage,
    phone, setPhone, about, setAbout, linkedinProfile, setLinkedinProfile,
    companyWebsite, setCompanyWebsite, logoLoading, logoPreview, profileUpdating,
    // Data
    products, productsLoading, requests, requestsLoading, categories,
    // Computed
    isOwnProfile, canEdit, isAdmin,
    // Handlers
    handleLogoChange, handleRemoveLogo, handleProfileUpdate, handleCancelEdit,
    handleProductSubmit, handleDeleteProduct, handleToggleProductStatus,
    handleRequestSubmit, handleDeleteRequest, handleCloseRequest, handleReopenRequest,
  };
}

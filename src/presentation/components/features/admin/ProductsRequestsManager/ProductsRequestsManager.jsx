/**
 * ProductsRequestsManager Component
 *
 * Admin interface for creating products and requests on behalf of any user
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { Plus, Package, FileText, User, Building2, CheckCircle } from 'lucide-react';

export function ProductsRequestsManager({ users }) {
  const { user: adminUser } = useAuth();
  const { createProduct } = useCreateProduct();
  const { createRequest } = useCreateRequest();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'product' or 'request'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);

  // Build user options for SearchableSelect
  const userOptions = (users || []).map((u) => ({
    value: u.uid || u.id,
    label: `${u.displayName || u.email || 'Unknown'} ${u.companyName ? `(${u.companyName})` : ''}`.trim(),
  }));

  const selectedUser = (users || []).find(
    (u) => (u.uid || u.id) === selectedUserId
  );

  const openModal = (type) => {
    setModalType(type);
    setSelectedUserId('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setSelectedUserId('');
  };

  // Retry helper for Firestore rules cold-start on first get() call
  const withRetry = async (fn, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries || !error.message?.includes('permissions')) throw error;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  };

  const handleProductSubmit = async (productData, imageFiles) => {
    const dataWithAdmin = {
      ...productData,
      userId: selectedUserId,
      createdByAdmin: adminUser.uid,
    };
    await withRetry(() => createProduct(dataWithAdmin, imageFiles));
    setRecentActivity((prev) => [
      {
        type: 'product',
        name: productData.name,
        userName: selectedUser?.displayName || selectedUser?.email || 'Unknown',
        time: new Date(),
      },
      ...prev,
    ]);
    closeModal();
  };

  const handleRequestSubmit = async (requestData) => {
    const dataWithAdmin = {
      ...requestData,
      userId: selectedUserId,
      createdByAdmin: adminUser.uid,
    };
    await withRetry(() => createRequest(dataWithAdmin));
    setRecentActivity((prev) => [
      {
        type: 'request',
        name: requestData.productName,
        userName: selectedUser?.displayName || selectedUser?.email || 'Unknown',
        time: new Date(),
      },
      ...prev,
    ]);
    closeModal();
  };

  const modalTitle =
    modalType === 'product' ? 'Add Product for User' : 'Add Request for User';
  const modalVariant = modalType === 'request' ? 'blue' : 'gold';

  return (
    <div>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 md:gap-4 mb-6">
        <button
          onClick={() => openModal('product')}
          className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold text-sm md:text-base transition-colors"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <Package className="w-4 h-4 md:w-5 md:h-5" />
          Add Product
        </button>
        <button
          onClick={() => openModal('request')}
          className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-semibold text-sm md:text-base transition-colors"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <FileText className="w-4 h-4 md:w-5 md:h-5" />
          Add Request
        </button>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-[#A0A0A0] mb-3">
            Recent Activity (this session)
          </h4>
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]"
              >
                <CheckCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{
                    color:
                      activity.type === 'product' ? '#FFD700' : '#3b82f6',
                  }}
                />
                <p className="text-white text-sm min-w-0 truncate">
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        activity.type === 'product' ? '#FFD700' : '#3b82f6',
                    }}
                  >
                    {activity.type === 'product' ? 'Product' : 'Request'}
                  </span>
                  {' "'}
                  {activity.name}
                  {'" for '}
                  <span className="font-semibold">{activity.userName}</span>
                  <span className="text-[#A0A0A0] ml-2 text-xs">
                    {activity.time.toLocaleTimeString()}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        variant={modalVariant}
        className="!max-w-[95vw] !max-h-[92vh] !rounded-xl md:!max-w-4xl md:!rounded-2xl"
      >
        {/* Step 1: User Picker */}
        <div className="mb-4 md:mb-6">
          <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Select User
            <span
              style={{ color: modalVariant === 'blue' ? '#3b82f6' : '#FFD700' }}
            >
              {' '}
              *
            </span>
          </label>
          <SearchableSelect
            options={userOptions}
            value={selectedUserId}
            onChange={setSelectedUserId}
            placeholder="Search by name or company..."
            searchPlaceholder="Type to search users..."
            className={modalVariant === 'blue' ? 'dark-select-blue' : 'dark-select'}
          />
          {selectedUser && (
            <div className="mt-2 md:mt-3 p-2 md:p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-[#A0A0A0] flex-shrink-0" />
                <span className="text-white font-medium truncate">
                  {selectedUser.displayName || 'No name'}
                </span>
              </div>
              {selectedUser.companyName && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <Building2 className="w-4 h-4 text-[#A0A0A0] flex-shrink-0" />
                  <span className="text-[#A0A0A0] truncate">
                    {selectedUser.companyName}
                  </span>
                </div>
              )}
              {selectedUser.email && (
                <p className="text-[#A0A0A0] text-xs mt-1 ml-6 truncate">
                  {selectedUser.email}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Form (only when user is selected) */}
        {selectedUserId && modalType === 'product' && (
          <ProductForm
            product={null}
            onSubmit={handleProductSubmit}
            onCancel={closeModal}
            userId={selectedUserId}
          />
        )}

        {selectedUserId && modalType === 'request' && (
          <RequestForm
            request={null}
            onSubmit={handleRequestSubmit}
            onCancel={closeModal}
            userId={selectedUserId}
          />
        )}

        {/* Prompt to select user */}
        {!selectedUserId && (
          <p className="text-center text-[#A0A0A0] py-4 md:py-8">
            Please select a user above to continue.
          </p>
        )}
      </Modal>
    </div>
  );
}

export default ProductsRequestsManager;

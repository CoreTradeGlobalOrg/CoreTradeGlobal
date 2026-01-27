/**
 * StrategicCTA Component
 *
 * Call-to-action section for the homepage
 * Matches design exactly from Strategic CTA v2.html
 *
 * - Logged in: Opens product/request creation dialogs
 * - Not logged in: Redirects to register
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import toast from 'react-hot-toast';

export function StrategicCTA() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const { createProduct } = useCreateProduct();
  const { createRequest } = useCreateRequest();

  const handleSellClick = () => {
    if (isAuthenticated && user) {
      setProductModalOpen(true);
    } else {
      router.push('/register?type=seller');
    }
  };

  const handleBuyClick = () => {
    if (isAuthenticated && user) {
      setRequestModalOpen(true);
    } else {
      router.push('/register?type=buyer');
    }
  };

  const handleProductSubmit = async (data, imageFiles) => {
    try {
      await createProduct(user.uid, data, imageFiles);
      setProductModalOpen(false);
      toast.success('Product created successfully!');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    }
  };

  const handleRequestSubmit = async (data) => {
    try {
      await createRequest(user.uid, data);
      setRequestModalOpen(false);
      toast.success('Request created successfully!');
    } catch (error) {
      console.error('Error creating request:', error);
      toast.error(error.message || 'Failed to create request');
    }
  };

  return (
    <>
      <section className="strategic-cta-v2">
        <div className="cta-container-v2">
          {/* Seller Card */}
          <div className="cta-card-v2">
            <div className="cta-icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h2>Ready to Export?</h2>
            <p>
              Expand your business globally. Showcase your products to buyers worldwide.
              <span className="cta-action-highlight">Upload Your First Product:</span>
            </p>
            {!loading && (
              <button onClick={handleSellClick} className="cta-btn cta-btn-sell">
                I want to sell
              </button>
            )}
          </div>

          {/* Buyer Card */}
          <div className="cta-card-v2">
            <div className="cta-icon-box">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2>Sourcing a Product?</h2>
            <p>
              Describe your requirements, receive quotes from verified global manufacturers.
              <span className="cta-action-highlight">Post Your First RFQ:</span>
            </p>
            {!loading && (
              <button onClick={handleBuyClick} className="cta-btn cta-btn-buy">
                I want to buy
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Product Creation Modal */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Add New Product"
      >
        <ProductForm
          userId={user?.uid}
          onSubmit={handleProductSubmit}
          onCancel={() => setProductModalOpen(false)}
        />
      </Modal>

      {/* Request Creation Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Create New RFQ"
      >
        <RequestForm
          onSubmit={handleRequestSubmit}
          onCancel={() => setRequestModalOpen(false)}
        />
      </Modal>
    </>
  );
}

export default StrategicCTA;

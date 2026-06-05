/**
 * FAQSection Component
 *
 * Displays frequently asked questions with expandable answers.
 * Used on both the homepage and the standalone /faq page.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import toast from 'react-hot-toast';

const faqLinkClass = 'text-[#FFD700] hover:text-white underline underline-offset-2 transition-colors';

const getFaqItems = (onAddProduct) => [
  {
    id: 1,
    question: 'What exactly is an "Integrated Transaction"?',
    answer: (
      <>An Integrated Transaction is the end-to-end cycle of a single trade: buyer/seller quote negotiation, agreement in principle, logistics RFQ, insurance RFQ, and trade tracking. All these steps count as one &ldquo;transaction.&rdquo;</>
    ),
  },
  {
    id: 2,
    question: 'Is it mandatory to get transport and insurance quotes?',
    answer: (
      <>No, it is completely optional. Logistics and insurance RFQ features are provided integrated into the platform, but using them is entirely up to you.</>
    ),
  },
  {
    id: 3,
    question: 'Does the platform take a commission on trades?',
    answer: (
      <>No. CoreTradeGlobal generates revenue solely through the subscription model. No commission is charged on the trade amount, freight cost, or insurance premium.</>
    ),
  },
  {
    id: 4,
    question: 'Is the Founder Member price permanent?',
    answer: (
      <>Yes. The discounted annual rates offered to the first 100 members remain permanent as long as your account stays active. New members starting from August 2026 will pay standard rates.</>
    ),
  },
  {
    id: 5,
    question: 'Who can join the platform?',
    answer: (
      <>Exporters, importers, <Link href="/register" className={faqLinkClass}>logistics service providers</Link> (forwarders/shipping), insurance agencies, and trade lawyers can all participate in the platform&apos;s ecosystem.</>
    ),
  },
  {
    id: 6,
    question: 'How do I get the "Verified" badge?',
    answer: (
      <>Every company joining the platform is manually reviewed by the CoreTradeGlobal team. Companies that complete the necessary documentation and verification steps will display a &ldquo;Verified&rdquo; badge on their profile. <Link href="/register" className={faqLinkClass}>Sign up to start the verification process</Link>.</>
    ),
  },
  {
    id: 7,
    question: 'What does legal support cover?',
    answer: (
      <>Consultants within the platform provide guidance on export documentation, trade compliance, and potential contract disputes. <Link href="/contact" className={faqLinkClass}>Contact us for more details</Link>.</>
    ),
  },
  {
    id: 8,
    question: 'What are AI-powered news summaries?',
    answer: (
      <>Our AI system scans <Link href="/news" className={faqLinkClass}>global trade news</Link>, selects the ones relevant to your sector, and presents you with a summary of the most important points.</>
    ),
  },
  {
    id: 9,
    question: (
      <>How does the <Link href="/fairs" className={faqLinkClass}>Trade Fair</Link> feature work?</>
    ),
    answer: (
      <><Link href="/fairs" className={faqLinkClass}>International trade fairs</Link> relevant to your sector are listed chronologically, helping you stay informed about global events and expand your network.</>
    ),
  },
  {
    id: 10,
    question: 'Is the messaging system secure?',
    answer: (
      <>Yes. You can share files, photos, and documents through our encrypted messaging channel. You can safely conduct trade on the platform without sharing personal contact information.</>
    ),
  },
  {
    id: 11,
    question: 'How can I list my products?',
    answer: (
      <>You can make your products available to global buyers by entering photos, descriptions, and categories in the <button onClick={onAddProduct} className={faqLinkClass + ' cursor-pointer'}>&ldquo;Add Product&rdquo;</button> section of your panel.</>
    ),
  },
  {
    id: 12,
    question: (
      <>How does the <Link href="/requests" className={faqLinkClass}>RFQ</Link> (Request for Quote) process work?</>
    ),
    answer: (
      <>When you need a product or service, you create a <Link href="/requests" className={faqLinkClass}>request</Link>. The system automatically notifies relevant suppliers or service providers, allowing you to receive live quotes.</>
    ),
  },
  {
    id: 13,
    question: 'What are the payment methods?',
    answer: (
      <>You can make your membership payments via credit card or bank transfer through our secure payment infrastructure.</>
    ),
  },
  {
    id: 14,
    question: 'Can I cancel my subscription at any time?',
    answer: (
      <>Yes. For our non-commitment plans, you can cancel your subscription at any time via the panel.</>
    ),
  },
  {
    id: 15,
    question: 'Who can I contact for technical support?',
    answer: (
      <>For any questions, you can reach us at <a href="mailto:contact@coretradeglobal.com" className={faqLinkClass}>contact@coretradeglobal.com</a> or through the <Link href="/contact" className={faqLinkClass}>live support chat</Link> within the platform.</>
    ),
  },
];

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className={`faq-item ${isOpen ? 'active' : ''}`}>
      <button className="faq-question" onClick={onToggle}>
        <span>{item.question}</span>
        <ChevronDown className="faq-icon" />
      </button>
      <div
        className="faq-answer"
        style={{
          maxHeight: isOpen ? '500px' : '0',
        }}
      >
        <div className="faq-content-wrapper">
          <p>{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openId, setOpenId] = useState(1);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { createProduct } = useCreateProduct();

  const handleAddProduct = () => {
    if (!isAuthenticated) {
      window.location.href = '/register';
      return;
    }
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (data, imageFiles) => {
    try {
      await createProduct(data, imageFiles);
      setProductModalOpen(false);
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product. Please try again.');
    }
  };

  const faqItems = getFaqItems(handleAddProduct);

  return (
    <>
      <section className="faq-section" id="faq">
        <div className="faq-container">
          {/* Header */}
          <div className="faq-header">
            <h2 style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Frequently Asked Questions</h2>
            <p>Find answers to common questions about CoreTradeGlobal</p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqItems.map((item) => (
              <FAQItem
                key={item.id}
                item={item}
                isOpen={openId === item.id}
                onToggle={() => setOpenId(openId === item.id ? null : item.id)}
              />
            ))}
          </div>
        </div>
      </section>

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
    </>
  );
}

export default FAQSection;

/**
 * FAQSection Component
 *
 * Sectioned FAQ with accordion items.
 * 6 sections, 18 questions total.
 * Includes contextual navigation links and Add Product modal.
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

const getFaqSections = (onAddProduct) => [
  {
    title: 'Getting Started',
    items: [
      {
        id: 1,
        question: 'How can I complete my company profile?',
        answer: (
          <>Navigate to the &ldquo;Company Profile&rdquo; tab on your User Dashboard to fully enter your company&apos;s legal name, registered country, contact information, and core industries of operation. Adding your corporate logo and uploading digital brochures will significantly enhance your credibility and digital presence among global buyers and sellers.</>
        ),
      },
      {
        id: 2,
        question: 'How do I upload products?',
        answer: (
          <>You can start listing your items by clicking the <button onClick={onAddProduct} className={faqLinkClass + ' cursor-pointer'}>&ldquo;Add New Product&rdquo;</button> button under the &ldquo;Products&rdquo; section of your dashboard. Once you provide the product name, detailed description, Minimum Order Quantity (MOQ), and high-resolution product images, your catalog will be displayed in our global marketplace 24/7.</>
        ),
      },
      {
        id: 3,
        question: 'How do I publish an RFQ?',
        answer: (
          <>When you source a product, you can easily create a request from the <Link href="/requests" className={faqLinkClass}>&ldquo;RFQs&rdquo;</Link> (Requests for Quote) tab on your dashboard. Specify the technical details of the product, required quantity, target budget, and the delivery terms or destination port according to Incoterms rules (FOB, CIF, EXW, etc.). Once published, your RFQ is instantly delivered to all relevant suppliers within the ecosystem.</>
        ),
      },
      {
        id: 4,
        question: 'How does the Deal system work?',
        answer: (
          <>The &ldquo;Deal&rdquo; system is our platform&apos;s smart workflow that provides end-to-end tracking for your international trade transactions. A &ldquo;Deal&rdquo; is initiated as soon as a buyer and seller reach an agreement via an RFQ or direct messaging. Through this unified panel, you can track all foreign trade stages step-by-step — including contract preparation, production tracking, logistics booking, and customs clearance — while deploying integrated logistics and insurance solutions along the way.</>
        ),
      },
    ],
  },
  {
    title: 'General Advantages and Industries',
    items: [
      {
        id: 5,
        question: 'What do I gain by joining CoreTradeGlobal?',
        answer: (
          <span className="space-y-2 block">
            <span className="block">CoreTradeGlobal provides your business with a seamless, digital infrastructure for continuous growth in global markets:</span>
            <span className="block pl-4"><strong className="text-white">Zero-Cost Start:</strong> Creating a company profile, uploading your catalogs, and listing your products is completely free.</span>
            <span className="block pl-4"><strong className="text-white">24/7 Global Digital Visibility:</strong> Without spending thousands of dollars on physical trade fairs and international travel, you can showcase your products to target buyers worldwide 24/7, securing a permanent export channel in the digital space.</span>
            <span className="block pl-4"><strong className="text-white">Flexible Operations:</strong> By directly accessing global logistics, cargo insurance, and legal support solutions through a single platform, you can manage your foreign trade operations much faster and more cost-effectively.</span>
          </span>
        ),
      },
      {
        id: 6,
        question: 'Which industries and product categories are available?',
        answer: (
          <>CoreTradeGlobal features a comprehensive sectoral range covering all major arteries of global industry. Dozens of main sectors and thousands of subcategories — including construction and building materials, industrial machinery and equipment, textiles and apparel, food and agriculture, chemicals, and technology components — are actively traded on our platform. <Link href="/categories" className={faqLinkClass}>Browse all categories</Link>.</>
        ),
      },
    ],
  },
  {
    title: 'Operational Workflow and Quoting Processes',
    items: [
      {
        id: 7,
        question: 'What exactly is an "Integrated Transaction"?',
        answer: (
          <>An Integrated Transaction means that all operational pillars of international trade converge onto a single dashboard when a commercial process is initiated. The moment a buyer and seller reach an agreement, our integrated logistics network automatically generates live shipping quotes, our insurance partners provide cargo security options, and our legal advisors prepare the framework for contracts. The entire workflow is managed from a single hub without the friction of juggling multiple platforms.</>
        ),
      },
      {
        id: 8,
        question: 'How does the RFQ (Request for Quote) process work?',
        answer: (
          <>The process is remarkably straightforward: A buying company publishes an <Link href="/requests" className={faqLinkClass}>RFQ</Link> containing its specific product requirements. Eligible suppliers on the platform submit their competitive price quotes. Concurrently, logistics and insurance providers within the ecosystem reflect transaction-specific shipping and coverage costs on the panel. The buyer views all operational costs on a single screen, selects the optimal offer, and initiates the commercial trade process (Deal) directly.</>
        ),
      },
      {
        id: 9,
        question: 'Is it mandatory to get logistics and insurance quotes through the platform?',
        answer: (
          <>No, it is absolutely not mandatory. The logistics and insurance quotes provided within CoreTradeGlobal are entirely flexible, optional services designed to alleviate the operational burden on your business. Companies are completely free to manage their shipping and insurance processes independently using their existing freight forwarders or insurance brokers if they prefer.</>
        ),
      },
    ],
  },
  {
    title: 'Ecosystem Tools',
    items: [
      {
        id: 10,
        question: 'Can I track global trade fairs?',
        answer: (
          <>Yes, you can. Thanks to our up-to-date <Link href="/fairs" className={faqLinkClass}>International Trade Fairs Calendar</Link> built into the platform, you can monitor all major trade shows, congresses, expos, and commercial events worldwide based on date, location, and industry, allowing you to plan strategically to expand your business network.</>
        ),
      },
      {
        id: 11,
        question: 'Can I check global trade news?',
        answer: (
          <>Yes. CoreTradeGlobal users can monitor all critical global trade updates — ranging from changes in customs regulations and international logistics/supply chain trends to sectoral analyses and macroeconomic developments — in real-time through the <Link href="/news" className={faqLinkClass}>corporate newsfeed module</Link> within the platform.</>
        ),
      },
      {
        id: 12,
        question: 'Can I track global currencies?',
        answer: (
          <>Yes. To help you make accurate financial decisions and protect your pricing margins in international trade, our platform features a live currency tracking tool. You can monitor global market exchange rates, cross rates, and fluctuations in real-time without ever leaving your CoreTradeGlobal dashboard.</>
        ),
      },
    ],
  },
  {
    title: 'Commission and Payment Policy',
    items: [
      {
        id: 13,
        question: 'Does the platform charge commissions on transactions?',
        answer: (
          <>No. CoreTradeGlobal operates strictly on a SaaS (Software as a Service) and ecosystem model. We do not demand any commissions, cuts, or hidden fees from any commercial transactions or agreements conducted through our platform. Creating a company profile and listing products remains completely free.</>
        ),
      },
      {
        id: 14,
        question: 'Is there a guarantee for trade payments?',
        answer: (
          <>CoreTradeGlobal&apos;s primary function is to digitally facilitate connections for companies worldwide to discover new customers, suppliers, and business partners. Commercial payments, financial transfers, and contract terms are executed entirely between the companies themselves and remain under their own responsibility. However, if businesses wish to legally secure their transactions, they can utilize the advisory legal services offered on our platform at any time.</>
        ),
      },
    ],
  },
  {
    title: 'Security, Legal Processes, and Support',
    items: [
      {
        id: 15,
        question: 'How is my data protected?',
        answer: (
          <>The security of our users&apos; trade secrets, corporate data, and personal information is our highest priority. CoreTradeGlobal operates on a cloud infrastructure fully compliant with international data protection standards (GDPR / CCPA). All data transfers, corporate correspondence, and operational documents on the platform are protected by top-tier cybersecurity protocols and advanced encryption systems.</>
        ),
      },
      {
        id: 16,
        question: 'What does the platform do in case of a buyer-seller dispute?',
        answer: (
          <>CoreTradeGlobal is a global trade ecosystem that brings buyers and sellers together; therefore, any potential disputes arising from transactions executed between parties are strictly the responsibility of the participating companies. However, in such scenarios, businesses can choose to utilize the professional advisory legal services available within our platform to safely resolve the issue within legal frameworks.</>
        ),
      },
      {
        id: 17,
        question: 'What does the legal support cover?',
        answer: (
          <>The advisory legal services accessible through our platform provide professional guidance across all critical legal stages of foreign trade. This includes compliance with international trade law regulations, drafting or reviewing cross-border agreements, correct application of Incoterms rules, and managing legal procedures during potential commercial disputes.</>
        ),
      },
      {
        id: 18,
        question: 'Who can I contact for technical support?',
        answer: (
          <>For any questions regarding platform usage, dashboard settings, or technical processes, you can submit a support ticket directly via the <Link href="/contact" className={faqLinkClass}>&ldquo;Contact Support&rdquo;</Link> button located in the footer, or reach out to our technical support team at any time via email at <a href="mailto:info@coretradeglobal.com" className={faqLinkClass}>info@coretradeglobal.com</a>.</>
        ),
      },
    ],
  },
];

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div
      className={`border-b last:border-b-0 transition-all duration-300 ${isOpen ? 'border-[rgba(255,215,0,0.18)] shadow-[0_0_20px_rgba(255,215,0,0.1)]' : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,215,0,0.3)]'}`}
      style={isOpen ? { background: 'linear-gradient(160deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 27, 43, 0.95) 100%)' } : undefined}
    >
      <button
        className="w-full flex items-center justify-between px-[30px] py-6 text-left transition-colors hover:text-[#FFD700]"
        onClick={onToggle}
      >
        <span className={`text-[1.2rem] font-semibold pr-5 transition-colors ${isOpen ? 'text-[#FFD700]' : 'text-white'}`} style={isOpen ? { textShadow: '0 0 10px rgba(255, 215, 0, 0.3)' } : undefined}>{item.question}</span>
        <ChevronDown
          className={`w-6 h-6 flex-shrink-0 transition-transform duration-300 ml-5 ${isOpen ? 'rotate-180 text-[#FFD700]' : 'text-[#e2e8f0]'}`}
          strokeWidth={2.5}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-500"
        style={{ maxHeight: isOpen ? '600px' : '0', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        {isOpen && <div className="border-t border-[rgba(255,255,255,0.05)]" />}
        <div className="px-[30px] pb-[30px] pt-[10px] text-[15px] text-[#cbd5e1] leading-[1.7]">
          {item.answer}
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openId, setOpenId] = useState(null);
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

  const sections = getFaqSections(handleAddProduct);

  return (
    <>
      <section className="faq-section" id="faq">
        <div className="faq-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Header */}
          <div className="faq-header">
            <h2 style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Frequently Asked Questions</h2>
            <p>Find answers to common questions about CoreTradeGlobal</p>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((section) => (
              <div key={section.title}>
                {/* Section Title */}
                <h3 className="text-xl font-bold text-[#FFD700] mb-4">
                  {section.title}
                </h3>

                {/* Questions Container */}
                <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden" style={{ background: 'linear-gradient(160deg, rgba(26, 28, 32, 0.6) 0%, rgba(15, 27, 43, 0.8) 100%)' }}>
                  {section.items.map((item) => (
                    <FAQItem
                      key={item.id}
                      item={item}
                      isOpen={openId === item.id}
                      onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                    />
                  ))}
                </div>
              </div>
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

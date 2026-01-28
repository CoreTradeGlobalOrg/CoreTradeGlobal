/**
 * FAQSection Component
 *
 * Homepage section displaying frequently asked questions
 * Matches design exactly from index.html
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    id: 1,
    question: 'What is CoreTradeGlobal?',
    answer:
      'CoreTradeGlobal is a B2B trading platform designed to connect verified suppliers with buyers worldwide. We facilitate international trade by providing tools for product listing, RFQ management, and direct communication between businesses.',
  },
  {
    id: 2,
    question: 'Is membership free?',
    answer:
      'Yes, creating an account on CoreTradeGlobal is completely free. With a free membership, you can list products, create RFQs, and connect with suppliers. We also offer premium plans with additional features for businesses looking to expand their reach.',
  },
  {
    id: 3,
    question: 'How do I create an RFQ (Request for Quote)?',
    answer:
      'After logging in, click on the "Create RFQ" button in your dashboard. Fill in the product details, quantity, budget, and delivery requirements. Once published, verified suppliers will be able to see your request and send you quotes.',
  },
  {
    id: 4,
    question: 'How are suppliers verified?',
    answer:
      'Our verification process includes checking company documents, trade licenses, and banking information. Verified suppliers are marked with a special badge on their profile. We also encourage users to leave reviews after transactions.',
  },
  {
    id: 5,
    question: 'How does payment work?',
    answer:
      'CoreTradeGlobal currently does not process payments directly. Buyers and suppliers negotiate and arrange payment terms between themselves after connecting on the platform. A secure payment system is coming soon.',
  },
  {
    id: 6,
    question: 'Which countries do you support?',
    answer:
      'We have suppliers and buyers from over 45 countries including Turkey, China, India, Germany, Italy, USA, and many more. Our platform supports international trade across all continents.',
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

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">
        {/* Header */}
        <div className="faq-header">
          <h2 style={{ background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Frequently Asked Questions</h2>
          <p>Find answers to common questions about CoreTradeGlobal</p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {FAQ_ITEMS.map((item) => (
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
  );
}

export default FAQSection;

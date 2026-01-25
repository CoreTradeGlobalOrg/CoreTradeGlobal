/**
 * FAQItem Component
 *
 * Single FAQ accordion item
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function FAQItem({ question, answer, isOpen = false, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(isOpen);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const expanded = onToggle ? isOpen : isExpanded;

  return (
    <div className="hp-faq-item">
      <button
        onClick={handleToggle}
        className="hp-faq-question w-full text-left"
      >
        <span className="pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-[var(--hp-gold)] transition-transform duration-300 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="hp-faq-answer">{answer}</div>
      </div>
    </div>
  );
}

export default FAQItem;

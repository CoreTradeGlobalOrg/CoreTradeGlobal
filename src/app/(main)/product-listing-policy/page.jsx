/**
 * Product Listing Policy Page
 *
 * CoreTradeGlobal Product Listing Policy
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

export default function ProductListingPolicyPage() {
  const router = useRouter();
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // Check if opened in new tab (no history to go back to)
    setIsNewTab(window.history.length <= 1 || document.referrer === '');
  }, []);

  const handleBack = () => {
    if (isNewTab) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back/Close Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-8 transition-colors group"
        >
          {isNewTab ? (
            <>
              <X className="w-5 h-5" />
              <span className="font-medium">Close</span>
            </>
          ) : (
            <>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back</span>
            </>
          )}
        </button>

        {/* Header */}
        <div className="glass-card p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h1
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Product Listing Policy
            </h1>
            <p className="text-[#A0A0A0]">
              Last updated: October 18, 2025
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="glass-card p-8 space-y-8">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">1. Purpose and Scope</h2>
            <p className="text-gray-300 mb-4">
              This Product Listing Policy ("Policy") governs all product and service listings posted on the CoreTradeGlobal.com platform ("the Platform").
            </p>
            <p className="text-gray-300 mb-4">
              It ensures that listings comply with applicable international, regional, and national laws across the United Kingdom (UK), European Union (EU), and United States (US).
            </p>
            <p className="text-gray-300">
              By posting or offering any product or service on CoreTradeGlobal, users ("sellers") agree to adhere to this Policy and to all relevant trade, consumer protection, and safety regulations.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">2. General Prohibitions</h2>
            <p className="text-gray-300 mb-4">
              Sellers may not list, advertise, or offer to sell any product or service that is illegal, restricted, or otherwise non-compliant under any applicable jurisdiction, including:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><span className="text-white font-medium">UK law:</span> Consumer Protection Act 1987, Product Safety and Metrology Regulations 2019, and UK REACH.</li>
              <li><span className="text-white font-medium">EU law:</span> REACH Regulation (EC) No 1907/2006, General Product Safety Regulation (EU) 2023/988.</li>
              <li><span className="text-white font-medium">U.S. law:</span> Consumer Product Safety Act (CPSC), FDA Regulations, Federal Trade Commission (FTC) Act.</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Sellers must ensure that their products meet all import, labeling, safety, and certification standards in every destination market where they are sold.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">3. Prohibited and Restricted Products</h2>
            <p className="text-gray-300 mb-4">
              The following categories of goods and services are strictly prohibited or restricted from being listed, advertised, or sold on the Platform:
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.1 Illegal or Hazardous Substances</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Narcotics, controlled drugs, synthetic cannabinoids, or analogues.</li>
              <li>Explosives, fireworks, or detonators.</li>
              <li>Radioactive materials, toxic substances, or banned chemicals under REACH/UK REACH.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.2 Counterfeit and Infringing Goods</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Counterfeit or trademark-infringing products (e.g., fake brand items, pirated software).</li>
              <li>Unauthorized replicas or use of protected logos, marks, or copyrighted material.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.3 Dangerous or Regulated Equipment</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Firearms, ammunition, military-grade or police weapons.</li>
              <li>Surveillance, hacking, or card-reading devices.</li>
              <li>Products requiring special licensing (e.g., medical devices, radio transmitters) without appropriate authorization.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.4 Financial or Government-Linked Items</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Securities, investments, or cryptocurrencies not licensed under local financial regulations.</li>
              <li>Government-issued IDs, permits, or official documents.</li>
              <li>Gambling services, lotteries, or sweepstakes.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.5 Adult or Morally Offensive Content</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Pornographic, obscene, or sexually explicit material.</li>
              <li>Listings exploiting minors or involving non-consensual acts.</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.6 Deceptive Digital or Virtual Products</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Virtual goods or "keys" without actual transferable value.</li>
              <li>Misleading or fraudulent listings, fake certificates, or manipulated product images.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">4. Compliance with Regional Product Regulations</h2>
            <p className="text-gray-300 mb-4">
              Sellers are responsible for ensuring full compliance with regional laws and standards before listing a product.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                <thead className="bg-[rgba(255,255,255,0.05)]">
                  <tr>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Region</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Applicable Standards / Requirements</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 text-sm">
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3 font-medium text-white">United Kingdom (UK)</td>
                    <td className="px-4 py-3">UKCA marking, UK REACH, Product Safety and Metrology Regulations 2019, Consumer Rights Act 2015, and Data Protection Act 2018.</td>
                  </tr>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3 font-medium text-white">European Union (EU/EEA)</td>
                    <td className="px-4 py-3">CE marking, REACH and RoHS compliance, Packaging and Waste Directive (94/62/EC), GDPR.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">United States (USA)</td>
                    <td className="px-4 py-3">CPSC safety standards, FDA labeling (for food, cosmetics, and medical devices), FTC truth-in-advertising, and state-level laws (e.g., California Proposition 65).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">5. Platform Rights and Enforcement</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">5.1 Enforcement Rights</h3>
            <p className="text-gray-300 mb-4">
              CoreTradeGlobal reserves the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Remove, restrict, or block any listing or account without prior notice.</li>
              <li>Suspend or permanently terminate users for violations.</li>
              <li>Notify or cooperate with competent authorities (e.g., UK Trading Standards, EU Market Surveillance, or U.S. Federal Agencies).</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">5.2 Listing Accuracy and Transparency</h3>
            <p className="text-gray-300 mb-4">
              Sellers must ensure that all listings:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Are lawful, accurate, and not misleading.</li>
              <li>Include correct specifications, country of origin, and compliance certificates.</li>
              <li>Display authentic, unaltered images of actual products.</li>
              <li>Accurately reflect price, quantity, and delivery details.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">6. Enforcement Actions</h2>
            <p className="text-gray-300 mb-4">
              Depending on the severity and recurrence of violations, CoreTradeGlobal may apply the following measures:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                <thead className="bg-[rgba(255,255,255,0.05)]">
                  <tr>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Violation Level</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Examples</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 text-sm">
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Level 1 – Minor</td>
                    <td className="px-4 py-3">Incomplete labeling, minor data error</td>
                    <td className="px-4 py-3">Warning or temporary delisting</td>
                  </tr>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Level 2 – Moderate</td>
                    <td className="px-4 py-3">Misleading content, repeated non-compliance</td>
                    <td className="px-4 py-3">Account suspension</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Level 3 – Severe</td>
                    <td className="px-4 py-3">Counterfeit, illegal, or dangerous products</td>
                    <td className="px-4 py-3">Permanent ban and regulatory referral</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-300 mt-4">
              A <span className="text-white font-medium">zero-tolerance policy</span> applies to counterfeit, fraudulent, and unsafe listings.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">7. Contact Information</h2>
            <p className="text-gray-300">
              For inquiries regarding listing compliance, please contact:{' '}
              <a href="mailto:info@coretradeglobal.com" className="text-[#FFD700] hover:underline">
                info@coretradeglobal.com
              </a>
            </p>
          </section>

          {/* Footer Note */}
          <div className="mt-8 p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl">
            <p className="text-sm text-gray-400">
              By listing products on CoreTradeGlobal, you acknowledge that you have read, understood, and agree to comply with this Product Listing Policy.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

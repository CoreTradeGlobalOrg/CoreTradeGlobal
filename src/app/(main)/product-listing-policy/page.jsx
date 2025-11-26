/**
 * Product Listing Policy Page
 *
 * CoreTradeGlobal Product Listing Policy
 */

'use client';

export default function ProductListingPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Product Listing Policy
          </h1>
          <p className="text-sm text-slate-500">
            Last updated: October 18, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 prose prose-slate max-w-none">

          <h2 className="text-2xl font-bold text-slate-900 mt-6 mb-4">1. Purpose and Scope</h2>
          <p className="text-slate-700 mb-4">
            This Product Listing Policy ("Policy") governs all product and service listings posted on the CoreTradeGlobal.com platform ("the Platform").
          </p>
          <p className="text-slate-700 mb-4">
            It ensures that listings comply with applicable international, regional, and national laws across the United Kingdom (UK), European Union (EU), and United States (US).
          </p>
          <p className="text-slate-700 mb-4">
            By posting or offering any product or service on CoreTradeGlobal, users ("sellers") agree to adhere to this Policy and to all relevant trade, consumer protection, and safety regulations.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. General Prohibitions</h2>
          <p className="text-slate-700 mb-4">
            Sellers may not list, advertise, or offer to sell any product or service that is illegal, restricted, or otherwise non-compliant under any applicable jurisdiction, including:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>UK law: Consumer Protection Act 1987, Product Safety and Metrology Regulations 2019, and UK REACH.</li>
            <li>EU law: REACH Regulation (EC) No 1907/2006, General Product Safety Regulation (EU) 2023/988.</li>
            <li>U.S. law: Consumer Product Safety Act (CPSC), FDA Regulations, Federal Trade Commission (FTC) Act.</li>
          </ul>
          <p className="text-slate-700 mb-4">
            Sellers must ensure that their products meet all import, labeling, safety, and certification standards in every destination market where they are sold.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Prohibited and Restricted Products</h2>
          <p className="text-slate-700 mb-4">
            The following categories of goods and services are strictly prohibited or restricted from being listed, advertised, or sold on the Platform:
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.1 Illegal or Hazardous Substances</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Narcotics, controlled drugs, synthetic cannabinoids, or analogues.</li>
            <li>Explosives, fireworks, or detonators.</li>
            <li>Radioactive materials, toxic substances, or banned chemicals under REACH/UK REACH.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.2 Counterfeit and Infringing Goods</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Counterfeit or trademark-infringing products (e.g., fake brand items, pirated software).</li>
            <li>Unauthorized replicas or use of protected logos, marks, or copyrighted material.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.3 Dangerous or Regulated Equipment</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Firearms, ammunition, military-grade or police weapons.</li>
            <li>Surveillance, hacking, or card-reading devices.</li>
            <li>Products requiring special licensing (e.g., medical devices, radio transmitters) without appropriate authorization.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.4 Financial or Government-Linked Items</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Securities, investments, or cryptocurrencies not licensed under local financial regulations.</li>
            <li>Government-issued IDs, permits, or official documents.</li>
            <li>Gambling services, lotteries, or sweepstakes.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.5 Adult or Morally Offensive Content</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Pornographic, obscene, or sexually explicit material.</li>
            <li>Listings exploiting minors or involving non-consensual acts.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.6 Deceptive Digital or Virtual Products</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Virtual goods or "keys" without actual transferable value.</li>
            <li>Misleading or fraudulent listings, fake certificates, or manipulated product images.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Compliance with Regional Product Regulations</h2>
          <p className="text-slate-700 mb-4">
            Sellers are responsible for ensuring full compliance with regional laws and standards before listing a product.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Region</th>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Applicable Standards / Requirements</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                <tr>
                  <td className="border border-slate-300 px-4 py-2 font-semibold">United Kingdom (UK)</td>
                  <td className="border border-slate-300 px-4 py-2">UKCA marking, UK REACH, Product Safety and Metrology Regulations 2019, Consumer Rights Act 2015, and Data Protection Act 2018.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2 font-semibold">European Union (EU/EEA)</td>
                  <td className="border border-slate-300 px-4 py-2">CE marking, REACH and RoHS compliance, Packaging and Waste Directive (94/62/EC), GDPR.</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2 font-semibold">United States (USA)</td>
                  <td className="border border-slate-300 px-4 py-2">CPSC safety standards, FDA labeling (for food, cosmetics, and medical devices), FTC truth-in-advertising, and state-level laws (e.g., California Proposition 65).</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Platform Rights and Enforcement</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.1 Enforcement Rights</h3>
          <p className="text-slate-700 mb-4">
            CoreTradeGlobal reserves the right to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Remove, restrict, or block any listing or account without prior notice.</li>
            <li>Suspend or permanently terminate users for violations.</li>
            <li>Notify or cooperate with competent authorities (e.g., UK Trading Standards, EU Market Surveillance, or U.S. Federal Agencies).</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.2 Listing Accuracy and Transparency</h3>
          <p className="text-slate-700 mb-4">
            Sellers must ensure that all listings:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Are lawful, accurate, and not misleading.</li>
            <li>Include correct specifications, country of origin, and compliance certificates.</li>
            <li>Display authentic, unaltered images of actual products.</li>
            <li>Accurately reflect price, quantity, and delivery details.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Enforcement Actions</h2>
          <p className="text-slate-700 mb-4">
            Depending on the severity and recurrence of violations, CoreTradeGlobal may apply the following measures:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Violation Level</th>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Examples</th>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Level 1 – Minor</td>
                  <td className="border border-slate-300 px-4 py-2">Incomplete labeling, minor data error</td>
                  <td className="border border-slate-300 px-4 py-2">Warning or temporary delisting</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Level 2 – Moderate</td>
                  <td className="border border-slate-300 px-4 py-2">Misleading content, repeated non-compliance</td>
                  <td className="border border-slate-300 px-4 py-2">Account suspension</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Level 3 – Severe</td>
                  <td className="border border-slate-300 px-4 py-2">Counterfeit, illegal, or dangerous products</td>
                  <td className="border border-slate-300 px-4 py-2">Permanent ban and regulatory referral</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-slate-700 mb-4">
            A <strong>zero-tolerance policy</strong> applies to counterfeit, fraudulent, and unsafe listings.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Contact Information</h2>
          <p className="text-slate-700 mb-4">
            For inquiries regarding listing compliance, please contact:{' '}
            <a href="mailto:info@coretradeglobal.com" className="text-blue-600 hover:underline">
              info@coretradeglobal.com
            </a>
          </p>

        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.close()}
            className="inline-flex items-center text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}

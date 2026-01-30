/**
 * SubmitQuoteDialog Component
 *
 * Professional B2B quotation form dialog for RFQ responses.
 * Uses react-hook-form for form management and Firebase for data storage.
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useSubmitQuote } from '@/presentation/hooks/request/useSubmitQuote';
import { Upload, Send, Loader2 } from 'lucide-react';

// Constants for select options
const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'TRY', label: 'TRY - Turkish Lira' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

const UNIT_TYPES = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 't', label: 'Tons (t)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'sqm', label: 'Square Meters (sqm)' },
  { value: 'L', label: 'Liters (L)' },
  { value: 'sets', label: 'Sets' },
  { value: 'pallets', label: 'Pallets' },
];

const INCOTERMS = [
  { value: 'EXW', label: 'EXW - Ex Works' },
  { value: 'FCA', label: 'FCA - Free Carrier' },
  { value: 'CPT', label: 'CPT - Carriage Paid To' },
  { value: 'CIP', label: 'CIP - Carriage & Insurance Paid' },
  { value: 'DAP', label: 'DAP - Delivered At Place' },
  { value: 'DPU', label: 'DPU - Delivered at Place Unloaded' },
  { value: 'DDP', label: 'DDP - Delivered Duty Paid' },
  { value: 'FAS', label: 'FAS - Free Alongside Ship' },
  { value: 'FOB', label: 'FOB - Free On Board' },
  { value: 'CFR', label: 'CFR - Cost and Freight' },
  { value: 'CIF', label: 'CIF - Cost, Insurance and Freight' },
];

const SHIPPING_METHODS = [
  { value: 'sea_fcl', label: 'Sea Freight (FCL)' },
  { value: 'sea_lcl', label: 'Sea Freight (LCL)' },
  { value: 'air', label: 'Air Freight' },
  { value: 'express', label: 'Express Courier (DHL/FedEx)' },
  { value: 'road', label: 'Road Transport' },
  { value: 'rail', label: 'Rail Freight' },
  { value: 'multimodal', label: 'Multimodal' },
];

const PAYMENT_TERMS = [
  { value: 'tt_100', label: 'T/T - 100% Advance' },
  { value: 'tt_30_70', label: 'T/T - 30% Deposit / 70% Balance' },
  { value: 'lc', label: 'L/C - Irrevocable Letter of Credit' },
  { value: 'dp', label: 'D/P - Documents Against Payment' },
  { value: 'cad', label: 'CAD - Cash Against Documents' },
  { value: 'oa', label: 'OA - Open Account (30/60 Days)' },
  { value: 'escrow', label: 'Escrow Service' },
];

const WARRANTY_OPTIONS = [
  { value: 'none', label: 'No Warranty' },
  { value: '6_months', label: '6 Months' },
  { value: '12_months', label: '12 Months' },
  { value: '24_months', label: '24 Months' },
  { value: 'lifetime', label: 'Lifetime (Limited)' },
];

// Input class with white placeholder
const inputClass = "w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-3.5 rounded-xl text-white text-sm outline-none transition-all focus:border-[#3b82f6] focus:bg-[rgba(15,27,43,0.9)] focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-white/70";

// Label class with silver gradient effect
const labelClass = "block text-xs font-semibold tracking-wider uppercase mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent";

// Select class with padding for arrow
const selectClass = "w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] p-3.5 pr-10 rounded-xl text-white text-sm outline-none transition-all focus:border-[#3b82f6] focus:bg-[rgba(15,27,43,0.9)] appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2224%22%20height%3d%2224%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22white%22%20stroke-width%3d%222%22%20stroke-linecap%3d%22round%22%20stroke-linejoin%3d%22round%22%3e%3cpolyline%20points%3d%226%209%2012%2015%2018%209%22%3e%3c%2fpolyline%3e%3c%2fsvg%3e')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat";

export function SubmitQuoteDialog({ isOpen, onClose, request }) {
  const { user } = useAuth();
  const { submitQuote, loading } = useSubmitQuote();
  const [attachments, setAttachments] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      unitPrice: '',
      currency: 'USD',
      unitType: 'pcs',
      incoterms: 'FOB',
      shippingMethod: 'sea_fcl',
      portOfLoading: '',
      leadTime: '',
      moq: '',
      supplyCapacity: '',
      paymentTerms: 'tt_30_70',
      warranty: '12_months',
      priceValidUntil: '',
      specifications: '',
    },
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    // Limit to 5 files, max 10MB each
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024).slice(0, 5);
    setAttachments(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    try {
      await submitQuote({
        requestId: request.id,
        quoteData: {
          ...data,
          unitPrice: parseFloat(data.unitPrice),
          moq: data.moq ? parseInt(data.moq) : null,
        },
        attachments,
        userId: user.uid,
        userInfo: {
          displayName: user.displayName,
          companyName: user.companyName,
          email: user.email,
        },
      });

      reset();
      setAttachments([]);
      onClose();
    } catch (error) {
      console.error('Quote submission error:', error);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" className="max-w-4xl" hideHeader={true} transparentBackdrop={true}>
      <div className="space-y-6">
        {/* RFQ Summary Card - Blue Theme */}
        <div className="glass-card p-6 border-[#3b82f6]/30 hover:border-[#3b82f6]/50 transition-colors relative">
          {/* Close Button - Top Right of Card */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.2)] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="inline-block bg-[rgba(59,130,246,0.15)] text-[#60a5fa] px-3 py-1.5 rounded-lg text-xs font-bold mb-3 border border-[#3b82f6]/30">
            RFQ: {request.id?.substring(0, 8).toUpperCase() || 'N/A'}
          </span>
          <h2 className="text-2xl font-bold text-white mb-2">
            {request.productName || request.title}
          </h2>
          <p className="text-[#94a3b8] text-sm mb-4 line-clamp-2 overflow-hidden">
            {request.description || 'No description provided.'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
            <div>
              <span className="block text-[11px] text-[#94a3b8] uppercase mb-1">Target Qty</span>
              <strong className="text-white">{request.quantity} {request.unit}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-[#94a3b8] uppercase mb-1">Destination</span>
              <strong className="text-white">{request.targetCountry || request.country || 'Global'}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-[#94a3b8] uppercase mb-1">Required Date</span>
              <strong className="text-white">{request.deadline || 'Flexible'}</strong>
            </div>
            <div>
              <span className="block text-[11px] text-[#94a3b8] uppercase mb-1">Budget</span>
              <strong className="text-white">{request.budget || 'Negotiable'}</strong>
            </div>
          </div>
        </div>

        {/* Quotation Form */}
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-6 pb-3 border-b-2 border-[#3b82f6] inline-block">
            Submit Your Final Proposal
          </h3>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Unit Price */}
              <div>
                <label className={labelClass}>
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('unitPrice', { required: 'Unit price is required', min: { value: 0.01, message: 'Price must be greater than 0' } })}
                  className={inputClass}
                />
                {errors.unitPrice && <p className="mt-1 text-xs text-red-500">{errors.unitPrice.message}</p>}
              </div>

              {/* Currency */}
              <div>
                <label className={labelClass}>
                  Currency
                </label>
                <select {...register('currency')} className={selectClass}>
                  {CURRENCIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Unit Type */}
              <div>
                <label className={labelClass}>
                  Unit Type
                </label>
                <select {...register('unitType')} className={selectClass}>
                  {UNIT_TYPES.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              {/* Incoterms */}
              <div>
                <label className={labelClass}>
                  Incoterms 2020
                </label>
                <select {...register('incoterms')} className={selectClass}>
                  {INCOTERMS.map(i => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>

              {/* Shipping Method */}
              <div>
                <label className={labelClass}>
                  Shipping Method
                </label>
                <select {...register('shippingMethod')} className={selectClass}>
                  {SHIPPING_METHODS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Port of Loading */}
              <div>
                <label className={labelClass}>
                  Port of Loading
                </label>
                <input
                  type="text"
                  placeholder="e.g. Istanbul, Shanghai..."
                  {...register('portOfLoading')}
                  className={inputClass}
                />
              </div>

              {/* Lead Time */}
              <div>
                <label className={labelClass}>
                  Lead Time (Production)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15-20 Days"
                  {...register('leadTime')}
                  className={inputClass}
                />
              </div>

              {/* MOQ */}
              <div>
                <label className={labelClass}>
                  Min. Order Quantity (MOQ)
                </label>
                <input
                  type="number"
                  placeholder="Min amount"
                  {...register('moq')}
                  className={inputClass}
                />
              </div>

              {/* Supply Capacity */}
              <div>
                <label className={labelClass}>
                  Supply Capacity / Month
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10,000 pcs/mo"
                  {...register('supplyCapacity')}
                  className={inputClass}
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className={labelClass}>
                  Payment Terms
                </label>
                <select {...register('paymentTerms')} className={selectClass}>
                  {PAYMENT_TERMS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Warranty */}
              <div>
                <label className={labelClass}>
                  Product Warranty
                </label>
                <select {...register('warranty')} className={selectClass}>
                  {WARRANTY_OPTIONS.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>

              {/* Price Validity */}
              <div>
                <label className={labelClass}>
                  Price Validity Until
                </label>
                <input
                  type="date"
                  {...register('priceValidUntil')}
                  className={inputClass}
                />
              </div>

              {/* Specifications - Full Width */}
              <div className="md:col-span-3">
                <label className={labelClass}>
                  Technical Specifications & Competitive Advantages
                </label>
                <textarea
                  rows={4}
                  placeholder="Mention ISO/CE certifications, material grades, packaging details (e.g. seaworthy wooden boxes), and why the buyer should choose you..."
                  {...register('specifications')}
                  className={`${inputClass} resize-none`}
                />
                <span className="block mt-2 text-white font-semibold text-sm">
                  Highlight your unique selling points to stand out
                </span>
              </div>

              {/* Attachments - Full Width - Blue Theme */}
              <div className="md:col-span-3">
                <label className={labelClass}>
                  Attachments (Certificates, Technical Drawings, Catalog)
                </label>
                <div className="relative border-2 border-dashed border-[#3b82f6]/50 rounded-xl p-6 text-center hover:border-[#3b82f6] transition-all bg-[rgba(59,130,246,0.05)]">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
                      <Upload size={24} className="text-[#3b82f6]" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">Drop files here or click to upload</p>
                      <p className="text-[#94a3b8] text-sm mt-1">PDF, DOC, XLS, JPG, PNG (Max 5 files, 10MB each)</p>
                    </div>
                  </div>
                </div>

                {/* Attachment Preview */}
                {attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-[rgba(59,130,246,0.1)] px-3 py-2 rounded-lg border border-[#3b82f6]/30"
                      >
                        <Upload size={14} className="text-[#3b82f6]" />
                        <span className="text-sm text-white truncate max-w-[150px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-400 hover:text-red-300 ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button - Blue Theme */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-5 bg-[#3b82f6] text-white font-extrabold text-lg uppercase tracking-wider rounded-full border-none cursor-pointer transition-all hover:bg-[#60a5fa] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={22} />
                  Transmit Offer to Buyer
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default SubmitQuoteDialog;

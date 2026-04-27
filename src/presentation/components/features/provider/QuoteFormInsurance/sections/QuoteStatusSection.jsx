/**
 * QuoteStatusSection
 *
 * Renders the quote status and communication section:
 * - Indicative/Firm toggle (radio cards, Indicative default)
 * - Binding Conditions textarea (only shown when Firm is selected, animated)
 * - Message to Buyer textarea (always shown)
 *
 * Field prefix: quoteStatus.*
 * Props: { register, errors, watch }
 */

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { QUOTE_BINDING_STATUS } from '@/core/constants/quoteConstants';

// ─────────────────────────────────────────────────────────────────────────────
// QuoteStatusSection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QuoteStatusSection
 *
 * @param {{ register: Function, errors: Object, watch: Function }} props
 */
export function QuoteStatusSection({ register, errors, watch }) {
  const currentStatus = watch('quoteStatus.status');
  const isFirm = currentStatus === QUOTE_BINDING_STATUS.FIRM;

  return (
    <div className="border-t border-[#2A3B52] pt-4 mt-4">
      <h4 className="text-sm font-semibold text-white mb-3">Quote Status &amp; Communication</h4>

      {/* Indicative / Firm toggle — radio cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Indicative card */}
        <label
          className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-colors ${
            !isFirm
              ? 'border-amber-500/50 bg-amber-900/10'
              : 'border-[#2A3B52] bg-[#0F1C2E] hover:border-[#3A4B62]'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="radio"
              value={QUOTE_BINDING_STATUS.INDICATIVE}
              {...register('quoteStatus.status')}
              className="accent-amber-400"
            />
            <span className={`text-sm font-semibold ${!isFirm ? 'text-amber-300' : 'text-white'}`}>
              Indicative
            </span>
          </div>
          <p className="text-xs text-[#8899AA] leading-relaxed pl-5">
            Your quote is for informational purposes. Terms may change upon formal review.
          </p>
        </label>

        {/* Firm card */}
        <label
          className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-colors ${
            isFirm
              ? 'border-green-500/50 bg-green-900/10'
              : 'border-[#2A3B52] bg-[#0F1C2E] hover:border-[#3A4B62]'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="radio"
              value={QUOTE_BINDING_STATUS.FIRM}
              {...register('quoteStatus.status')}
              className="accent-green-400"
            />
            <span className={`text-sm font-semibold ${isFirm ? 'text-green-300' : 'text-white'}`}>
              Firm
            </span>
          </div>
          <p className="text-xs text-[#8899AA] leading-relaxed pl-5">
            Your quote is legally binding under the specified conditions.
          </p>
        </label>
      </div>

      {errors?.quoteStatus?.status && (
        <p className="text-xs text-red-400 mt-1 mb-3">
          {errors.quoteStatus.status.message}
        </p>
      )}

      {/* Binding Conditions — only shown when Firm selected */}
      <AnimatePresence>
        {isFirm && (
          <motion.div
            key="binding-conditions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <label className="block text-xs text-[#8899AA] mb-1">
              Binding Conditions (optional)
            </label>
            <textarea
              {...register('quoteStatus.bindingConditions')}
              rows={3}
              placeholder="Specify conditions under which this quote is binding..."
              className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
            />
            {errors?.quoteStatus?.bindingConditions && (
              <p className="text-xs text-red-400 mt-1">
                {errors.quoteStatus.bindingConditions.message}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message to Buyer — always shown */}
      <div>
        <label className="block text-xs text-[#8899AA] mb-1">
          Message to Buyer (optional)
        </label>
        <textarea
          {...register('quoteStatus.messageToBuyer')}
          rows={3}
          placeholder="Any message or context for the buyer..."
          className="w-full bg-[#0F1C2E] border border-[#2A3B52] rounded-lg px-3 py-2 text-sm text-white placeholder-[#4A5B6E] focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
        />
        {errors?.quoteStatus?.messageToBuyer && (
          <p className="text-xs text-red-400 mt-1">
            {errors.quoteStatus.messageToBuyer.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default QuoteStatusSection;

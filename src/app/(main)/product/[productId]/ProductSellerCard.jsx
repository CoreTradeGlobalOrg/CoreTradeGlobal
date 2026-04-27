'use client';

import { memo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RestrictedCard } from '@/presentation/components/common/RestrictedCard/RestrictedCard';

const SellerAvatar = memo(function SellerAvatar({ src, alt }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!src || error) return <User className="w-8 h-8" />;

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A283B]">
          <div className="w-4 h-4 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src} alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </>
  );
});

/**
 * ProductSellerCard - Seller info with contact/profile buttons.
 */
export function ProductSellerCard({ seller, sendingMessage, onSendMessage }) {
  const router = useRouter();

  if (!seller) return null;

  return (
    <RestrictedCard>
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-[#1A283B] to-[#0F1B2B] border border-white/10 flex items-center justify-center text-[#FFD700] shadow-lg overflow-hidden relative">
              <SellerAvatar
                src={seller.companyLogo || seller.photoURL || seller.logoURL || seller.image || seller.avatar}
                alt={seller.companyName || seller.displayName}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Seller</div>
              <div className="font-bold text-xl text-white">{seller.companyName || seller.displayName || 'Unknown Seller'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full">
            <Button
              onClick={onSendMessage}
              disabled={sendingMessage}
              className="flex-1 basis-1/2 px-3 py-3 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] !text-black hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {sendingMessage ? (
                <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span> Opening...</>
              ) : (
                <><MessageCircle className="w-4 h-4" /> Contact Seller</>
              )}
            </Button>
            <Button
              onClick={() => router.push(`/profile/${seller.id}`)}
              className="flex-1 basis-1/2 px-3 py-3 rounded-full border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 hover:text-white transition-all font-semibold text-sm flex items-center justify-center whitespace-nowrap"
            >
              View Profile
            </Button>
          </div>
        </div>
      </div>
    </RestrictedCard>
  );
}

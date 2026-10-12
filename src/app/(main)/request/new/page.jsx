/**
 * Add Request Page
 *
 * URL: /request/new
 * Standalone replacement for the former "Create Request" modal. Signed-in
 * members create the RFQ directly. Signed-out visitors fill the same form
 * plus their email; createGuestRFQ stores it as pending and emails a link
 * that publishes it (see /email-link).
 */

'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { Mail } from 'lucide-react';
import { getFunctionsInstance } from '@/core/config/firebase.config';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { FormPageShell } from '@/presentation/components/common/FormPageShell/FormPageShell';

function NewRequestPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, isAuthenticated } = useAuth();
  const { createRequest } = useCreateRequest();

  // Zero-result product search → "Post an RFQ for '{query}'" CTA links
  // here with ?title={query}. Seed the form's productName field so the
  // user lands on a partly-filled RFQ instead of a blank one.
  const prefillTitle = (searchParams.get('title') || '').slice(0, 200);

  // Misafir gönderiminden sonra "e-postanı kontrol et" ekranı
  const [guestSentTo, setGuestSentTo] = useState(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const handleGuestSubmit = async ({ email, website, ...fields }) => {
      try {
        await httpsCallable(getFunctionsInstance(), 'createGuestRFQ')({
          email,
          website,
          rfq: {
            productName: fields.productName,
            categoryId: fields.categoryId,
            targetCountry: fields.targetCountry,
            quantity: fields.quantity,
            unit: fields.unit,
            unitCategory: fields.unitCategory,
            description: fields.description,
            budget: fields.budget,
          },
        });
        // /email-link aynı cihazda e-postayı tekrar sormasın
        try { localStorage.setItem('emailForSignIn', email.trim().toLowerCase()); } catch { /* storage kapalı */ }
        setGuestSentTo(email.trim());
      } catch (err) {
        // RequestForm hatayı toast olarak gösteriyor
        throw new Error(err?.message || 'Could not submit your request. Please try again.');
      }
    };

    if (guestSentTo) {
      return (
        <FormPageShell title="Check your inbox" onBack={() => router.push('/')} backLabel="Home">
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 bg-[rgba(16,185,129,0.15)] rounded-full flex items-center justify-center mx-auto border border-[rgba(16,185,129,0.3)]">
              <Mail className="w-8 h-8 text-[#34d399]" />
            </div>
            <p className="text-white text-lg font-semibold">One more step to publish your RFQ</p>
            <p className="text-[#A0A0A0] text-sm max-w-md mx-auto">
              We sent a confirmation link to <span className="text-[#FFD700]">{guestSentTo}</span>.
              Click it and your request goes live right away.
            </p>
            <p className="text-xs text-[#A0A0A0]">
              Didn&apos;t get it? Check your spam folder. Already have an account?{' '}
              <Link href="/login?redirect=/request/new" className="text-[#FFD700] hover:text-white">Log in</Link>
            </p>
          </div>
        </FormPageShell>
      );
    }

    return (
      <FormPageShell title="Post a Request for Quotation" onBack={() => router.back()} backLabel="Back">
        <p className="text-sm text-[#A0A0A0] mb-6">
          No account needed. Describe what you are looking for and suppliers will send you quotes.{' '}
          Already a member? <Link href="/login?redirect=/request/new" className="text-[#FFD700] hover:text-white">Log in</Link>
        </p>
        <RequestForm
          guestMode
          onSubmit={handleGuestSubmit}
          onCancel={() => router.back()}
          request={prefillTitle ? { productName: prefillTitle } : undefined}
        />
      </FormPageShell>
    );
  }

  const handleSubmit = async (data) => {
    try {
      await createRequest(data);
      toast.success('Request created!');
      router.push('/');
    } catch {
      /* hook surfaces the error */
    }
  };

  return (
    <FormPageShell title="Create New Request" onBack={() => router.back()} backLabel="Back">
      <RequestForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        userId={user.uid}
        request={prefillTitle ? { productName: prefillTitle } : undefined}
      />
    </FormPageShell>
  );
}

// Wrapper adds the Suspense boundary Next.js requires around
// useSearchParams so the page keeps its `'use client'` semantics
// without triggering the CSR-bailout warning during static analysis.
export default function NewRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#A0A0A0] text-sm">Loading...</p>
      </div>
    }>
      <NewRequestPageInner />
    </Suspense>
  );
}

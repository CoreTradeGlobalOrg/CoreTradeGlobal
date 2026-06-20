/**
 * ConnectedAccountsCard
 *
 * Shown on the user's OWN profile. Lets them connect/disconnect sign-in methods:
 * - Google: real Firebase account linking (linkWithPopup / unlink).
 * - LinkedIn: metadata link via our OAuth flow (custom-token based, not a Firebase
 *   provider) — stores connection info on the user doc; disconnect clears it.
 *
 * A last-method guard prevents removing the only way to sign in.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link2, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '@/core/config/firebase.config';
import { container } from '@/core/di/container';
import { useAuth } from '@/presentation/contexts/AuthContext';

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-5 h-5 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export function ConnectedAccountsCard({ user }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [googleLinked, setGoogleLinked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [busy, setBusy] = useState(null); // 'google' | 'linkedin' | null

  const linkedinConnected = user?.linkedinConnected === true;
  const linkedinName = user?.linkedinName || '';

  const syncProviders = useCallback(() => {
    const pd = auth.currentUser?.providerData || [];
    setGoogleLinked(pd.some((p) => p.providerId === 'google.com'));
    setHasPassword(pd.some((p) => p.providerId === 'password'));
  }, []);

  useEffect(() => {
    syncProviders();
  }, [syncProviders]);

  // Surface the result of the LinkedIn connect redirect, then clean the URL.
  useEffect(() => {
    const status = searchParams.get('linkedin');
    if (!status) return;
    if (status === 'connected') toast.success('LinkedIn connected!');
    else if (status === 'error') toast.error('Could not connect LinkedIn. Please try again.');
    router.replace(window.location.pathname);
  }, [searchParams, router]);

  // Count remaining sign-in methods if a given one is removed.
  const signInMethodsAfterRemoving = (removing) => {
    let count = 0;
    if (googleLinked && removing !== 'google') count += 1;
    if (hasPassword) count += 1; // password can't be removed here
    if (linkedinConnected && removing !== 'linkedin') count += 1;
    return count;
  };

  const handleConnectGoogle = async () => {
    setBusy('google');
    try {
      const authRepo = container.getAuthRepository();
      await authRepo.linkGoogle();
      syncProviders();
      await refreshUser();
      toast.success('Google connected!');
    } catch (err) {
      const code = err?.code;
      if (code === 'auth/credential-already-in-use') {
        toast.error('This Google account is already linked to another user.');
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // user dismissed — no toast
      } else {
        console.error('[ConnectedAccounts] link google failed:', err);
        toast.error('Could not connect Google. Please try again.');
      }
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (signInMethodsAfterRemoving('google') < 1) {
      toast.error('You must keep at least one sign-in method.');
      return;
    }
    setBusy('google');
    try {
      const authRepo = container.getAuthRepository();
      await authRepo.unlinkProvider('google.com');
      syncProviders();
      await refreshUser();
      toast.success('Google disconnected.');
    } catch (err) {
      console.error('[ConnectedAccounts] unlink google failed:', err);
      toast.error('Could not disconnect Google. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleConnectLinkedIn = () => {
    const dest = encodeURIComponent(`/profile/${user.uid}`);
    window.location.href = `/api/auth/linkedin/start?mode=connect&redirect=${dest}`;
  };

  const handleDisconnectLinkedIn = async () => {
    if (signInMethodsAfterRemoving('linkedin') < 1) {
      toast.error('You must keep at least one sign-in method.');
      return;
    }
    setBusy('linkedin');
    try {
      const userRepo = container.getUserRepository();
      await userRepo.update(user.uid, {
        linkedinConnected: false,
        linkedinName: null,
        linkedinMemberId: null,
        linkedinPicture: null,
        updatedAt: new Date(),
      });
      await refreshUser();
      toast.success('LinkedIn disconnected.');
    } catch (err) {
      console.error('[ConnectedAccounts] disconnect linkedin failed:', err);
      toast.error('Could not disconnect LinkedIn. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ icon, label, status, connected, onConnect, onDisconnect, loading }) => (
    <div className="flex items-center justify-between gap-3 bg-[rgba(255,255,255,0.04)] rounded-2xl p-4 border border-[rgba(255,255,255,0.05)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className={`text-xs truncate ${connected ? 'text-green-400' : 'text-[#A0A0A0]'}`}>
            {connected ? (
              <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> {status}</span>
            ) : 'Not connected'}
          </p>
        </div>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin flex-shrink-0" />
      ) : connected ? (
        <button
          type="button"
          onClick={onDisconnect}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="w-1 h-5 bg-[#FFD700] rounded-full" />
        <h3 className="text-base font-bold text-white inline-flex items-center gap-2">
          <Link2 className="w-4 h-4 text-[#FFD700]" /> Connected Accounts
        </h3>
      </div>

      <div className="space-y-3">
        <Row
          icon={<GoogleIcon />}
          label="Google"
          status={`Connected${auth.currentUser?.email ? ` · ${auth.currentUser.email}` : ''}`}
          connected={googleLinked}
          onConnect={handleConnectGoogle}
          onDisconnect={handleDisconnectGoogle}
          loading={busy === 'google'}
        />
        <Row
          icon={<LinkedInIcon />}
          label="LinkedIn"
          status={linkedinName ? `Connected · ${linkedinName}` : 'Connected'}
          connected={linkedinConnected}
          onConnect={handleConnectLinkedIn}
          onDisconnect={handleDisconnectLinkedIn}
          loading={busy === 'linkedin'}
        />
      </div>

      <p className="text-[11px] text-[#64748b] mt-4">
        Connect accounts to sign in faster. You can also add your public LinkedIn URL in your profile details above.
      </p>
    </div>
  );
}

export default ConnectedAccountsCard;

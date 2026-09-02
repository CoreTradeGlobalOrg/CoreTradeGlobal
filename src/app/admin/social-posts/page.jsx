/**
 * Admin — Social Posts
 *
 * URL: /admin/social-posts
 * Auth: admin role only.
 *
 * Grid of pending / approved / published / rejected social post
 * previews. Each card lets the admin download the product photo,
 * copy the caption + hashtags, and mark the post as approved /
 * rejected / published — publishing is manual (no Meta Graph API
 * wire-up), so the admin actually goes to LinkedIn / Facebook /
 * WhatsApp and posts by hand, then flips the status here so the
 * queue stays honest.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  orderBy,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, getFunctionsInstance } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';

const TABS = [
  { id: 'pending', label: 'Pending', icon: Clock, color: '#FFD700' },
  { id: 'approved', label: 'Approved', icon: CheckCircle2, color: '#3B82F6' },
  { id: 'published', label: 'Published', icon: Send, color: '#10B981' },
  { id: 'rejected', label: 'Rejected', icon: XCircle, color: '#EF4444' },
  { id: 'rate_limited', label: 'Rate-Limited', icon: ShieldAlert, color: '#F59E0B' },
];

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(row) {
  const { price, currency, unit } = row.productSnapshot || {};
  if (price == null || !currency) return null;
  return `${price} ${currency}${unit ? ` / ${unit}` : ''}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch {}
    document.body.removeChild(ta);
    return true;
  }
}

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch (err) {
    // Some CORS-locked hosts (older Firebase Storage URLs) block the
    // fetch. Fall back to opening the raw URL — admin can Save-As.
    window.open(url, '_blank', 'noopener');
    console.warn('downloadImage: opened in tab (fetch blocked):', err.message);
    return false;
  }
}

export default function SocialPostsPage() {
  const router = useRouter();
  const { user, loading: authLoading, profileLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState(() => new Set());

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!isAuthenticated) router.replace('/login?redirect=/admin/social-posts');
      else if (user?.role !== 'admin') router.replace('/');
    }
  }, [authLoading, profileLoading, isAuthenticated, user, router]);

  // Live subscription per active tab — Firestore composite index
  // status + createdAt DESC lets us page + stay fresh without polling.
  useEffect(() => {
    if (authLoading || profileLoading || user?.role !== 'admin') return;
    setLoading(true);
    const q = query(
      collection(db, 'socialPosts'),
      where('status', '==', activeTab),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(list);
        setLoading(false);
      },
      (err) => {
        console.error('socialPosts snapshot error:', err);
        toast.error('Failed to load posts.');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [activeTab, authLoading, profileLoading, user?.role]);

  const runAction = useCallback(async (postId, action, reason) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    try {
      const callable = httpsCallable(getFunctionsInstance(), 'updateSocialPostStatus');
      const res = await callable({ postId, action, reason });
      if (!res.data?.ok) throw new Error('server rejected');
      toast.success(
        action === 'approve'
          ? 'Approved.'
          : action === 'reject'
            ? 'Rejected.'
            : 'Marked as published.',
      );
    } catch (err) {
      console.error('updateSocialPostStatus failed:', err);
      toast.error(err?.message || 'Action failed.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, []);

  const handleCopy = useCallback(async (row) => {
    const body = row.content?.caption || '';
    const tags = (row.content?.hashtags || []).join(' ');
    const full = tags ? `${body}\n\n${tags}` : body;
    const ok = await copyToClipboard(full);
    if (ok) toast.success('Caption copied.');
    else toast.error('Copy failed — select text manually.');
  }, []);

  const handleDownload = useCallback(async (row) => {
    const url = row.productSnapshot?.imageUrl;
    if (!url) {
      toast.error('No image on this post.');
      return;
    }
    const cleanName = (row.productSnapshot?.name || 'product')
      .replace(/[^\w-]+/g, '_')
      .toLowerCase()
      .slice(0, 60);
    await downloadImage(url, `${cleanName}.jpg`);
  }, []);

  const handleReject = useCallback(async (postId) => {
    const reason = window.prompt('Reject reason (optional):') || '';
    await runAction(postId, 'reject', reason);
  }, [runAction]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1B2B]">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || user?.role !== 'admin') return null;

  return (
    <main className="min-h-screen bg-[#0F1B2B] text-white pt-[calc(var(--navbar-height)+16px)]">
      <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6 md:py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm no-underline mb-2"
              style={{ color: '#A0A0A0' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Admin dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Social Posts</h1>
            <p className="text-sm text-[#A0A0A0]">
              Auto-generated captions for LinkedIn, Facebook, and WhatsApp. Download the image,
              copy the caption, publish manually, then mark as published.
            </p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.06)] mb-5 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  active ? 'text-white' : 'text-[#A0A0A0] hover:text-white border-transparent',
                ].join(' ')}
                style={active ? { borderColor: tab.color } : {}}
              >
                <Icon className="w-4 h-4" style={{ color: active ? tab.color : '#A0A0A0' }} />
                {tab.label}
                {active && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: tab.color, background: `${tab.color}15` }}
                  >
                    {rows.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-12 text-center">
            <p className="text-[#A0A0A0]">
              No posts in this bucket. New products create pending posts automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rows.map((row) => (
              <SocialPostCard
                key={row.id}
                row={row}
                busy={busyIds.has(row.id)}
                activeTab={activeTab}
                onApprove={() => runAction(row.id, 'approve')}
                onReject={() => handleReject(row.id)}
                onPublish={() => runAction(row.id, 'publish')}
                onCopy={() => handleCopy(row)}
                onDownload={() => handleDownload(row)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SocialPostCard({ row, busy, activeTab, onApprove, onReject, onPublish, onCopy, onDownload }) {
  const [expanded, setExpanded] = useState(false);
  const snap = row.productSnapshot || {};
  const caption = row.content?.caption || '';
  const hashtags = row.content?.hashtags || [];
  const priceStr = formatPrice(row);
  const ctaUrl = row.content?.ctaUrl;

  const canApprove = activeTab === 'pending' || activeTab === 'rate_limited';
  const canReject = activeTab === 'pending' || activeTab === 'approved' || activeTab === 'rate_limited';
  const canPublish = activeTab === 'approved';

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] overflow-hidden flex flex-col">
      {snap.imageUrl ? (
        <div className="relative aspect-video bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={snap.imageUrl}
            alt={snap.name || 'product'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-video bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-xs text-[#606060]">
          No image
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-white leading-tight">
              {snap.name || '(no name)'}
            </h3>
            {ctaUrl && (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A0A0A0] hover:text-[#FFD700] flex-shrink-0"
                aria-label="Open product page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-[11px] text-[#A0A0A0] mt-0.5">
            {snap.companyName || '—'}
            {snap.country ? ` · ${snap.country}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-[#606060] flex-wrap">
            {snap.categoryLabel && (
              <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
                {snap.categoryLabel}
              </span>
            )}
            {priceStr && (
              <span className="text-white/70 tabular-nums">{priceStr}</span>
            )}
            <span className="ml-auto">{formatDate(row.createdAt)}</span>
          </div>
        </div>

        {/* Caption */}
        <div className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-white/5 p-2.5">
          <pre
            className={[
              'text-[11px] text-[#c8d3e0] whitespace-pre-wrap font-sans leading-snug',
              expanded ? '' : 'line-clamp-4',
            ].join(' ')}
          >
            {caption}
          </pre>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-[#A0A0A0] hover:text-white"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-[#FFD700] px-1.5 py-0.5 rounded border border-[#FFD700]/30 bg-[#FFD700]/5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white transition-colors disabled:opacity-40"
          >
            <Copy className="w-3 h-3" />
            Copy caption
          </button>

          <div className="w-full h-0.5" />

          {canApprove && (
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Approve
            </button>
          )}
          {canPublish && (
            <button
              type="button"
              onClick={onPublish}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Mark published
            </button>
          )}
          {canReject && (
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

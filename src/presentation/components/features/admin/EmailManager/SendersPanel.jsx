'use client';

/**
 * SendersPanel
 *
 * Admin-managed list of addresses emails may be sent from (`emailSenders`).
 * Firestore rules only accept @coretradeglobal.com addresses and the
 * sendAdminTestEmail function re-checks the domain before sending.
 *
 * "Send test" sends a short email from the sender to the current admin; the
 * function stamps verifiedAt on success or stores lastTestError on failure,
 * and the list updates through the snapshot listener in EmailManager.
 */

import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, CircleDashed, Send, Pencil, Trash2, Plus } from 'lucide-react';
import { db, getFunctionsInstance } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';

const SENDER_ADDRESS_RE = /^[a-z0-9._%+-]+@coretradeglobal\.com$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The three addresses agreed on 2026-11-18; offered as a one-click setup when the list is empty.
const STANDARD_SENDERS = [
  { address: 'noreply@coretradeglobal.com', displayName: 'CoreTradeGlobal', replyTo: 'contact@coretradeglobal.com' },
  { address: 'info@coretradeglobal.com', displayName: 'CoreTradeGlobal', replyTo: '' },
  { address: 'contact@coretradeglobal.com', displayName: 'CoreTradeGlobal', replyTo: '' },
];

const EMPTY_FORM = { address: '', displayName: 'CoreTradeGlobal', replyTo: '', active: true };

const inputClass =
  'w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#FFD700]/50 transition-colors disabled:opacity-50';
const labelClass = 'block text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-1.5';

function formatDate(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SenderStatus({ sender }) {
  if (sender.lastTestError) {
    return (
      <span className="inline-flex items-start gap-1.5 text-xs text-red-400" title={sender.lastTestError}>
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span className="line-clamp-2 break-all">Last test failed: {sender.lastTestError}</span>
      </span>
    );
  }
  if (sender.verifiedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Verified {formatDate(sender.verifiedAt)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0]">
      <CircleDashed className="w-3.5 h-3.5" />
      Not tested
    </span>
  );
}

export function SendersPanel({ senders, loading }) {
  const { user } = useAuth();
  const [form, setForm] = useState(null); // null = closed; { id?, ...fields }
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);

  function openNew() {
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(sender) {
    setForm({
      id: sender.id,
      address: sender.address || '',
      displayName: sender.displayName || '',
      replyTo: sender.replyTo || '',
      active: sender.active !== false,
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    const address = form.address.trim().toLowerCase();
    const replyTo = form.replyTo.trim().toLowerCase();

    if (!SENDER_ADDRESS_RE.test(address)) {
      toast.error('Sender must be an @coretradeglobal.com address.');
      return;
    }
    if (replyTo && !EMAIL_RE.test(replyTo)) {
      toast.error('Reply-to is not a valid email address.');
      return;
    }
    if (senders.some((s) => s.address === address && s.id !== form.id)) {
      toast.error(`${address} is already in the list.`);
      return;
    }

    const fields = {
      address,
      displayName: form.displayName.trim(),
      replyTo,
      active: form.active,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    };

    setSaving(true);
    try {
      if (form.id) {
        const previous = senders.find((s) => s.id === form.id);
        // A new address has not been tested yet.
        if (previous && previous.address !== address) {
          fields.verifiedAt = null;
          fields.lastTestError = null;
        }
        await updateDoc(doc(db, 'emailSenders', form.id), fields);
      } else {
        await addDoc(collection(db, 'emailSenders'), {
          ...fields,
          verifiedAt: null,
          lastTestError: null,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
        });
      }
      toast.success('Sender saved.');
      setForm(null);
    } catch (err) {
      console.error('SendersPanel: save error:', err);
      toast.error(err?.message || 'Failed to save sender.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStandard() {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const s of STANDARD_SENDERS) {
        batch.set(doc(collection(db, 'emailSenders')), {
          ...s,
          active: true,
          verifiedAt: null,
          lastTestError: null,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
        });
      }
      await batch.commit();
      toast.success('Standard senders added. Send a test from each one.');
    } catch (err) {
      console.error('SendersPanel: add standard error:', err);
      toast.error(err?.message || 'Failed to add senders.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(sender) {
    try {
      await updateDoc(doc(db, 'emailSenders', sender.id), {
        active: sender.active === false,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });
    } catch (err) {
      console.error('SendersPanel: toggle error:', err);
      toast.error(err?.message || 'Failed to update sender.');
    }
  }

  async function handleDelete(sender) {
    if (!window.confirm(`Delete sender ${sender.address}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'emailSenders', sender.id));
      toast.success('Sender deleted.');
    } catch (err) {
      console.error('SendersPanel: delete error:', err);
      toast.error(err?.message || 'Failed to delete sender.');
    }
  }

  async function handleTest(sender) {
    setTestingId(sender.id);
    try {
      const sendAdminTestEmail = httpsCallable(getFunctionsInstance(), 'sendAdminTestEmail');
      const { data } = await sendAdminTestEmail({
        senderId: sender.id,
        subject: `Sender test: ${sender.address}`,
        html: `<p>This is a test email sent from <strong>${sender.address}</strong> via the CoreTradeGlobal admin panel.</p>
<p>Reply to it to check that replies reach ${sender.replyTo || sender.address}.</p>`,
        vars: {},
      });
      if (data.ok) toast.success(`Test sent to ${data.to}.`);
      else toast.error(`Test failed: ${data.error}`);
    } catch (err) {
      console.error('SendersPanel: test error:', err);
      toast.error(err?.message || 'Failed to send test.');
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/5 p-4 text-sm text-[#E8EDF2] space-y-1.5">
        <p className="font-semibold text-[#FFD700]">Before a sender can send</p>
        <p>
          Add the address in ZeptoMail → Sender Address and link it to the Mail Agent used by the platform.
          Then use <span className="font-semibold">Send test</span>: it sends from that address to you and marks the sender verified.
        </p>
        <p>
          Replies go to the reply-to address (or the sender address), so it must be a real Google Workspace mailbox, alias or group.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wide">
          Senders ({senders.length})
        </h3>
        {!form && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add sender
          </button>
        )}
      </div>

      {form && (
        <form
          onSubmit={handleSave}
          className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Address <span className="text-red-400">*</span></label>
              <input
                type="email"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="info@coretradeglobal.com"
                disabled={saving}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Display name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="CoreTradeGlobal"
                maxLength={80}
                disabled={saving}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Reply-to</label>
              <input
                type="email"
                value={form.replyTo}
                onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
                placeholder="Same as address"
                disabled={saving}
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#E8EDF2] w-fit cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              disabled={saving}
              className="accent-[#FFD700]"
            />
            Active (can be chosen when sending)
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm text-[#A0A0A0] hover:text-white border border-[rgba(255,255,255,0.1)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#FFD700] hover:bg-[#B59325] text-[#0F1B2B] rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save sender'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-32 rounded-2xl bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.06)]" />
      ) : senders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.15)] p-8 text-center space-y-3">
          <p className="text-sm text-[#A0A0A0]">No senders yet.</p>
          <button
            type="button"
            onClick={handleAddStandard}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors disabled:opacity-50"
          >
            Add noreply@, info@ and contact@
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {senders.map((sender) => (
            <div
              key={sender.id}
              className={`rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 flex flex-col md:flex-row md:items-center gap-3 ${
                sender.active === false ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-white break-all">
                  {sender.displayName ? `${sender.displayName} <${sender.address}>` : sender.address}
                  {sender.active === false && (
                    <span className="ml-2 text-xs font-medium text-[#A0A0A0]">(inactive)</span>
                  )}
                </p>
                <p className="text-xs text-[#A0A0A0] break-all">
                  Replies go to {sender.replyTo || sender.address}
                </p>
                <SenderStatus sender={sender} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(sender)}
                  disabled={testingId !== null || sender.active === false}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testingId === sender.id ? 'Sending...' : 'Send test'}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(sender)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white transition-colors"
                >
                  {sender.active === false ? 'Activate' : 'Deactivate'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(sender)}
                  aria-label={`Edit ${sender.address}`}
                  className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(sender)}
                  aria-label={`Delete ${sender.address}`}
                  className="p-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

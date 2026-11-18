'use client';

/**
 * EmailManager
 *
 * Admin Email tab (.planning/ADMIN_EMAIL_PLAN.md). Phase 1: HTML templates
 * with live preview and the sender addresses emails may go out from.
 * Every send goes through ZeptoMail as transactional email.
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Mail } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { TemplatesPanel } from './TemplatesPanel';
import { SendersPanel } from './SendersPanel';

const SUB_TABS = [
  { id: 'templates', label: 'Templates' },
  { id: 'senders', label: 'Senders' },
];

export function EmailManager() {
  const [subTab, setSubTab] = useState('templates');
  const [senders, setSenders] = useState([]);
  const [sendersLoading, setSendersLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'emailSenders'), orderBy('address'));
    return onSnapshot(
      q,
      (snap) => {
        setSenders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setSendersLoading(false);
      },
      (err) => {
        console.error('EmailManager: senders snapshot error:', err);
        setSendersLoading(false);
      }
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
          <Mail className="w-4 h-4 text-[#FFD700]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Email</h2>
          <p className="text-xs text-[#A0A0A0]">
            HTML templates and sender addresses for transactional emails sent through ZeptoMail.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              subTab === tab.id
                ? 'border-[#FFD700]/50 bg-[#FFD700]/10 text-[#FFD700]'
                : 'border-[rgba(255,255,255,0.1)] text-[#A0A0A0] hover:text-white hover:border-[rgba(255,255,255,0.2)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'templates' && <TemplatesPanel senders={senders} />}
      {subTab === 'senders' && <SendersPanel senders={senders} loading={sendersLoading} />}
    </div>
  );
}

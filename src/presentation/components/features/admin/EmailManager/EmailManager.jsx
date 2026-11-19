'use client';

/**
 * EmailManager
 *
 * Admin Email tab (.planning/ADMIN_EMAIL_PLAN.md): send a saved HTML template
 * to members and CSV contacts, follow sends in History, edit templates and
 * manage the sender addresses. Every send goes through ZeptoMail as
 * transactional email.
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Mail } from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import { SendPanel } from './SendPanel';
import { HistoryPanel } from './HistoryPanel';
import { TemplatesPanel } from './TemplatesPanel';
import { SendersPanel } from './SendersPanel';

const SUB_TABS = [
  { id: 'send', label: 'Send' },
  { id: 'history', label: 'History' },
  { id: 'templates', label: 'Templates' },
  { id: 'senders', label: 'Senders' },
];

export function EmailManager({ users = [] }) {
  const [subTab, setSubTab] = useState('send');
  const [senders, setSenders] = useState([]);
  const [sendersLoading, setSendersLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'emailTemplates'), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTemplatesLoading(false);
      },
      (err) => {
        console.error('EmailManager: templates snapshot error:', err);
        setTemplatesLoading(false);
      }
    );
  }, []);

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
            Send HTML templates to members and CSV contacts as transactional email through ZeptoMail.
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

      {subTab === 'send' && (
        <SendPanel templates={templates} senders={senders} users={users} onSent={() => setSubTab('history')} />
      )}
      {subTab === 'history' && <HistoryPanel />}
      {subTab === 'templates' && <TemplatesPanel templates={templates} loading={templatesLoading} senders={senders} />}
      {subTab === 'senders' && <SendersPanel senders={senders} loading={sendersLoading} />}
    </div>
  );
}

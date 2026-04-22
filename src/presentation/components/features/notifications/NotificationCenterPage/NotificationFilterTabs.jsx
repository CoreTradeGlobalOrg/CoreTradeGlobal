/**
 * NotificationFilterTabs Component
 *
 * Filter tabs for the notification center page.
 * Tabs: All | Deals | Messages | Legal | Providers | System
 */

'use client';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'deals', label: 'Deals' },
  { id: 'messages', label: 'Messages' },
  { id: 'legal', label: 'Legal' },
  { id: 'providers', label: 'Providers' },
  { id: 'system', label: 'System' },
];

export function NotificationFilterTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 border-b border-[rgba(255,255,255,0.08)] overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={[
            'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab.id
              ? 'text-[#FFD700] border-b-2 border-[#FFD700] -mb-px'
              : 'text-[#94a3b8] hover:text-white border-b-2 border-transparent -mb-px',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default NotificationFilterTabs;

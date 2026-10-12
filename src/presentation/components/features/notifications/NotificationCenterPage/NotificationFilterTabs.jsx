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
    // Alt çizgi border yerine inset shadow: sekmelerin -mb-px taşması
    // overflow-x-auto kutusunda dikey scroll bar çıkarıyordu. Mobilde yatay
    // kaydırma kalıyor ama scroll bar gizli.
    <div className="flex items-center overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={[
            'flex-shrink-0 px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
            activeTab === tab.id
              ? 'text-[#FFD700] border-[#FFD700]'
              : 'text-[#94a3b8] hover:text-white border-transparent',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default NotificationFilterTabs;

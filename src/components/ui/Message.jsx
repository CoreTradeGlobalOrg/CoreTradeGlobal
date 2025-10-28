/**
 * Message Component
 * Displays success or error messages
 */

import { theme } from '@/config/theme';

export function Message({ text, type = 'info' }) {
  if (!text) return null;

  const styles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        p-4
        ${theme.borderRadius.message}
        text-center
        font-medium
        border-2
        ${theme.transitions.default}
        ${styles[type]}
      `}
    >
      <span className="inline-flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{icons[type]}</span>
        <span>{text}</span>
      </span>
    </div>
  );
}

export default Message;
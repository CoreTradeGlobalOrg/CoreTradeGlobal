/**
 * Legal Consulting Constants
 *
 * All constants for the legal consulting feature (Phase 5).
 *
 * Engagement lifecycle: pending → active → completed
 * Message types: text, attachment, system, quick_action
 * Risk severity: low, medium, high
 * Risk lifecycle: open → resolved
 */

export const ENGAGEMENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

export const LEGAL_MESSAGE_TYPE = {
  TEXT: 'text',
  ATTACHMENT: 'attachment',
  SYSTEM: 'system',
  QUICK_ACTION: 'quick_action',
};

export const RISK_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

export const RISK_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
};

/**
 * Quick action buttons available in the legal chat.
 *
 * Each action has:
 *   id     - unique identifier used as the quickAction.action value
 *   label  - display text shown on the button
 *   icon   - lucide-react icon name (string) for rendering
 *   role   - 'client' | 'lawyer' — which party sees this button
 */
export const QUICK_ACTIONS = {
  // ── Client actions ────────────────────────────────────────────────────────
  APPROVE: {
    id: 'approve',
    label: 'Approve',
    icon: 'CheckCircle',
    role: 'client',
  },
  REQUEST_INFO: {
    id: 'request_info',
    label: 'Request Info',
    icon: 'HelpCircle',
    role: 'client',
  },
  REQUEST_CHANGES: {
    id: 'request_changes',
    label: 'Request Changes',
    icon: 'Edit',
    role: 'client',
  },
  CLIENT_ATTACH_FILE: {
    id: 'attach_file',
    label: 'Attach File',
    icon: 'Paperclip',
    role: 'client',
  },

  // ── Lawyer actions ────────────────────────────────────────────────────────
  SEND_DRAFT: {
    id: 'send_draft',
    label: 'Send Draft',
    icon: 'FileText',
    role: 'lawyer',
  },
  FLAG_RISK: {
    id: 'flag_risk',
    label: 'Flag Risk',
    icon: 'AlertTriangle',
    role: 'lawyer',
  },
  APPROVE_CLAUSE: {
    id: 'approve_clause',
    label: 'Approve Clause',
    icon: 'CheckSquare',
    role: 'lawyer',
  },
  LAWYER_ATTACH_FILE: {
    id: 'attach_file',
    label: 'Attach File',
    icon: 'Paperclip',
    role: 'lawyer',
  },
};

/**
 * Allowed MIME types for legal document attachments.
 * PDFs, Word documents, Excel spreadsheets, and images.
 */
export const ALLOWED_LEGAL_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

/**
 * Flat pricing per engagement (display only — no payment integration).
 * Value is in USD.
 */
export const FLAT_PRICING = 200;

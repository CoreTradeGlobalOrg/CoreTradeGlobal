/**
 * ProductUploadRequestsManager Component
 *
 * Admin panel component for viewing and managing product upload requests.
 * Shows all requests from productUploadRequests collection with filtering,
 * status management, CSV download, and chat opening.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  MessageSquare,
  FileUp,
  HelpCircle,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { db } from '@/core/config/firebase.config';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { useMessages } from '@/presentation/contexts/MessagesContext';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import { BulkProductUpload } from '@/presentation/components/features/admin/ProductsRequestsManager/BulkProductUpload';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['pending', 'in-progress', 'completed'];

const STATUS_STYLES = {
  pending: {
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/30',
    text: 'text-yellow-400',
    icon: Clock,
  },
  'in-progress': {
    bg: 'bg-blue-900/20',
    border: 'border-blue-700/30',
    text: 'text-blue-400',
    icon: Loader2,
  },
  completed: {
    bg: 'bg-green-900/20',
    border: 'border-green-700/30',
    text: 'text-green-400',
    icon: CheckCircle,
  },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

export function ProductUploadRequestsManager({ users = [] }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [bulkUploadRequest, setBulkUploadRequest] = useState(null);
  const { openConversation, conversations } = useMessages();
  const { categories } = useCategories();

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'productUploadRequests'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || null,
      }));
      setRequests(data);
    } catch (err) {
      console.error('[ProductUploadRequestsManager] Fetch error:', err);
      toast.error('Failed to load product upload requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = useCallback(async (requestId, newStatus) => {
    setUpdatingId(requestId);
    try {
      const docRef = doc(db, 'productUploadRequests', requestId);
      await updateDoc(docRef, { status: newStatus });

      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
      toast.success(`Status updated to ${newStatus}`);

      // Notify the user about the status change (fire-and-forget, don't block UX)
      const request = requests.find((r) => r.id === requestId);
      if (request?.uid) {
        const statusLabel = newStatus === 'in-progress' ? 'In Progress' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        try {
          await addDoc(collection(db, 'users', request.uid, 'notifications'), {
            type: 'product_upload_request',
            title: 'Product Upload Request Updated',
            body: `Your product upload request status has been updated to: ${statusLabel}`,
            link: `/profile/${request.uid}`,
            isRead: false,
            createdAt: serverTimestamp(),
          });
        } catch (notifErr) {
          console.error('[ProductUploadRequestsManager] Notification write failed:', notifErr);
          // Status was already updated — just warn, don't fail the whole action
        }
      }
    } catch (err) {
      console.error('[ProductUploadRequestsManager] Status update error:', err);
      toast.error('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  }, [requests]);

  const handleOpenChat = useCallback(async (request) => {
    // First: search already-loaded conversations in memory (avoids composite index issues)
    const match = conversations.find(
      (c) => c.type === 'product_upload' && c.participants?.includes(request.uid)
    );

    if (match) {
      openConversation(match.id);
      return;
    }

    // Fallback: query Firestore directly (e.g., conversation not yet in real-time subscription)
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', request.uid)
      );
      const snap = await getDocs(q);

      // Filter client-side for product_upload type to avoid needing a composite index
      const productUploadDoc = snap.docs.find(
        (d) => d.data().type === 'product_upload'
      );

      if (productUploadDoc) {
        openConversation(productUploadDoc.id);
      } else {
        toast.error('No conversation found for this request. The user may have submitted before conversations were enabled.');
      }
    } catch (err) {
      console.error('[ProductUploadRequestsManager] Open chat error:', err);
      toast.error('Failed to open conversation.');
    }
  }, [openConversation, conversations]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    'in-progress': requests.filter((r) => r.status === 'in-progress').length,
    completed: requests.filter((r) => r.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin mx-auto mb-3" />
          <p className="text-[#A0A0A0] text-sm">Loading product upload requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-white">Product Upload Requests</h3>
          <p className="text-sm text-[#A0A0A0]">
            {requests.length} total request{requests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)] text-white rounded-lg text-sm font-medium transition-colors border border-[rgba(255,255,255,0.1)]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === tab.key
                ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'
                : 'bg-[rgba(255,255,255,0.05)] text-[#A0A0A0] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-10 h-10 text-[#A0A0A0] opacity-40 mb-3" />
          <p className="text-[#A0A0A0] text-sm">
            No {filterStatus !== 'all' ? filterStatus : ''} requests found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.pending;
            const StatusIcon = statusStyle.icon;
            const isCsvUpload = request.type === 'csv_upload';

            return (
              <div
                key={request.id}
                className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Type Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCsvUpload
                          ? 'bg-[#FFD700]/10 text-[#FFD700]'
                          : 'bg-blue-900/20 text-blue-400'
                      }`}
                    >
                      {isCsvUpload ? (
                        <FileUp className="w-5 h-5" />
                      ) : (
                        <HelpCircle className="w-5 h-5" />
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm truncate">
                        {request.displayName || 'Unknown User'}
                      </span>
                      {request.companyName && (
                        <span className="text-[#A0A0A0] text-xs truncate">
                          ({request.companyName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
                      >
                        <StatusIcon className="w-3 h-3 inline mr-1" />
                        {request.status}
                      </span>
                      <span className="text-xs text-[#A0A0A0]">
                        {isCsvUpload ? 'CSV Upload' : 'Help Request'}
                      </span>
                      <span className="text-xs text-[#666]">
                        {formatDate(request.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {/* Status Dropdown */}
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusChange(request.id, e.target.value)}
                      disabled={updatingId === request.id}
                      className="bg-[rgba(255,255,255,0.07)] text-white text-xs rounded-lg px-2 py-1.5 border border-[rgba(255,255,255,0.15)] focus:outline-none focus:ring-1 focus:ring-[#FFD700]/50 disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[#1a2332]">
                          {s}
                        </option>
                      ))}
                    </select>

                    {/* Download CSV */}
                    {isCsvUpload && request.csvUrl && (
                      <a
                        href={request.csvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-[rgba(255,215,0,0.1)] hover:bg-[rgba(255,215,0,0.2)] text-[#FFD700] rounded-lg text-xs font-medium transition-colors border border-[rgba(255,215,0,0.2)]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </a>
                    )}

                    {/* Bulk Upload — only for CSV requests */}
                    {request.type === 'csv_upload' && request.csvUrl && (
                      <button
                        onClick={() => setBulkUploadRequest(request)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[rgba(255,215,0,0.1)] hover:bg-[rgba(255,215,0,0.2)] text-[#FFD700] rounded-lg text-xs font-medium transition-colors border border-[rgba(255,215,0,0.2)]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Bulk Upload
                      </button>
                    )}

                    {/* Open Chat */}
                    <button
                      onClick={() => handleOpenChat(request)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[rgba(59,130,246,0.1)] hover:bg-[rgba(59,130,246,0.2)] text-blue-400 rounded-lg text-xs font-medium transition-colors border border-[rgba(59,130,246,0.2)]"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Upload Panel — auto-loads CSV from user's request */}
      {bulkUploadRequest && (
        <div className="mt-4">
          <BulkProductUpload
            users={users}
            categories={categories}
            onClose={() => setBulkUploadRequest(null)}
            initialMemberId={bulkUploadRequest.uid}
            initialCsvUrl={bulkUploadRequest.csvUrl}
          />
        </div>
      )}
    </div>
  );
}

export default ProductUploadRequestsManager;

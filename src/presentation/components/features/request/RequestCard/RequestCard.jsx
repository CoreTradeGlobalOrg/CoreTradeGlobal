/**
 * RequestCard Component
 *
 * Displays a single request (RFQ) with details and actions
 */

'use client';

import { Button } from '@/components/ui/Button';
import { Pencil, Trash2, CheckCircle2, RotateCcw, MessageCircle } from 'lucide-react';
import { COUNTRIES } from '@/core/constants/countries';

export function RequestCard({ request, categories = [], isOwnProfile, onEdit, onDelete, onClose, onReopen, onSendMessage }) {
  const handleEdit = () => {
    if (onEdit) onEdit(request);
  };

  const handleDelete = async () => {
    if (onDelete) {
      const confirmed = confirm(`Delete request for "${request.productName}"?`);
      if (confirmed) {
        await onDelete(request.id);
      }
    }
  };

  const handleClose = async () => {
    if (onClose) {
      await onClose(request.id);
    }
  };

  const handleReopen = async () => {
    if (onReopen) {
      await onReopen(request.id);
    }
  };

  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage(request);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Find category name
  const category = categories.find((cat) => cat.value === request.categoryId);
  const categoryName = category?.label || 'Unknown Category';

  // Find country name
  const country = COUNTRIES.find((c) => c.value === request.targetCountry);
  const countryName = country?.label || request.targetCountry;

  const isActive = request.status === 'active';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg text-gray-900 line-clamp-1 flex-1">
          {request.productName}
        </h3>
        <span className={`px-2 py-1 text-xs font-medium rounded ml-2 ${getStatusColor(request.status)}`}>
          {request.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {/* Category */}
        <div className="flex items-center text-sm">
          <span className="text-gray-600 w-24">Category:</span>
          <span className="text-gray-900 font-medium">{categoryName}</span>
        </div>

        {/* Target Country */}
        <div className="flex items-center text-sm">
          <span className="text-gray-600 w-24">Target:</span>
          <span className="text-gray-900 font-medium">{countryName}</span>
        </div>

        {/* Quantity */}
        <div className="flex items-center text-sm">
          <span className="text-gray-600 w-24">Quantity:</span>
          <span className="text-gray-900 font-medium">{request.quantity?.toLocaleString() || 0} units</span>
        </div>
      </div>

      {/* Description */}
      {request.description && (
        <p className="text-sm text-gray-600 line-clamp-3 mb-4 pb-4 border-b border-gray-100">
          {request.description}
        </p>
      )}

      {/* Actions */}
      {isOwnProfile ? (
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleEdit}
            className="flex-1 flex items-center justify-center gap-1"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>

          {isActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              Close
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleReopen}
              className="flex-1 flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reopen
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            className="flex items-center justify-center gap-1 px-3"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendMessage}
            className="w-full flex items-center justify-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            Send a Message
          </Button>
        </div>
      )}
    </div>
  );
}

export default RequestCard;

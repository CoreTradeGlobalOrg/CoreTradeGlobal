/**
 * RequestList Component
 *
 * Displays a grid of requests with loading and empty states
 */

'use client';

import { RequestCard } from '../RequestCard/RequestCard';
import { FileText } from 'lucide-react';

export function RequestList({ requests = [], categories = [], loading, isOwnProfile, onEdit, onDelete, onClose, onReopen, onSendMessage }) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-16 bg-gray-200 rounded w-full" />
              <div className="h-8 bg-gray-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isOwnProfile ? 'No requests yet' : 'No requests available'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          {isOwnProfile
            ? 'Create your first request to find the products you need.'
            : 'This user has not created any requests yet.'}
        </p>
      </div>
    );
  }

  // Request grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          categories={categories}
          isOwnProfile={isOwnProfile}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={onClose}
          onReopen={onReopen}
          onSendMessage={onSendMessage}
        />
      ))}
    </div>
  );
}

export default RequestList;

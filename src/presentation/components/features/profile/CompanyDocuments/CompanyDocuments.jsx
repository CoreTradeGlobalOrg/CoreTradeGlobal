'use client';

import { useState, useRef } from 'react';
import { FileText, Upload, X, Download, Trash2, Eye } from 'lucide-react';
import { container } from '@/core/di/container';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function CompanyDocuments({ userId, documents = [], isOwnProfile = false, onDocumentsChange }) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Allowed: PDF, Images, Word documents`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}. Max size: 10MB`);
        continue;
      }

      try {
        setUploading(true);
        const userRepo = container.getUserRepository();
        const newDoc = await userRepo.uploadCompanyDocument(userId, file);

        if (onDocumentsChange) {
          onDocumentsChange([...documents, newDoc]);
        }

        toast.success(`Document uploaded: ${file.name}`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload: ${file.name}`);
      } finally {
        setUploading(false);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (documentId, documentName) => {
    if (!confirm(`Are you sure you want to delete "${documentName}"?`)) return;

    try {
      setDeleting(documentId);
      const userRepo = container.getUserRepository();
      await userRepo.deleteCompanyDocument(userId, documentId);

      if (onDocumentsChange) {
        onDocumentsChange(documents.filter(doc => doc.id !== documentId));
      }

      toast.success('Document deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="company-documents">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#FFD700]" />
          Company Documents
        </h3>
        {isOwnProfile && (
          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] rounded-lg text-[#FFD700] text-sm font-medium hover:bg-[rgba(255,215,0,0.2)] transition-colors">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Document'}
            </span>
          </label>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{isOwnProfile ? 'No documents uploaded yet' : 'No company documents available'}</p>
          {isOwnProfile && (
            <p className="text-sm mt-2">Upload documents to verify your company (PDF, Images, Word)</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{doc.name}</p>
                <p className="text-gray-400 text-sm">
                  {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                  title="View document"
                >
                  <Eye className="w-4 h-4" />
                </a>
                <a
                  href={doc.url}
                  download={doc.name}
                  className="p-2 text-gray-400 hover:text-[#3b82f6] hover:bg-[rgba(59,130,246,0.1)] rounded-lg transition-colors"
                  title="Download document"
                >
                  <Download className="w-4 h-4" />
                </a>
                {isOwnProfile && (
                  <button
                    onClick={() => handleDelete(doc.id, doc.name)}
                    disabled={deleting === doc.id}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-colors disabled:opacity-50"
                    title="Delete document"
                  >
                    {deleting === doc.id ? (
                      <span className="w-4 h-4 block border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOwnProfile && (
        <p className="text-xs text-gray-500 mt-4">
          Accepted formats: PDF, JPEG, PNG, WebP, DOC, DOCX • Max size: 10MB per file
        </p>
      )}
    </div>
  );
}

export default CompanyDocuments;

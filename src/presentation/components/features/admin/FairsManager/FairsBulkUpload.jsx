/**
 * FairsBulkUpload Component
 *
 * Modal for uploading many trade fairs at once via a CSV file.
 * Parses with PapaParse, validates each row, previews the parsed table
 * with per-row error flags, and hands the valid rows to the parent's
 * onImport handler. Rejected rows never leave the browser.
 *
 * CSV shape (header row required, order-agnostic):
 *   name              REQUIRED, non-empty
 *   location          optional
 *   category          optional
 *   startDate         YYYY-MM-DD or DD/MM/YYYY (optional but recommended)
 *   endDate           same format as startDate (optional)
 *   description       optional
 *   imageUrl          optional, must be http(s):// if provided
 *   websiteUrl        optional, must be http(s):// if provided
 *   status            upcoming | ongoing | past (default: upcoming)
 */

'use client';

import { useState, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, Download, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ALLOWED_STATUSES = ['upcoming', 'ongoing', 'past'];

const TEMPLATE_HEADERS = [
  'name',
  'location',
  'category',
  'startDate',
  'endDate',
  'description',
  'imageUrl',
  'websiteUrl',
  'status',
];

const TEMPLATE_EXAMPLE_ROW = [
  'Anuga 2026',
  'Cologne, Germany',
  'Food & Beverages',
  '2026-10-10',
  '2026-10-14',
  'Global trade fair for food and beverage industry',
  '',
  'https://www.anuga.com',
  'upcoming',
];

// ── Parsers ──────────────────────────────────────────────────────────────────

/** Accept YYYY-MM-DD, DD/MM/YYYY, or anything Date() can parse. */
function parseDate(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY → YYYY-MM-DD
  const ddmmyyyy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/;
  const m = trimmed.match(ddmmyyyy);
  if (m) {
    const [, d, mo, y] = m;
    const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isValidHttpUrl(raw) {
  if (!raw) return true;
  const trimmed = raw.trim();
  if (!trimmed) return true;
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Normalize + validate one CSV row.
 * Returns { data, errors } where data is the Fair-shaped object (may still
 * be null if unrecoverably invalid) and errors is an array of message
 * strings; a row with zero errors is safe to import.
 */
function validateRow(raw) {
  const errors = [];
  const name = (raw.name || '').trim();
  if (!name) errors.push('name is required');

  const startDate = parseDate(raw.startDate);
  if (raw.startDate && !startDate) errors.push(`startDate "${raw.startDate}" is not a valid date`);
  const endDate = parseDate(raw.endDate);
  if (raw.endDate && !endDate) errors.push(`endDate "${raw.endDate}" is not a valid date`);

  if (startDate && endDate && endDate < startDate) {
    errors.push('endDate is before startDate');
  }

  const imageUrl = (raw.imageUrl || '').trim();
  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    errors.push('imageUrl must start with http:// or https://');
  }
  const websiteUrl = (raw.websiteUrl || '').trim();
  if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
    errors.push('websiteUrl must start with http:// or https://');
  }

  let status = (raw.status || '').trim().toLowerCase();
  if (!status) status = 'upcoming';
  if (!ALLOWED_STATUSES.includes(status)) {
    errors.push(`status "${raw.status}" must be one of ${ALLOWED_STATUSES.join(', ')}`);
  }

  const data = {
    name,
    location: (raw.location || '').trim(),
    category: (raw.category || '').trim(),
    description: (raw.description || '').trim(),
    startDate,
    endDate,
    imageUrl,
    websiteUrl,
    status,
  };

  return { data, errors };
}

// ── Component ────────────────────────────────────────────────────────────────

export function FairsBulkUpload({ isOpen, onClose, onImport, importing }) {
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]); // [{ data, errors }]
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);

  const validCount = useMemo(
    () => parsedRows.filter((r) => r.errors.length === 0).length,
    [parsedRows]
  );
  const invalidCount = parsedRows.length - validCount;

  if (!isOpen) return null;

  const resetState = () => {
    setFileName('');
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setParseError(results.errors[0].message);
          setParsedRows([]);
          return;
        }
        const rows = (results.data || []).map(validateRow);
        setParsedRows(rows);
      },
      error: (err) => {
        setParseError(err.message);
        setParsedRows([]);
      },
    });
  };

  const handleDownloadTemplate = () => {
    const csv = Papa.unparse({
      fields: TEMPLATE_HEADERS,
      data: [TEMPLATE_EXAMPLE_ROW],
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fairs-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0).map((r) => r.data);
    if (validRows.length === 0) return;
    const result = await onImport(validRows);
    // Parent handles refetch + toast. On full success, clear + close.
    if (result && result.failed === 0) {
      resetState();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0F1B2B] rounded-xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto border border-[#FFD700]/20">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Import Fairs from CSV</h2>
            <p className="text-sm text-[#A0A0A0] mt-1">
              Upload a CSV file to create many fairs at once.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-[#A0A0A0] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format legend + template */}
        <div className="mb-6 p-4 rounded-lg bg-white/[0.03] border border-white/10">
          <div className="flex items-start justify-between gap-4 mb-3">
            <h3 className="text-sm font-semibold text-white">CSV format</h3>
            <Button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-transparent border border-[#FFD700]/40 text-[#FFD700] hover:bg-[#FFD700]/10 text-xs px-3 py-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Template
            </Button>
          </div>
          <p className="text-xs text-[#A0A0A0] leading-relaxed">
            Header row required. Columns: <code className="text-[#FFD700]">name</code>{' '}
            (required), <code className="text-[#FFD700]">location</code>,{' '}
            <code className="text-[#FFD700]">category</code>,{' '}
            <code className="text-[#FFD700]">startDate</code> and{' '}
            <code className="text-[#FFD700]">endDate</code> (YYYY-MM-DD or DD/MM/YYYY),{' '}
            <code className="text-[#FFD700]">description</code>,{' '}
            <code className="text-[#FFD700]">imageUrl</code>,{' '}
            <code className="text-[#FFD700]">websiteUrl</code> (both must start with http://
            or https://), <code className="text-[#FFD700]">status</code>{' '}
            (upcoming / ongoing / past — defaults to upcoming).
          </p>
        </div>

        {/* File input */}
        <label className="block mb-6">
          <span className="text-sm font-medium text-white mb-2 block">CSV file</span>
          <div className="relative flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-sm text-[#A0A0A0]
                file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:bg-[#FFD700] file:text-black file:font-semibold
                file:cursor-pointer hover:file:bg-[#B5952F]
                cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          {fileName && (
            <p className="mt-2 text-xs text-[#A0A0A0]">
              Loaded <span className="text-white font-medium">{fileName}</span>
            </p>
          )}
        </label>

        {/* Parse error */}
        {parseError && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-300">Could not parse CSV: {parseError}</p>
          </div>
        )}

        {/* Preview */}
        {parsedRows.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-3 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                {validCount} valid
              </span>
              {invalidCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  {invalidCount} rejected
                </span>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-[#A0A0A0] uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => {
                    const bad = row.errors.length > 0;
                    return (
                      <tr
                        key={i}
                        className={
                          bad
                            ? 'bg-red-500/[0.05] border-t border-red-500/20'
                            : 'border-t border-white/5'
                        }
                      >
                        <td className="px-3 py-2 text-[#A0A0A0]">{i + 1}</td>
                        <td className="px-3 py-2 text-white">{row.data.name || '—'}</td>
                        <td className="px-3 py-2 text-[#A0A0A0]">{row.data.location || '—'}</td>
                        <td className="px-3 py-2 text-[#A0A0A0]">
                          {row.data.startDate ? row.data.startDate.toISOString().split('T')[0] : '—'}
                        </td>
                        <td className="px-3 py-2 text-[#A0A0A0]">
                          {row.data.endDate ? row.data.endDate.toISOString().split('T')[0] : '—'}
                        </td>
                        <td className="px-3 py-2 text-[#A0A0A0]">{row.data.status}</td>
                        <td className="px-3 py-2 text-red-300">
                          {row.errors.length > 0 ? row.errors.join('; ') : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="bg-transparent border border-white/20 text-white hover:bg-white/5 text-sm px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={importing || validCount === 0}
            className="flex items-center gap-2 bg-[#FFD700] hover:bg-[#B5952F] text-black font-semibold text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {importing
              ? 'Importing…'
              : validCount === 0
              ? 'Import'
              : `Import ${validCount} fair${validCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FairsBulkUpload;

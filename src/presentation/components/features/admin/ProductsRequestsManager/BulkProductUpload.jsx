/**
 * BulkProductUpload Component
 *
 * Admin tool to bulk-create products via CSV upload.
 * Parses client-side with papaparse, shows a validation preview table,
 * requires a member selection, then calls the bulkUploadProducts Cloud Function.
 *
 * CSV columns: Product Name, Category (optional), Price, Currency, Quantity, Unit, Description, Image URLs
 *
 * Category matching: tries exact match on category value/name/label.
 * If no match, shows a dropdown picker in the preview row so admin can select manually.
 */

'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Loader2,
} from 'lucide-react';
import { CURRENCIES } from '@/core/constants/currencies';
import { httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import { getStorageInstance, getFunctionsInstance } from '@/core/config/firebase.config';
import { SearchableSelect } from '@/presentation/components/common/SearchableSelect/SearchableSelect';

// Valid currency codes for validation
const VALID_CURRENCY_CODES = new Set(CURRENCIES.map((c) => c.value));

/**
 * Build a simple category lookup map from Firestore product categories.
 * Matches by: value (doc ID), name, label (with/without icon prefix).
 */
function buildCategoryMap(categories) {
  const map = {};
  (categories || []).forEach((c) => {
    if (!c.value) return;
    // Match by value
    map[c.value.toLowerCase()] = c.value;
    // Match by name
    if (c.name) map[c.name.toLowerCase()] = c.value;
    // Match by label (may include emoji prefix)
    if (c.label) {
      map[c.label.toLowerCase()] = c.value;
      // Strip leading emoji/icon
      const stripped = c.label.replace(/^\S+\s+/, '').trim();
      if (stripped) map[stripped.toLowerCase()] = c.value;
    }
  });
  return map;
}

function resolveCategory(raw, categoryMap) {
  if (!raw) return null;
  return categoryMap[raw.trim().toLowerCase()] || null;
}

function validateRow(row, index, categoryMap) {
  const errors = [];

  if (!row['Product Name']?.trim()) {
    errors.push('Product Name is required');
  }

  // Category: try to resolve, but don't fail — admin can pick from dropdown
  const resolvedCategory = resolveCategory(row['Category'], categoryMap);

  const price = parseFloat(row['Price']);
  if (!row['Price'] || isNaN(price) || price <= 0) {
    errors.push('Price must be a positive number');
  }

  const currency = row['Currency']?.trim().toUpperCase();
  if (!currency || !VALID_CURRENCY_CODES.has(currency)) {
    errors.push(`Currency "${row['Currency'] || ''}" is not valid. Use a 3-letter code like USD, EUR.`);
  }

  const quantity = parseFloat(row['Quantity']);
  if (!row['Quantity'] || isNaN(quantity) || quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }

  if (!row['Unit']?.trim()) {
    errors.push('Unit is required');
  }

  return {
    rowIndex: index,
    original: row,
    name: row['Product Name']?.trim() || '',
    category: resolvedCategory, // null if unresolved — admin picks from dropdown
    price: isNaN(price) ? null : price,
    currency: VALID_CURRENCY_CODES.has(currency) ? currency : null,
    quantity: isNaN(quantity) ? null : quantity,
    unit: row['Unit']?.trim() || '',
    description: row['Description']?.trim() || '',
    imageUrls: row['Image URLs']?.trim() || '',
    errors,
    // Valid if no field errors — category can be null (will be picked manually)
    isValid: errors.length === 0,
    needsCategoryPick: !resolvedCategory && errors.length === 0,
  };
}

const REQUIRED_COLUMNS = ['Product Name', 'Price', 'Currency', 'Quantity', 'Unit'];

export function BulkProductUpload({ users, categories, onClose, initialMemberId, initialCsvUrl }) {
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId || '');
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [uploadState, setUploadState] = useState(null); // null | 'uploading' | 'done'
  const [uploadResult, setUploadResult] = useState(null);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const fileInputRef = useRef(null);

  // Build simple category lookup map
  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);

  // Category options for the dropdown picker
  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c.value, label: c.name || c.label || c.value })),
    [categories]
  );

  // Build member options
  const memberOptions = (users || []).map((u) => ({
    value: u.uid || u.id,
    label: `${u.displayName || u.email || 'Unknown'} ${u.companyName ? `(${u.companyName})` : ''}`.trim(),
  }));

  const selectedMember = (users || []).find(
    (u) => (u.uid || u.id) === selectedMemberId
  );

  // Parse CSV text (shared by file upload and URL auto-load)
  const parseCsvText = useCallback((csvText) => {
    setParseError(null);
    setParsedRows(null);
    setUploadResult(null);
    setUploadState(null);

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setParseError('The CSV file is empty or has no data rows.');
          return;
        }
        const headers = results.meta.fields || [];
        const missingCols = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
        if (missingCols.length > 0) {
          setParseError(
            `Missing required columns: ${missingCols.join(', ')}. ` +
            `Expected: Product Name, Category (optional), Price, Currency, Quantity, Unit, Description (optional), Image URLs (optional).`
          );
          return;
        }
        const validated = results.data.map((row, i) =>
          validateRow(row, i, categoryMap)
        );
        setParsedRows(validated);
      },
      error: (err) => {
        setParseError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, [categoryMap]);

  // Auto-load CSV from URL when initialCsvUrl is provided (user already uploaded it)
  useEffect(() => {
    if (!initialCsvUrl || parsedRows) return;
    setLoadingCsv(true);

    (async () => {
      try {
        // Get a fresh download URL via Firebase SDK (includes valid token)
        const match = initialCsvUrl.match(/\/o\/(.+?)(\?|$)/);
        let fetchUrl = initialCsvUrl;
        if (match) {
          const storagePath = decodeURIComponent(match[1]);
          const fileRef = ref(getStorageInstance(), storagePath);
          fetchUrl = await getDownloadURL(fileRef);
        }
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Failed to fetch CSV (${res.status})`);
        const text = await res.text();
        parseCsvText(text);
      } catch (err) {
        setParseError(`Failed to load CSV: ${err.message}`);
      } finally {
        setLoadingCsv(false);
      }
    })();
  }, [initialCsvUrl, parseCsvText, parsedRows]);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setParseError('Please select a .csv file.');
      return;
    }

    setParseError(null);
    setParsedRows(null);
    setUploadResult(null);
    setUploadState(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setParseError('The CSV file is empty or has no data rows.');
          return;
        }

        const headers = results.meta.fields || [];
        const missingCols = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
        if (missingCols.length > 0) {
          setParseError(
            `Missing required columns: ${missingCols.join(', ')}. ` +
            `Expected: Product Name, Category (optional), Price, Currency, Quantity, Unit, Description (optional), Image URLs (optional).`
          );
          return;
        }

        const validated = results.data.map((row, i) =>
          validateRow(row, i, categoryMap)
        );
        setParsedRows(validated);
      },
      error: (err) => {
        setParseError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, [categoryMap]);

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // Update a row's category when admin picks from dropdown
  const handleCategoryChange = (rowIndex, categoryValue) => {
    setParsedRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, category: categoryValue, needsCategoryPick: !categoryValue }
          : r
      )
    );
  };

  // Rows ready for upload: valid + has category assigned
  const uploadableRows = parsedRows
    ? parsedRows.filter((r) => r.isValid && r.category)
    : [];
  const needsCategoryCount = parsedRows
    ? parsedRows.filter((r) => r.needsCategoryPick && !r.category).length
    : 0;
  const invalidCount = parsedRows
    ? parsedRows.filter((r) => !r.isValid).length
    : 0;
  const canUpload = uploadableRows.length > 0 && !!selectedMemberId && uploadState !== 'uploading';

  const handleConfirmUpload = async () => {
    if (!canUpload) return;
    setUploadState('uploading');

    const rows = uploadableRows.map((r) => ({
      name: r.name,
      categoryId: r.category,
      price: r.price,
      currency: r.currency,
      quantity: r.quantity,
      unit: r.unit,
      description: r.description,
      imageUrls: r.imageUrls,
    }));

    try {
      const bulkUploadProducts = httpsCallable(getFunctionsInstance(), 'bulkUploadProducts');
      const result = await bulkUploadProducts({
        userId: selectedMemberId,
        rows,
      });
      setUploadResult(result.data);
      setUploadState('done');
    } catch (err) {
      setUploadResult({ error: err.message || 'Upload failed.' });
      setUploadState('done');
    }
  };

  const handleReset = () => {
    setParsedRows(null);
    setParseError(null);
    setUploadState(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-[#0F1B2B] border border-[rgba(255,215,0,0.2)] rounded-xl p-5 md:p-6 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#FFD700]" />
          <h3 className="text-white font-semibold text-base md:text-lg">Bulk Product Upload</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-white transition-colors"
          aria-label="Close bulk upload"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step 1: Member Picker */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
          <User className="w-4 h-4 inline mr-1" />
          Select Member
          <span className="text-[#FFD700]"> *</span>
          <span className="text-xs text-[#606060] ml-2">(products will be created for this member)</span>
        </label>
        <SearchableSelect
          options={memberOptions}
          value={selectedMemberId}
          onChange={setSelectedMemberId}
          placeholder="Search by name or company..."
          searchPlaceholder="Type to search members..."
          className="dark-select"
        />
        {selectedMember && (
          <p className="mt-1.5 text-xs text-[#A0A0A0]">
            Selected:{' '}
            <span className="text-[#FFD700] font-medium">
              {selectedMember.displayName || selectedMember.email}
            </span>
            {selectedMember.companyName ? ` (${selectedMember.companyName})` : ''}
          </p>
        )}
      </div>

      {/* Step 2: CSV Upload area */}
      {loadingCsv ? (
        <div className="mb-5 p-6 rounded-lg bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.2)] flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin flex-shrink-0" />
          <p className="text-[#FFD700] text-sm font-medium">Loading CSV from user upload...</p>
        </div>
      ) : !initialCsvUrl || parseError ? (
      <div className="mb-5">
        <label className="block text-sm font-medium text-[#A0A0A0] mb-2">
          CSV File
          <span className="text-[#FFD700]"> *</span>
          <span className="text-xs text-[#606060] ml-2">
            Columns: Product Name, Category (optional), Price, Currency, Quantity, Unit, Description, Image URLs
          </span>
        </label>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging
              ? 'border-[#FFD700] bg-[rgba(255,215,0,0.06)]'
              : 'border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,215,0,0.4)] hover:bg-[rgba(255,255,255,0.03)]',
          ].join(' ')}
        >
          <Upload className="w-8 h-8 text-[#A0A0A0] mx-auto mb-2" />
          <p className="text-[#A0A0A0] text-sm">
            Drag &amp; drop a CSV file here, or{' '}
            <span className="text-[#FFD700] underline">browse</span>
          </p>
          <p className="text-[#606060] text-xs mt-1">.csv files only</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
      ) : null}

      {/* Parse error */}
      {parseError && (
        <div className="mb-4 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{parseError}</p>
        </div>
      )}

      {/* Preview table */}
      {parsedRows && parsedRows.length > 0 && uploadState !== 'done' && (
        <div className="mb-5">
          {/* Summary bar */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">{uploadableRows.length} ready</span>
            </div>
            {needsCategoryCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">{needsCategoryCount} need category</span>
              </div>
            )}
            {invalidCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-medium">{invalidCount} errors</span>
              </div>
            )}
            <button
              onClick={handleReset}
              className="ml-auto text-xs text-[#A0A0A0] hover:text-white underline transition-colors"
            >
              Clear &amp; re-upload
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.1)]">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]">
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium w-8">#</th>
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium">Status</th>
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium">Product Name</th>
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium min-w-[180px]">Category</th>
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium">Price</th>
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium">Qty / Unit</th>
                  <th className="px-3 py-2 text-left text-[#A0A0A0] font-medium">Images</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={[
                      'border-b border-[rgba(255,255,255,0.05)] transition-colors',
                      !row.isValid
                        ? 'bg-[rgba(239,68,68,0.06)] hover:bg-[rgba(239,68,68,0.09)]'
                        : row.needsCategoryPick && !row.category
                          ? 'bg-[rgba(255,215,0,0.04)] hover:bg-[rgba(255,215,0,0.07)]'
                          : 'hover:bg-[rgba(255,255,255,0.02)]',
                    ].join(' ')}
                  >
                    <td className="px-3 py-2 text-[#606060]">{row.rowIndex + 1}</td>
                    <td className="px-3 py-2">
                      {!row.isValid ? (
                        <div className="group relative inline-block">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 cursor-help" />
                          <div className="absolute z-10 left-5 top-0 hidden group-hover:block bg-[#1a2a3a] border border-[rgba(239,68,68,0.4)] rounded-lg p-2 w-64 shadow-xl">
                            <ul className="space-y-1">
                              {row.errors.map((err, i) => (
                                <li key={i} className="text-red-300 text-xs">{err}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : row.category ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-white max-w-[140px] truncate">
                      {row.name || <span className="text-red-400 italic">missing</span>}
                    </td>
                    <td className="px-3 py-2">
                      {row.isValid && !row.category ? (
                        // Show dropdown picker for unresolved categories
                        <select
                          value={row.category || ''}
                          onChange={(e) => handleCategoryChange(row.rowIndex, e.target.value)}
                          className="w-full bg-[#1a2a3a] border border-[rgba(255,215,0,0.3)] text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#FFD700]"
                        >
                          <option value="">Select category...</option>
                          {categoryOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : row.category ? (
                        <span className="text-[#A0A0A0]">
                          {(categories || []).find((c) => c.value === row.category)?.name || row.category}
                        </span>
                      ) : (
                        <span className="text-red-400 italic">{row.original['Category'] || 'missing'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#A0A0A0] whitespace-nowrap">
                      {row.price != null
                        ? `${row.price} ${row.currency || row.original['Currency'] || ''}`
                        : <span className="text-red-400 italic">invalid</span>}
                    </td>
                    <td className="px-3 py-2 text-[#A0A0A0] whitespace-nowrap">
                      {row.quantity != null
                        ? `${row.quantity} ${row.unit || '—'}`
                        : <span className="text-red-400 italic">invalid</span>}
                    </td>
                    <td className="px-3 py-2 text-[#606060]">
                      {row.imageUrls ? (
                        <span className="text-green-400">
                          {row.imageUrls.split(',').filter(Boolean).length} URL(s)
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadState === 'uploading' && (
        <div className="mb-4 p-4 rounded-lg bg-[rgba(255,215,0,0.05)] border border-[rgba(255,215,0,0.2)]">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#FFD700] animate-spin flex-shrink-0" />
            <div>
              <p className="text-[#FFD700] font-medium text-sm">Uploading products...</p>
              <p className="text-[#A0A0A0] text-xs mt-0.5">
                Processing {uploadableRows.length} row(s). This may take a moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload result */}
      {uploadState === 'done' && uploadResult && (
        <div className={[
          'mb-4 p-4 rounded-lg border',
          uploadResult.error
            ? 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.3)]'
            : 'bg-[rgba(74,222,128,0.06)] border-[rgba(74,222,128,0.25)]',
        ].join(' ')}>
          {uploadResult.error ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium text-sm">Upload failed</p>
                <p className="text-red-300 text-xs mt-0.5">{uploadResult.error}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 font-medium text-sm">
                  Upload complete — {uploadResult.created} product(s) created
                </p>
                {uploadResult.skipped > 0 && (
                  <p className="text-[#A0A0A0] text-xs mt-0.5">
                    {uploadResult.skipped} row(s) skipped due to errors.
                  </p>
                )}
                {uploadResult.imagesFailed > 0 && (
                  <p className="text-amber-400 text-xs mt-0.5">
                    {uploadResult.imagesFailed} image(s) could not be downloaded — products created without those images.
                  </p>
                )}
                {uploadResult.errors?.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {uploadResult.errors.map((e, i) => (
                      <li key={i} className="text-amber-400 text-xs">Row {e.row + 1}: {e.reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {uploadState !== 'done' && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleConfirmUpload}
            disabled={!canUpload}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all',
              canUpload
                ? 'bg-[#FFD700] hover:bg-[#B59325] !text-black cursor-pointer'
                : 'bg-[rgba(255,215,0,0.2)] text-[rgba(255,215,0,0.4)] cursor-not-allowed',
            ].join(' ')}
          >
            {uploadState === 'uploading' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {uploadableRows.length > 0 ? `${uploadableRows.length} ` : ''}Product{uploadableRows.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm text-[#A0A0A0] hover:text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] transition-colors"
          >
            Cancel
          </button>
          {needsCategoryCount > 0 && (
            <p className="text-amber-400 text-xs">
              {needsCategoryCount} row(s) need a category selected before upload.
            </p>
          )}
          {!selectedMemberId && parsedRows && uploadableRows.length > 0 && (
            <p className="text-amber-400 text-xs">Select a member above to enable upload.</p>
          )}
        </div>
      )}

      {uploadState === 'done' && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-lg text-sm bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white transition-colors"
          >
            Upload Another File
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm text-[#A0A0A0] hover:text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default BulkProductUpload;

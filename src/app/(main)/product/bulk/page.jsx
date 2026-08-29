/**
 * Bulk Product Upload — self-serve
 *
 * URL: /product/bulk
 *
 * Auth-guarded page. Members drop a CSV, we parse + validate in the
 * browser via papaparse + the shared csvValidation util, present a
 * row-by-row preview with per-row category picker where auto-match
 * fails, then call the `bulkUploadProducts` Cloud Function with
 * `userId = auth.uid` (self-serve mode). Same CF the admin path uses;
 * the server distinguishes admin vs self-serve and caps self-serve
 * at 100 rows.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Papa from 'papaparse';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ImagePlus,
  Info,
  Loader2,
  RotateCcw,
  Upload,
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getFunctionsInstance, getStorageInstance } from '@/core/config/firebase.config';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useCategories } from '@/presentation/hooks/category/useCategories';
import {
  buildCategoryMap,
  validateRow,
  REQUIRED_COLUMNS,
} from '@/core/bulkUpload/csvValidation';
import { compressImage, extForCompressed } from '@/lib/image-utils';

const MAX_ROWS = 100;
const MAX_IMAGES_PER_PRODUCT = 8;
const IMAGE_MIME_ALLOW = /^image\/(jpe?g|png|webp)$/;

const TEMPLATE_HEADERS = [
  'Product Name',
  'Category',
  'Price',
  'Currency',
  'Quantity',
  'Unit',
  'Description',
];

function downloadTemplate() {
  const escape = (cells) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',');
  const csv = `${escape(TEMPLATE_HEADERS)}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'coretradeglobal-product-template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function BulkUploadActionPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();

  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [uploadState, setUploadState] = useState(null); // null | 'uploading' | 'done'
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login?redirect=/product/bulk');
    }
  }, [authLoading, isAuthenticated, router]);

  const categoryMap = useMemo(() => buildCategoryMap(categories), [categories]);
  const categoryOptions = useMemo(
    () => (categories || []).map((c) => ({ value: c.value, label: c.name || c.label || c.value })),
    [categories]
  );

  const parseCsvText = useCallback(
    (csvText) => {
      setParseError(null);
      setParsedRows(null);
      setUploadResult(null);
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
        // Strip Excel/UTF-8 BOM on the first column and trim
        // trailing whitespace — a "Quantity " header would otherwise
        // silently miss row['Quantity'] and store null.
        transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
        complete: (results) => {
          if (!results?.data?.length) {
            setParseError('The CSV file appears to be empty.');
            return;
          }
          const headers = results.meta?.fields || [];
          const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
          if (missing.length) {
            setParseError(
              `Your CSV is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Download the template to see the expected format.`
            );
            return;
          }
          if (results.data.length > MAX_ROWS) {
            setParseError(
              `Self-serve uploads are capped at ${MAX_ROWS} rows per file. Your CSV has ${results.data.length} rows. Please split it and upload separately.`
            );
            return;
          }
          const validated = results.data.map((row, i) => validateRow(row, i, categoryMap));
          setParsedRows(validated);
        },
        error: (err) => {
          setParseError(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    [categoryMap]
  );

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        toast.error('Please select a .csv file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => parseCsvText(String(e.target?.result || ''));
      reader.onerror = () => toast.error('Failed to read the file.');
      reader.readAsText(file);
    },
    [parseCsvText]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const setRowCategory = (rowIndex, categoryValue) => {
    setParsedRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, category: categoryValue, needsCategoryPick: !categoryValue }
          : r
      )
    );
  };

  const appendRowImages = useCallback((rowIndex, newImages) => {
    setParsedRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, images: [...(r.images || []), ...newImages] }
          : r
      )
    );
  }, []);

  const removeRowImage = useCallback(async (rowIndex, path) => {
    // Best-effort — if the delete fails (network, expired token), the
    // UI still drops the thumb so the user doesn't get stuck.
    try {
      await deleteObject(ref(getStorageInstance(), path));
    } catch (err) {
      console.warn('[bulk] failed to delete staged image:', err);
    }
    setParsedRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex
          ? { ...r, images: (r.images || []).filter((img) => img.path !== path) }
          : r
      )
    );
  }, []);

  const uploadableRows = parsedRows
    ? parsedRows.filter((r) => r.isValid && r.category)
    : [];
  const validRowsWithoutCategory = parsedRows
    ? parsedRows.filter((r) => r.isValid && !r.category).length
    : 0;
  const invalidCount = parsedRows
    ? parsedRows.filter((r) => !r.isValid).length
    : 0;

  const canUpload =
    uploadableRows.length > 0 && !!user?.uid && uploadState !== 'uploading';

  const handleUpload = async () => {
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
      // Direct URLs from client-side staging upload — CF sets these
      // straight onto `product.images` without hitting the internet.
      images: (r.images || []).map((img) => img.url),
      // Legacy field for admin CSVs that still carry an "Image URLs"
      // column; CF prefers `images` when both are present.
      imageUrls: r.imageUrls,
    }));

    try {
      const bulkUploadProducts = httpsCallable(getFunctionsInstance(), 'bulkUploadProducts');
      const result = await bulkUploadProducts({ userId: user.uid, rows });
      setUploadResult(result.data);
      setUploadState('done');
    } catch (err) {
      setUploadResult({ error: err?.message || 'Upload failed. Please try again.' });
      setUploadState('done');
    }
  };

  const handleReset = () => {
    // Best-effort cleanup: images the user staged but never published
    // become orphans in Storage otherwise.
    if (parsedRows) {
      const storage = getStorageInstance();
      parsedRows.forEach((row) => {
        (row.images || []).forEach((img) => {
          deleteObject(ref(storage, img.path)).catch(() => {});
        });
      });
    }
    setParsedRows(null);
    setParseError(null);
    setUploadState(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (authLoading) {
    return (
      <main className="pt-[calc(var(--navbar-height)+24px)] min-h-screen bg-radial-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
      </main>
    );
  }

  return (
    <main className="pt-[calc(var(--navbar-height)+24px)] pb-16 bg-radial-navy min-h-screen text-white">
      <div className="max-w-5xl mx-auto px-5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm no-underline"
            style={{ color: '#A0A0A0' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.35)] text-[#FFD700] text-xs font-semibold hover:bg-[rgba(255,215,0,0.18)] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download template
            </button>
            <Link
              href="/bulk-upload"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.05)] transition-colors no-underline"
              style={{ color: '#ffffff' }}
            >
              How does this work?
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-1">Bulk Upload Products</h1>
          <p className="text-[#c8d3e0]">
            Drop your CSV. We validate every row locally. Nothing publishes until you confirm.
          </p>
          <p className="text-[#A0A0A0] text-xs mt-1">Self-serve limit: {MAX_ROWS} products per file.</p>
        </div>

        {/* Post-publish image workflow hint — surfaced before parse so
            the member knows the CSV does NOT need image URLs. */}
        {!parsedRows && uploadState !== 'done' && (
          <div className="mb-4 rounded-2xl border border-[rgba(255,215,0,0.25)] bg-[rgba(255,215,0,0.05)] px-4 py-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#FFD700] flex-shrink-0 mt-0.5" />
            <p className="text-[#c8d3e0] text-xs leading-relaxed">
              <span className="text-white font-semibold">No image URLs needed in the CSV.</span>{' '}
              Once the file is validated, you&apos;ll see an <span className="text-white font-semibold">Images</span>{' '}
              column in the preview — attach up to {MAX_IMAGES_PER_PRODUCT} photos per product from your device
              before you publish.
            </p>
          </div>
        )}

        {/* Drop zone (hidden once a file has been parsed) */}
        {!parsedRows && uploadState !== 'done' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`rounded-3xl border-2 border-dashed transition-all cursor-pointer p-10 text-center ${
              isDragging
                ? 'border-[#FFD700] bg-[rgba(255,215,0,0.08)]'
                : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,215,0,0.4)] hover:bg-[rgba(255,215,0,0.04)]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-[rgba(255,215,0,0.12)] border border-[rgba(255,215,0,0.35)] flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-8 h-8 text-[#FFD700]" />
            </div>
            <p className="text-white font-bold text-lg mb-1">Drop your CSV here</p>
            <p className="text-[#A0A0A0] text-sm">or click to browse. Up to {MAX_ROWS} rows.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>
        )}

        {parseError && (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{parseError}</p>
          </div>
        )}

        {/* Validation preview */}
        {parsedRows && uploadState !== 'done' && (
          <section className="mt-6 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] overflow-hidden">
            {/* Counts bar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <Check className="w-3.5 h-3.5" />
                {uploadableRows.length} ready
              </span>
              {validRowsWithoutCategory > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] text-xs font-bold">
                  ⚠ {validRowsWithoutCategory} need category
                </span>
              )}
              {invalidCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {invalidCount} invalid
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-xs font-semibold hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Start over
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!canUpload}
                  style={{ color: '#0F1B2B', WebkitTextFillColor: canUpload ? '#0F1B2B' : undefined }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploadState === 'uploading' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Publishing…
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Publish {uploadableRows.length} product{uploadableRows.length !== 1 && 's'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Row table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#A0A0A0] text-[10px] uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-semibold w-12">#</th>
                    <th className="text-left px-3 py-2 font-semibold">Product</th>
                    <th className="text-left px-3 py-2 font-semibold">Category</th>
                    <th className="text-left px-3 py-2 font-semibold">Price</th>
                    <th className="text-left px-3 py-2 font-semibold">Qty</th>
                    <th className="text-left px-3 py-2 font-semibold">Images</th>
                    <th className="text-left px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r) => {
                    const status =
                      !r.isValid ? 'invalid'
                      : !r.category ? 'needs-category'
                      : 'valid';
                    return (
                      <tr
                        key={r.rowIndex}
                        className="border-t border-[rgba(255,255,255,0.05)] align-top"
                      >
                        <td className="px-4 py-3 text-[#A0A0A0] text-xs">{r.rowIndex + 1}</td>
                        <td className="px-3 py-3 text-white">
                          <div className="font-semibold text-sm truncate max-w-[220px]">
                            {r.name || <span className="text-red-300">(missing)</span>}
                          </div>
                          {r.errors.length > 0 && (
                            <ul className="mt-1 text-[11px] text-red-300 list-disc list-inside">
                              {r.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {status === 'needs-category' ? (
                            <select
                              value={r.category || ''}
                              onChange={(e) => setRowCategory(r.rowIndex, e.target.value)}
                              disabled={categoriesLoading}
                              className="bg-[rgba(255,255,255,0.05)] border border-[#FFD700]/50 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#FFD700]"
                            >
                              <option value="" className="bg-[#0F1B2B]">
                                Pick a category
                              </option>
                              {categoryOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#0F1B2B]">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : r.category ? (
                            <span className="text-white text-xs">
                              {categoryOptions.find((o) => o.value === r.category)?.label || r.category}
                            </span>
                          ) : (
                            <span className="text-[#A0A0A0] text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-white text-xs">
                          {r.price !== null ? `${r.currency || ''} ${r.price}` : '-'}
                        </td>
                        <td className="px-3 py-3 text-white text-xs">
                          {r.quantity !== null ? `${r.quantity} ${r.unit || ''}`.trim() : r.unit || '-'}
                        </td>
                        <td className="px-3 py-3">
                          <RowImageCell
                            row={r}
                            userId={user?.uid}
                            onImagesAdded={(imgs) => appendRowImages(r.rowIndex, imgs)}
                            onImageRemoved={(path) => removeRowImage(r.rowIndex, path)}
                            disabled={uploadState === 'uploading'}
                          />
                        </td>
                        <td className="px-3 py-3">
                          {status === 'valid' && (
                            <span className="inline-flex items-center gap-1 text-emerald-300 text-xs font-semibold">
                              <Check className="w-3.5 h-3.5" /> Ready
                            </span>
                          )}
                          {status === 'needs-category' && (
                            <span className="text-[#FFD700] text-xs font-semibold">Category?</span>
                          )}
                          {status === 'invalid' && (
                            <span className="inline-flex items-center gap-1 text-red-300 text-xs font-semibold">
                              <AlertCircle className="w-3.5 h-3.5" /> Fix &amp; re-upload
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Upload result */}
        {uploadState === 'done' && uploadResult && (
          <section className="mt-6 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-6 text-center">
            {uploadResult.error ? (
              <>
                <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-7 h-7 text-red-300" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Upload failed</h3>
                <p className="text-[#c8d3e0] text-sm mb-4">{uploadResult.error}</p>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-sm font-semibold hover:bg-[rgba(255,255,255,0.05)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try again
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">
                  {uploadResult.created} product{uploadResult.created !== 1 && 's'} published
                </h3>
                {uploadResult.skipped > 0 && (
                  <p className="text-[#c8d3e0] text-sm mb-2">
                    {uploadResult.skipped} row{uploadResult.skipped !== 1 && 's'} skipped
                    {uploadResult.errors?.length > 0 && '. See details below.'}
                  </p>
                )}
                {uploadResult.errors?.length > 0 && (
                  <ul className="text-xs text-red-300 mb-3 text-left max-w-xl mx-auto space-y-1">
                    {uploadResult.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>Row {e.row + 1}: {e.reason}</li>
                    ))}
                    {uploadResult.errors.length > 10 && (
                      <li className="text-[#A0A0A0]">…and {uploadResult.errors.length - 10} more</li>
                    )}
                  </ul>
                )}
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <Link
                    href={user?.uid ? `/profile/${user.uid}?scroll=products` : '/'}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] text-sm font-bold no-underline"
                    style={{ color: '#0F1B2B', WebkitTextFillColor: '#0F1B2B' }}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    View my products
                  </Link>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.15)] text-white text-sm font-semibold hover:bg-[rgba(255,255,255,0.05)]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Upload another
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

/**
 * Per-row image picker used inside the bulk-upload preview table.
 *
 * Files are compressed to WebP with the shared "product" preset
 * (≤ 0.8 MB, ≤ 1200 px) before touching Storage — the 800 KiB
 * Storage rule ceiling would otherwise reject phone-camera originals.
 *
 * Staged path: `users/{uid}/products/{stagingId}/{index}.{ext}` where
 * `stagingId` is a per-row UUID minted once. The Storage rule accepts
 * any `{productId}` slot for the owner, so the temporary path works;
 * on publish, only the resulting download URLs are handed to the
 * Cloud Function which sets them straight onto `product.images`.
 *
 * A row that never gets published cleans up its staged files when the
 * user hits "Start over" — see handleReset in the parent.
 */
function RowImageCell({ row, userId, onImagesAdded, onImageRemoved, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [removingPath, setRemovingPath] = useState(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const fileInputRef = useRef(null);
  // A stable staging bucket per preview row — outlives re-renders and
  // is reused for every image on this row so cleanup is trivial.
  const stagingIdRef = useRef(null);
  if (!stagingIdRef.current) {
    stagingIdRef.current = `staging_${
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`
    }`;
  }

  const images = row.images || [];
  const remainingSlots = MAX_IMAGES_PER_PRODUCT - images.length;
  const canAdd = !uploading && !disabled && remainingSlots > 0 && !!userId;
  // Fixed 2-image viewport keeps the row height flat. Left/right
  // chevrons slide the window across the full image list.
  const WINDOW = 2;

  const handleFiles = useCallback(
    async (fileList) => {
      if (!userId || !fileList || fileList.length === 0) return;
      const files = Array.from(fileList).slice(0, remainingSlots);
      if (files.length === 0) return;

      const rejected = files.filter((f) => !IMAGE_MIME_ALLOW.test(f.type));
      if (rejected.length > 0) {
        toast.error('Only JPG, PNG, or WebP images are allowed.');
        return;
      }

      setUploading(true);
      setProgress({ done: 0, total: files.length });

      const storage = getStorageInstance();
      const uploaded = [];
      const startIndex = images.length;

      for (let i = 0; i < files.length; i++) {
        const raw = files[i];
        try {
          const compressed = await compressImage(raw, 'product');
          const ext = extForCompressed(compressed);
          const path = `users/${userId}/products/${stagingIdRef.current}/${Date.now()}_${startIndex + i}.${ext}`;
          const storageRef = ref(storage, path);
          const snap = await uploadBytes(storageRef, compressed, { contentType: compressed.type });
          const url = await getDownloadURL(snap.ref);
          uploaded.push({ url, path });
        } catch (err) {
          console.error('[RowImageCell] upload failed:', err);
          toast.error(
            `Upload failed for ${raw.name}.${
              err?.code === 'storage/unauthorized' ? ' File too large — max 800 KB after compression.' : ''
            }`,
          );
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }

      if (uploaded.length > 0) {
        onImagesAdded(uploaded);
        // Slide the viewport so the newly added images are the ones
        // visible — otherwise the member picks 3 files and sees the
        // first 2 stale placeholders instead of what they just added.
        setScrollOffset(Math.max(0, images.length + uploaded.length - WINDOW));
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [images.length, onImagesAdded, remainingSlots, userId],
  );

  const handleRemove = useCallback(
    async (path) => {
      setRemovingPath(path);
      await onImageRemoved(path);
      setRemovingPath(null);
    },
    [onImageRemoved],
  );

  // Fixed 2-image viewport keeps the row height flat. Left/right
  // chevrons slide the window across the full image list.
  const maxOffset = Math.max(0, images.length - WINDOW);
  const safeOffset = Math.min(scrollOffset, maxOffset);
  const visibleImages = images.slice(safeOffset, safeOffset + WINDOW);
  const showArrows = images.length > WINDOW;
  const canScrollLeft = showArrows && safeOffset > 0;
  const canScrollRight = showArrows && safeOffset < maxOffset;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={!canAdd}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.35)] text-[#FFD700] text-[11px] font-semibold hover:bg-[rgba(255,215,0,0.18)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
      >
        {uploading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress.done}/{progress.total}
          </>
        ) : (
          <>
            <ImagePlus className="w-3 h-3" />
            Add
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Thumbnail viewport — always renders 2 slots so the row height
          stays constant. Empty slots read as subtle placeholders. */}
      <div className="flex items-center gap-1">
        {Array.from({ length: WINDOW }).map((_, i) => {
          const img = visibleImages[i];
          if (!img) {
            return (
              <div
                key={`empty-${i}`}
                className="w-8 h-8 rounded border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
                aria-hidden="true"
              />
            );
          }
          return (
            <div
              key={img.path}
              className="relative w-8 h-8 rounded overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => handleRemove(img.path)}
                disabled={removingPath === img.path || disabled}
                aria-label="Remove image"
                className="absolute top-0 right-0 w-3.5 h-3.5 flex items-center justify-center bg-black/70 hover:bg-red-500/80 rounded-bl disabled:opacity-60 transition-colors"
              >
                {removingPath === img.path ? (
                  <Loader2 className="w-2 h-2 text-white animate-spin" />
                ) : (
                  <X className="w-2 h-2 text-white" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {showArrows && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setScrollOffset((o) => Math.max(0, o - 1))}
            disabled={!canScrollLeft || disabled}
            aria-label="Previous image"
            className="w-5 h-5 flex items-center justify-center rounded border border-[rgba(255,255,255,0.1)] text-white/70 hover:text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setScrollOffset((o) => Math.min(maxOffset, o + 1))}
            disabled={!canScrollRight || disabled}
            aria-label="Next image"
            className="w-5 h-5 flex items-center justify-center rounded border border-[rgba(255,255,255,0.1)] text-white/70 hover:text-white hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <span className="text-[10px] text-[#A0A0A0] tabular-nums ml-0.5">
        {images.length}/{MAX_IMAGES_PER_PRODUCT}
      </span>
    </div>
  );
}

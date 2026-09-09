import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { useImageCompress } from '../../hooks/useImageCompress';
import api from '../../lib/api';
import Spinner from './Spinner';

export default function FileUpload({
  label,
  docType, // e.g. 'aadhar_path', 'tenant_photo_path'
  currentPath,
  currentUrl,
  onUploaded,
  tenantId,
  accept = 'image/*',
  required = false,
  className = '',
}) {
  const [preview, setPreview] = useState(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const { compress, compressing } = useImageCompress();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      // 1. Compress image to WebP <= 300KB
      const compressed = await compress(file);
      if (!compressed) return;

      setPreview(compressed.previewUrl);
      setUploading(true);

      // 2. Upload via FormData
      const formData = new FormData();
      formData.append('file', compressed.file);
      formData.append('doc_type', docType);
      if (tenantId && tenantId !== 'undefined' && tenantId !== 'null') {
        formData.append('tenant_id', tenantId);
      }

      const res = await api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data?.path) {
        const newPath = res.data.data.path;
        if (onUploaded) {
          onUploaded(newPath);
        }
      } else {
        throw new Error(res.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Document upload error:', err);
      setUploadError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const isComplete = Boolean(currentPath || preview);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-500 dark:text-rose-400">*</span>}
          </span>
          {isComplete && (
            <span className="inline-flex items-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400 lowercase tracking-normal">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> uploaded
            </span>
          )}
        </label>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-smooth cursor-pointer ${
          isComplete
            ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-500/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-500/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {compressing || uploading ? (
          <div className="flex flex-col items-center py-2">
            <Spinner size="md" className="text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {compressing ? 'Compressing WebP...' : 'Uploading...'}
            </p>
          </div>
        ) : preview ? (
          <div className="flex items-center gap-3 w-full">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800">
              <img
                src={preview}
                alt={label}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {currentPath ? currentPath.split('/').pop() : 'Document attached'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                <RefreshCw className="w-3 h-3 mr-1" /> Click to replace photo
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            <UploadCloud className="h-7 w-7 text-slate-400 dark:text-slate-500 mb-1.5" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Upload <span className="text-blue-600 dark:text-blue-400">file / image</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Auto-compressed to WebP ≤ 300KB</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center">
          <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
          {uploadError}
        </p>
      )}
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { 
  X, 
  Globe, 
  Copy, 
  Check, 
  Share2, 
  DownloadCloud, 
  UploadCloud, 
  Smartphone, 
  Laptop, 
  Wifi,
  FileJson,
  Upload,
  Link,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { DashboardPage } from '../types';
import { 
  generateShareableUrl, 
  exportDashboardBackup, 
  readDashboardBackupFile 
} from '../utils/shareUtils';

interface ShareNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  cloudSyncStatus: 'synced' | 'saving' | 'syncing' | 'error';
  lastSyncedTime: string | null;
  pages: DashboardPage[];
  activePageId: string;
  onForceSaveToCloud: () => Promise<void>;
  onForcePullFromCloud: () => Promise<void>;
  onImportBackup: (pages: DashboardPage[], activePageId: string) => void;
}

export const ShareNetworkModal: React.FC<ShareNetworkModalProps> = ({
  isOpen,
  onClose,
  cloudSyncStatus,
  lastSyncedTime,
  pages,
  activePageId,
  onForceSaveToCloud,
  onForcePullFromCloud,
  onImportBackup,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCleanUrl, setCopiedCleanUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const fullDataShareUrl = generateShareableUrl(pages, activePageId);
  const cleanUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';

  const handleCopyFullDataLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullDataShareUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.warn('Failed to copy full data link:', err);
    }
  };

  const handleCopyCleanUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(cleanUrl);
      }
      setCopiedCleanUrl(true);
      setTimeout(() => setCopiedCleanUrl(false), 3000);
    } catch (err) {
      console.warn('Failed to copy clean URL:', err);
    }
  };

  const handleExportFile = () => {
    exportDashboardBackup(pages, activePageId);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const state = await readDashboardBackupFile(file);
      if (state.pages && state.pages.length > 0) {
        onImportBackup(state.pages, state.activePageId || state.pages[0].id);
        onClose();
      }
    } catch (err: any) {
      alert(`Gagal memuat file cadangan: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onForceSaveToCloud();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      await onForcePullFromCloud();
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Akses Dashboard Antar Device & Jaringan</h3>
              <p className="text-xs text-slate-500 font-medium">Buka dashboard lengkap di HP, laptop kantor/rumah, atau IP publik lainnya</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Method 1: Instant Universal Link (Recommended) */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Link className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-blue-950">
                    Opsi 1: Tautan Lengkap Instan (Direkomendasikan)
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                    100% Terbuka di Mana Saja
                  </span>
                </div>
                <p className="text-xs text-blue-800 font-medium mt-1 leading-relaxed">
                  Tautan ini langsung menyertakan seluruh data baris, grafik, filter, dan metrik dashboard dalam format terkompresi. Ketika dibuka di perangkat/jaringan lain, dashboard akan langsung muncul persis sama.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 bg-white border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono select-all truncate">
                {fullDataShareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyFullDataLink}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Link Lengkap</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Method 2: Export / Import File Cadangan */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <FileJson className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-sm text-emerald-950">
                  Opsi 2: Unduh / Muat File Cadangan Dashboard
                </span>
                <p className="text-xs text-emerald-800 font-medium mt-1 leading-relaxed">
                  Simpan dashboard dalam bentuk file <code>.json</code> untuk dipindahkan ke komputer lain, atau buka file cadangan yang pernah Anda simpan sebelumnya.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportFile}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4 text-emerald-600" />
                <span>Unduh File (.json)</span>
              </button>

              <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Muat File Cadangan</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Method 3: Server Cloud Autosave Status & Actions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-slate-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Status Server Autosave:
                </h4>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {cloudSyncStatus === 'saving' ? 'Menyimpan...' : 'Online Master'}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Data juga otomatis tersimpan di server cloud. {lastSyncedTime && `(Pembaruan terakhir: ${lastSyncedTime})`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className={`w-4 h-4 text-blue-600 ${isSaving ? 'animate-bounce' : ''}`} />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Ulang ke Server'}</span>
              </button>

              <button
                type="button"
                onClick={handlePull}
                disabled={isPulling}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <DownloadCloud className={`w-4 h-4 text-emerald-600 ${isPulling ? 'animate-bounce' : ''}`} />
                <span>{isPulling ? 'Memuat...' : 'Tarik dari Server'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Semua perangkat akan otomatis menyelaraskan data</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

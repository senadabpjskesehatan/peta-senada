import React, { useState } from 'react';
import { 
  X, FileSpreadsheet, Link2, Upload, FileText, 
  HelpCircle, RefreshCw, CheckCircle2, AlertCircle, ExternalLink,
  Copy, Sparkles, Globe, ShieldCheck, Check, FileCheck, Layers
} from 'lucide-react';
import { SyncConfig, ColumnDef, SheetRow } from '../types';
import { parseExcelBufferToRows, parseCSVToRows } from '../utils/dataProcessor';

interface GoogleSheetConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  activePageTitle?: string;
  onConnectUrl: (url: string, intervalSeconds: number, customName?: string, createNewPage?: boolean) => Promise<{ success: boolean; error?: string }>;
  onImportData: (data: { columns: ColumnDef[]; rows: SheetRow[] }, name: string, createNewPage?: boolean, sourceType?: 'csv' | 'excel', importMode?: 'replace' | 'append') => void;
  onImportCSV: (csvText: string, name: string, createNewPage?: boolean) => void;
}

const SAMPLE_PUBLIC_SHEETS = [
  {
    name: 'Data Penjualan & Transaksi',
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing',
    desc: 'Dataset publik penjualan produk, kategori, unit & pendapatan.',
  },
  {
    name: 'Data Karyawan & Payroll',
    url: 'https://docs.google.com/spreadsheets/d/1q6Qp-k9dG4BvE1P5gX9lRjP1O2Z3Y4W5V6U7T8S9R0Q/edit?usp=sharing',
    desc: 'Dataset publik departemen, posisi, gaji & status performa.',
  },
];

export const GoogleSheetConnectModal: React.FC<GoogleSheetConnectModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  activePageTitle,
  onConnectUrl,
  onImportData,
  onImportCSV,
}) => {
  const [tab, setTab] = useState<'url' | 'file' | 'paste'>('file');
  const [sheetUrl, setSheetUrl] = useState(syncConfig.sheetUrl || '');
  const [sheetName, setSheetName] = useState(syncConfig.sheetName !== 'Lembar Kerja Kosong' ? syncConfig.sheetName : '');
  const [interval, setInterval] = useState(syncConfig.intervalSeconds || 3600);
  const [targetDestination, setTargetDestination] = useState<'current' | 'new_page'>('current');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<'share' | 'publish'>('share');

  // Excel parsed state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelBuffer, setExcelBuffer] = useState<ArrayBuffer | null>(null);
  const [excelSheetNames, setExcelSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [parsedExcelData, setParsedExcelData] = useState<{ columns: ColumnDef[]; rows: SheetRow[] } | null>(null);
  
  // Progress status state: 'idle' | 'processing' | 'success' | 'error'
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  if (!isOpen) return null;

  const handleConnectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      setErrorMsg('Masukkan URL atau ID Google Spreadsheet');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await onConnectUrl(
      sheetUrl.trim(), 
      interval, 
      sheetName.trim(), 
      targetDestination === 'new_page'
    );
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Gagal memuat Google Sheet. Pastikan spreadsheet diset ke "Anyone with the link can view".');
    }
  };

  const processExcelBuffer = (buffer: ArrayBuffer, fileName: string, sheetToUse?: string) => {
    try {
      setUploadStatus('processing');
      setStatusMessage('Mengurai struktur baris dan kolom Excel/CSV...');
      const result = parseExcelBufferToRows(buffer, sheetToUse);
      if (!result.rows || result.rows.length === 0 || !result.columns || result.columns.length === 0) {
        throw new Error('Gagal upload: Format kolom tidak sesuai atau file Excel/CSV kosong.');
      }
      setExcelBuffer(buffer);
      setExcelSheetNames(result.sheetNames);
      setSelectedSheet(result.activeSheet);
      setParsedExcelData({ columns: result.columns, rows: result.rows });
      if (!sheetName) {
        setSheetName(fileName.replace(/\.[^/.]+$/, ''));
      }
      setUploadStatus('success');
      setStatusMessage(`Berhasil memuat ${result.rows.length} baris data dari "${fileName}".`);
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      const msg = err.message?.includes('Gagal upload') ? err.message : `Gagal upload: Format kolom tidak sesuai (${err.message || 'struktur file tidak valid'})`;
      setUploadStatus('error');
      setStatusMessage(msg);
      setErrorMsg(msg);
      setParsedExcelData(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setExcelFile(file);
    setUploadStatus('processing');
    setStatusMessage(`Sedang membaca file "${file.name}"...`);

    const reader = new FileReader();
    reader.onerror = () => {
      const msg = 'Gagal upload: Gagal membaca file dari penyimpanan lokal.';
      setUploadStatus('error');
      setStatusMessage(msg);
      setErrorMsg(msg);
    };
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (buffer) {
        processExcelBuffer(buffer, file.name);
      } else {
        const msg = 'Gagal upload: Buffer file kosong.';
        setUploadStatus('error');
        setStatusMessage(msg);
        setErrorMsg(msg);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (newSheet: string) => {
    if (!excelBuffer) return;
    setSelectedSheet(newSheet);
    processExcelBuffer(excelBuffer, excelFile?.name || 'Dataset Excel', newSheet);
  };

  const handleConfirmExcelImport = () => {
    if (!parsedExcelData || parsedExcelData.rows.length === 0 || parsedExcelData.columns.length === 0) {
      const msg = 'Gagal upload: Format kolom tidak sesuai atau belum ada data Excel yang valid.';
      setErrorMsg(msg);
      setUploadStatus('error');
      setStatusMessage(msg);
      return;
    }
    const finalName = sheetName.trim() || excelFile?.name.replace(/\.[^/.]+$/, '') || 'Data Excel Terimpor';
    onImportData(parsedExcelData, finalName, targetDestination === 'new_page', 'excel', importMode);
    onClose();
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) {
      setErrorMsg('Gagal upload: Format kolom tidak sesuai atau teks kosong.');
      return;
    }
    try {
      const parsed = parseCSVToRows(pasteContent.trim());
      if (!parsed.rows || parsed.rows.length === 0 || !parsed.columns || parsed.columns.length === 0) {
        throw new Error('Gagal upload: Format kolom tidak sesuai.');
      }
      onImportData(parsed, sheetName.trim() || 'Data Spreadsheet Kustom', targetDestination === 'new_page', 'csv', importMode);
      onClose();
    } catch (err: any) {
      const msg = err.message?.includes('Gagal upload') ? err.message : 'Gagal upload: Format kolom tidak sesuai.';
      setErrorMsg(msg);
    }
  };

  const useSampleSheet = (sample: { name: string; url: string }, index: number) => {
    setSheetUrl(sample.url);
    setSheetName(sample.name);
    setErrorMsg(null);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div id="google-sheet-connect-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Hubungkan / Unggah Spreadsheet</h3>
              <p className="text-xs text-slate-500">Impor data dari File Excel (.xlsx, .xls), Google Sheets, atau CSV</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/40">
          <button
            onClick={() => { setTab('file'); setErrorMsg(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              tab === 'file' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah File Excel / CSV</span>
          </button>
          <button
            onClick={() => { setTab('url'); setErrorMsg(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              tab === 'url' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Google Sheet URL / ID</span>
          </button>
          <button
            onClick={() => { setTab('paste'); setErrorMsg(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              tab === 'paste' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tempel Teks / CSV</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-700 space-y-4">
          
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-rose-900 text-sm">Terjadi Kesalahan</p>
                  <p className="mt-1 leading-relaxed text-rose-700 font-medium">{errorMsg}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: UPLOAD FILE EXCEL / CSV */}
          {tab === 'file' && (
            <div className="space-y-4">
              
              {/* Progress Status Banner */}
              {uploadStatus === 'processing' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm">Sedang Memproses Data...</p>
                    <p className="text-xs text-blue-700 mt-0.5">{statusMessage || 'Membaca dan mengurai baris file...'}</p>
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && statusMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs">Berhasil Memuat File</p>
                    <p className="text-[11px] text-emerald-700">{statusMessage}</p>
                  </div>
                </div>
              )}

              {uploadStatus === 'error' && statusMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs">Gagal Memproses File</p>
                    <p className="text-[11px] text-rose-700">{statusMessage}</p>
                  </div>
                </div>
              )}

              {/* Pilihan Metode Upload: Mengganti Keseluruhan atau Menambahkan Data */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-xs">
                <label className="block text-slate-800 font-extrabold text-xs">
                  Pilih Metode Unggah File:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'replace' ? 'bg-emerald-50/60 border-emerald-500 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="preUploadImportMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-slate-950">Mengganti Data Keseluruhan</span>
                      <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">Timpa seluruh data lama di halaman aktif dengan data baru</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'append' ? 'bg-emerald-50/60 border-emerald-500 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="preUploadImportMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-slate-950">Menambahkan Data</span>
                      <span className="block text-[11px] text-slate-500 leading-tight mt-0.5">Gabung baris baru sesuai struktur kolom data pertama</span>
                    </div>
                  </label>
                </div>
              </div>

              {!parsedExcelData ? (
                <div className="space-y-4 text-center py-2">
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-emerald-50/20 hover:bg-emerald-50/40 group">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center text-emerald-700 mb-3 transition-colors">
                      <FileSpreadsheet className="w-7 h-7" />
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">Pilih atau Seret File Excel (.xlsx, .xls) / CSV</span>
                    <span className="text-slate-500 text-xs mt-1">Mendukung Microsoft Excel (.xlsx, .xls), OpenDocument (.ods), dan .csv</span>
                    <span className="inline-block mt-3 px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs">
                      Pilih File dari Komputer
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.ods,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                /* EXCEL PREVIEW & SHEET SELECTION */
                <div className="space-y-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{excelFile?.name}</h4>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          {parsedExcelData.rows.length} baris data ditemukan &bull; {parsedExcelData.columns.length} kolom terdeteksi
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setParsedExcelData(null);
                        setExcelFile(null);
                        setExcelBuffer(null);
                      }}
                      className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-100"
                    >
                      Ganti File
                    </button>
                  </div>

                  {/* Multi-Sheet Selector if Workbook has > 1 Sheet */}
                  {excelSheetNames.length > 1 && (
                    <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-1.5">
                      <label className="block text-slate-800 font-bold text-xs">
                        Pilih Lembar Kerja (Sheet Tab Excel):
                      </label>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                      >
                        {excelSheetNames.map((name) => (
                          <option key={name} value={name}>
                            📄 Sheet: {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Custom Page Name */}
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      Nama Dataset / Halaman:
                    </label>
                    <input
                      type="text"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="Contoh: Laporan Penjualan Excel 2025"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
                    />
                  </div>

                  {/* Column Badges Preview */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Kolom yang Terdeteksi ({parsedExcelData.columns.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-xl border border-emerald-100">
                      {parsedExcelData.columns.map((c) => (
                        <span 
                          key={c.key} 
                          className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                            c.type === 'number' 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : c.type === 'date'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.label} ({c.type})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Target Halaman Dashboard */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <label className="block text-slate-800 font-bold text-xs">
                      Tujuan Penyimpanan / Halaman Dashboard:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        targetDestination === 'current' 
                          ? 'bg-emerald-50/50 border-emerald-500 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="targetDestinationExcel"
                          checked={targetDestination === 'current'}
                          onChange={() => setTargetDestination('current')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-left">
                          <span className="block text-xs font-bold text-slate-800">
                            Perbarui Halaman Aktif
                          </span>
                          <span className="block text-[10px] text-slate-500 truncate max-w-[170px]">
                            {activePageTitle || 'Halaman saat ini'}
                          </span>
                        </div>
                      </label>

                      <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        targetDestination === 'new_page' 
                          ? 'bg-emerald-50/50 border-emerald-500 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="targetDestinationExcel"
                          checked={targetDestination === 'new_page'}
                          onChange={() => setTargetDestination('new_page')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-left">
                          <span className="block text-xs font-bold text-slate-800">
                            + Buat Halaman Baru
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            Data disimpan di tab halaman terpisah
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Import Mode: Replace vs Append (Only when updating current page) */}
                    {targetDestination === 'current' && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 animate-in fade-in duration-200">
                        <label className="block text-slate-700 font-bold text-[11px]">
                          Metode Pembaruan Data:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            importMode === 'replace' ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}>
                            <input
                              type="radio"
                              name="importModeRadio"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="text-left">
                              <span className="block text-[11px] font-bold text-slate-800">Ganti Data</span>
                              <span className="block text-[9px] text-slate-500">Timpa data lama</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                            importMode === 'append' ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-200 hover:bg-white'
                          }`}>
                            <input
                              type="radio"
                              name="importModeRadio"
                              checked={importMode === 'append'}
                              onChange={() => setImportMode('append')}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="text-left">
                              <span className="block text-[11px] font-bold text-slate-800">Tambah Data</span>
                              <span className="block text-[9px] text-slate-500">Gabung ke data lama</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmExcelImport}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Impor Data File ({parsedExcelData.rows.length} Baris)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GOOGLE SHEET URL */}
          {tab === 'url' && (
            <form onSubmit={handleConnectUrl} className="space-y-4">
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  URL Google Spreadsheet, Link Bagikan, atau ID Sheet *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none text-xs font-medium pr-10"
                  />
                  {sheetUrl && (
                    <button
                      type="button"
                      onClick={() => setSheetUrl('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung: Link Bagikan (Share Link), Link Publikasi Web (Publish to Web), atau Sheet ID langsung.
                </p>
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Nama Lembar Kerja / Judul Spreadsheet (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Laporan Penjualan Q1 (otomatis terdeteksi jika dikosongkan)"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Interval Sinkronisasi Otomatis
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
                >
                  <option value="3600">Sync Tiap 1 Jam (Otomatis)</option>
                  <option value="0">Manual (Hanya sinkronisasi saat tombol Update ditekan)</option>
                </select>
              </div>

              {/* Target Halaman Dashboard */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <label className="block text-slate-800 font-bold text-xs">
                  Tujuan Penyimpanan / Halaman Dashboard:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    targetDestination === 'current' 
                      ? 'bg-white border-blue-500 shadow-xs' 
                      : 'bg-slate-100/60 border-slate-200 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="targetDestination"
                      checked={targetDestination === 'current'}
                      onChange={() => setTargetDestination('current')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-slate-800">
                        Perbarui Halaman Aktif
                      </span>
                      <span className="block text-[10px] text-slate-500 truncate max-w-[170px]">
                        {activePageTitle || 'Halaman saat ini'}
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    targetDestination === 'new_page' 
                      ? 'bg-white border-emerald-500 shadow-xs' 
                      : 'bg-slate-100/60 border-slate-200 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="targetDestination"
                      checked={targetDestination === 'new_page'}
                      onChange={() => setTargetDestination('new_page')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-slate-800">
                        + Buat Halaman Baru
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Data disimpan di tab halaman terpisah
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sample Quick Tester */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Uji Cepat dengan Google Sheet Publik:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SAMPLE_PUBLIC_SHEETS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => useSampleSheet(sample, idx)}
                      className="text-left p-2.5 rounded-xl border border-blue-200/80 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 group-hover:text-blue-600 text-xs">
                          {sample.name}
                        </span>
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{sample.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step-by-step Interactive Guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Panduan Pengaturan Izin Google Sheet</span>
                  </div>
                  <div className="flex gap-1 bg-slate-200/70 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('share')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        activeGuideTab === 'share' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Opsi 1: Share Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('publish')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        activeGuideTab === 'publish' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Opsi 2: Publikasi Web (100% Bebas Blokir)
                    </button>
                  </div>
                </div>

                {activeGuideTab === 'share' ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
                    <li>Buka Google Sheet Anda di browser.</li>
                    <li>Klik tombol <strong className="text-slate-900">Share (Bagikan)</strong> di pojok kanan atas.</li>
                    <li>Di bagian <strong>Akses umum (General access)</strong>, ubah ke <strong className="text-blue-600 font-bold">"Anyone with the link" (Siapa saja yang memiliki tautan)</strong>.</li>
                    <li>Pastikan role diatur sebagai <strong className="text-slate-900">"Viewer" (Pelihat)</strong>.</li>
                    <li>Klik <strong className="text-slate-900">Copy link (Salin link)</strong> dan tempelkan ke kolom URL di atas.</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
                    <li>Buka Google Sheet Anda di browser.</li>
                    <li>Klik menu <strong className="text-slate-900">File</strong> &rarr; <strong className="text-slate-900">Share (Bagikan)</strong> &rarr; <strong className="text-blue-600 font-bold">Publish to web (Publikasikan ke web)</strong>.</li>
                    <li>Pilih tab sheet atau seluruh dokumen, lalu pilih format <strong className="text-slate-900">"Comma-separated values (.csv)"</strong> atau Link standar.</li>
                    <li>Klik tombol <strong className="text-slate-900">Publish (Publikasikan)</strong> dan salin link yang dihasilkan.</li>
                    <li>Tempelkan link ke kolom URL di atas. Metode ini bekerja 100% bahkan di akun Google Workspace perusahaan!</li>
                  </ol>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menghubungkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hubungkan & Sinkronkan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PASTE TEXT / CSV */}
          {tab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Tempelkan Format CSV / TSV / Tabel Teks
                </label>
                <textarea
                  rows={8}
                  placeholder={`Tanggal,Produk,Kategori,Jumlah,Total_Pendapatan\n2025-01-01,Laptop,Elektronik,5,75000000\n2025-01-02,Mouse,Aksesoris,10,3000000`}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-slate-900 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  Impor Data
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};

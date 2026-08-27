import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  FileSpreadsheet, 
  Sparkles, 
  Plus, 
  Check, 
  Trash2, 
  Link,
  Copy,
  TrendingUp,
  DollarSign,
  Package,
  FileText
} from 'lucide-react';
import { DashboardPage, PageColorTheme, DatasetPreset } from '../types';
import { PRESET_DATASETS } from '../data/sampleDatasets';

interface PageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  editingPage?: DashboardPage | null;
  activePage?: DashboardPage;
  onSavePage: (pageData: {
    title: string;
    description: string;
    color: PageColorTheme;
    sourceType?: 'blank' | 'sheet_url' | 'preset' | 'duplicate';
    presetId?: string;
    sheetUrl?: string;
  }) => Promise<void> | void;
  onDeletePage?: (pageId: string) => void;
}

const COLOR_OPTIONS: { id: PageColorTheme; label: string; bg: string; border: string }[] = [
  { id: 'blue', label: 'Biru', bg: 'bg-blue-500', border: 'border-blue-500' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-500' },
  { id: 'emerald', label: 'Hijau Zamrud', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { id: 'amber', label: 'Kuning Amber', bg: 'bg-amber-500', border: 'border-amber-500' },
  { id: 'rose', label: 'Merah Rose', bg: 'bg-rose-500', border: 'border-rose-500' },
  { id: 'cyan', label: 'Sian Cyan', bg: 'bg-cyan-500', border: 'border-cyan-500' },
  { id: 'purple', label: 'Ungu Purple', bg: 'bg-purple-500', border: 'border-purple-500' },
  { id: 'slate', label: 'Abu-abu Slate', bg: 'bg-slate-500', border: 'border-slate-500' },
];

export const PageManagerModal: React.FC<PageManagerModalProps> = ({
  isOpen,
  onClose,
  mode,
  editingPage,
  activePage,
  onSavePage,
  onDeletePage,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<PageColorTheme>('blue');
  const [sourceType, setSourceType] = useState<'blank' | 'sheet_url' | 'preset' | 'duplicate'>('blank');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('sales_ecommerce');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && editingPage) {
        setTitle(editingPage.title);
        setDescription(editingPage.description || '');
        setColor(editingPage.color || 'blue');
      } else {
        setTitle('');
        setDescription('');
        setColor('blue');
        setSourceType('blank');
        setSheetUrl('');
        setErrorMsg(null);
      }
    }
  }, [isOpen, mode, editingPage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Harap masukkan judul halaman.');
      return;
    }

    if (mode === 'create' && sourceType === 'sheet_url' && !sheetUrl.trim()) {
      setErrorMsg('Harap masukkan URL atau ID Google Sheet yang valid.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSavePage({
        title: title.trim(),
        description: description.trim(),
        color,
        sourceType,
        presetId: selectedPresetId,
        sheetUrl: sheetUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses halaman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {mode === 'create' ? 'Tambah Halaman Baru' : 'Pengaturan Halaman'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {mode === 'create' 
                  ? 'Buat halaman terpisah untuk menganalisis data atau Google Sheet lain' 
                  : `Kelola judul, warna, dan deskripsi halaman "${editingPage?.title}"`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Judul Halaman */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Judul Halaman <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Laporan Penjualan Q1 / Data Inventori Senada"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none transition-all"
            />
          </div>

          {/* Deskripsi Singkat */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Keterangan / Deskripsi (Opsional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Pantauan metrik performa mingguan dan status transaksi"
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none transition-all"
            />
          </div>

          {/* Tema Warna Aksen */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
              Warna Aksen Halaman
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    color === c.id 
                      ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  title={c.label}
                >
                  <span className={`w-5 h-5 rounded-full ${c.bg} shadow-xs flex items-center justify-center text-white`}>
                    {color === c.id && <Check className="w-3 h-3 stroke-3" />}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sumber Data Awal (Only in Create mode) */}
          {mode === 'create' && (
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                Pilih Sumber Data Awal
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Lembar Kerja Kosong */}
                <div
                  onClick={() => setSourceType('blank')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    sourceType === 'blank'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <FileText className={`w-5 h-5 mt-0.5 ${sourceType === 'blank' ? 'text-blue-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Lembar Kerja Kosong</span>
                    <span className="text-[11px] text-slate-500 font-medium">Mulai dari 0 baris data</span>
                  </div>
                </div>

                {/* 2. Hubungkan Google Sheet */}
                <div
                  onClick={() => setSourceType('sheet_url')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    sourceType === 'sheet_url'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <FileSpreadsheet className={`w-5 h-5 mt-0.5 ${sourceType === 'sheet_url' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Google Sheet Baru</span>
                    <span className="text-[11px] text-slate-500 font-medium">Sinkronkan URL sheet</span>
                  </div>
                </div>

                {/* 3. Template Bawaan */}
                <div
                  onClick={() => setSourceType('preset')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    sourceType === 'preset'
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 mt-0.5 ${sourceType === 'preset' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Template Sampel</span>
                    <span className="text-[11px] text-slate-500 font-medium">Penjualan / Keuangan</span>
                  </div>
                </div>

                {/* 4. Duplikat Halaman Aktif */}
                {activePage && (
                  <div
                    onClick={() => setSourceType('duplicate')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      sourceType === 'duplicate'
                        ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <Copy className={`w-5 h-5 mt-0.5 ${sourceType === 'duplicate' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Salin Halaman Aktif</span>
                      <span className="text-[11px] text-slate-500 font-medium">Duplikat tabel & grafik</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-form when Google Sheet selected */}
              {sourceType === 'sheet_url' && (
                <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    URL Google Sheet
                  </label>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Pastikan Google Sheet telah dibagikan publik (Siapa saja yang memiliki link).
                  </p>
                </div>
              )}

              {/* Sub-form when Template selected */}
              {sourceType === 'preset' && (
                <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Pilih Template
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {PRESET_DATASETS.filter(p => p.id !== 'blank_dataset').map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.rows.length} baris)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Edit Mode Info / Danger Zone */}
          {mode === 'edit' && editingPage && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                <span>Total Data: <strong>{editingPage.rows.length} baris</strong> • <strong>{editingPage.charts.length} grafik</strong></span>
              </div>
              {onDeletePage && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Yakin ingin menghapus halaman "${editingPage.title}"?`)) {
                      onDeletePage(editingPage.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Halaman Ini</span>
                </button>
              )}
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-blue-600 shadow-md shadow-slate-900/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : mode === 'create' ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Buat Halaman</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

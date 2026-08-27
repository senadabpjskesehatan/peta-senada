import React, { useState, useEffect } from 'react';
import { X, BarChart3, LineChart as LineIcon, PieChart as PieIcon, Activity, Sparkles, Check } from 'lucide-react';
import { ChartConfig, ColumnDef, ChartType, AggregationType, SheetRow } from '../types';
import { COLOR_THEMES } from '../utils/dataProcessor';

interface ChartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chart: ChartConfig) => void;
  editingChart: ChartConfig | null;
  columns: ColumnDef[];
  rows: SheetRow[];
}

const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: 'bar', label: 'Diagram Batang (Bar)' },
  { id: 'line', label: 'Diagram Garis (Line)' },
  { id: 'area', label: 'Diagram Area' },
  { id: 'donut', label: 'Diagram Donat (Donut)' },
  { id: 'pie', label: 'Diagram Lingkaran (Pie)' },
  { id: 'radar', label: 'Diagram Radar' },
  { id: 'composed', label: 'Kombinasi Batang + Garis' },
];

const THEME_OPTIONS = [
  { id: 'indigo', label: 'Geometric Blue', color: '#2563eb' },
  { id: 'emerald', label: 'Emerald Green', color: '#059669' },
  { id: 'cyan', label: 'Cyan Teal', color: '#0891b2' },
  { id: 'purple', label: 'Royal Purple', color: '#7c3aed' },
  { id: 'amber', label: 'Amber Gold', color: '#d97706' },
  { id: 'rose', label: 'Rose Red', color: '#e11d48' },
];

export const ChartBuilderModal: React.FC<ChartBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingChart,
  columns,
  rows,
}) => {
  const numericColumns = columns.filter(c => c.isNumeric || c.type === 'number');
  const stringOrDateColumns = columns.filter(c => c.type === 'string' || c.type === 'date');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChartType>('bar');
  const [xAxisKey, setXAxisKey] = useState('');
  const [yAxisKey, setYAxisKey] = useState('');
  const [secondaryYAxisKey, setSecondaryYAxisKey] = useState('');
  const [aggregation, setAggregation] = useState<AggregationType>('SUM');
  const [colorTheme, setColorTheme] = useState('indigo');
  const [gridSpan, setGridSpan] = useState<1 | 2>(1);
  const [sortBy, setSortBy] = useState<'value' | 'label' | 'none'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [limit, setLimit] = useState<number>(0);
  const [dataRankView, setDataRankView] = useState<'all' | 'top10' | 'bottom10'>('all');
  const [isCurrency, setIsCurrency] = useState(false);
  const [unit, setUnit] = useState('');

  useEffect(() => {
    if (editingChart) {
      setTitle(editingChart.title);
      setDescription(editingChart.description || '');
      setType(editingChart.type);
      setXAxisKey(editingChart.xAxisKey);
      setYAxisKey(editingChart.yAxisKey);
      setSecondaryYAxisKey(editingChart.secondaryYAxisKey || '');
      setAggregation(editingChart.aggregation);
      setColorTheme(editingChart.colorTheme || 'indigo');
      setGridSpan(editingChart.gridSpan || 1);
      setSortBy(editingChart.sortBy || 'value');
      setSortDirection(editingChart.sortDirection || 'desc');
      setLimit(editingChart.limit || 0);
      setDataRankView(editingChart.dataRankView || 'all');
      setIsCurrency(!!editingChart.isCurrency);
      setUnit(editingChart.unit || '');
    } else {
      const defX = stringOrDateColumns[0]?.key || columns[0]?.key || '';
      const defY = numericColumns[0]?.key || columns[1]?.key || '';
      setTitle('Grafik Analisis Baru');
      setDescription('Visualisasi metrik Google Sheet');
      setType('bar');
      setXAxisKey(defX);
      setYAxisKey(defY);
      setSecondaryYAxisKey('');
      setAggregation('SUM');
      setColorTheme('indigo');
      setGridSpan(1);
      setSortBy('value');
      setSortDirection('desc');
      setLimit(0);
      setDataRankView('all');
      setIsCurrency(/pendapatan|omset|biaya|harga|gaji|nilai/i.test(defY));
      setUnit(/pendapatan|omset|biaya|harga|gaji|nilai/i.test(defY) ? 'Rp' : '');
    }
  }, [editingChart, isOpen, columns]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !xAxisKey || !yAxisKey) return;

    const chartConfig: ChartConfig = {
      id: editingChart ? editingChart.id : `chart-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      xAxisKey,
      yAxisKey,
      secondaryYAxisKey: secondaryYAxisKey || undefined,
      aggregation,
      colorTheme,
      gridSpan,
      sortBy,
      sortDirection,
      limit: limit > 0 ? limit : undefined,
      dataRankView,
      isCurrency,
      unit: unit.trim() || (isCurrency ? 'Rp' : undefined),
      createdAt: editingChart?.createdAt || Date.now(),
    };

    onSave(chartConfig);
    onClose();
  };

  return (
    <div id="chart-builder-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {editingChart ? 'Edit Konfigurasi Grafik' : 'Buat Grafik Visualisasi Baru'}
              </h3>
              <p className="text-xs text-slate-500">Sesuaikan jenis visualisasi, sumbu dimensi, dan format ukuran</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          
          {/* Title & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Judul Grafik *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Total Penjualan per Wilayah"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Deskripsi Tambahan</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan singkat analisis"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
              />
            </div>
          </div>

          {/* Chart Type Selection */}
          <div>
            <label className="block text-slate-700 font-bold mb-2">Pilih Tipe Visualisasi *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CHART_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                    type === t.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sumbu X & Metrik Y */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Kolom Sumbu X (Kategori / Dimensi) *</label>
              <select
                value={xAxisKey}
                onChange={(e) => setXAxisKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Kolom Metrik Y (Nilai Ukuran) *</label>
              <select
                value={yAxisKey}
                onChange={(e) => {
                  setYAxisKey(e.target.value);
                  if (/pendapatan|omset|biaya|harga|gaji|nilai/i.test(e.target.value)) {
                    setIsCurrency(true);
                    setUnit('Rp');
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} {c.isNumeric ? '(Angka)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Metric for Composed */}
          {type === 'composed' && (
            <div>
              <label className="block text-slate-700 font-bold mb-1">Metrik Sekunder (Garis) *</label>
              <select
                value={secondaryYAxisKey}
                onChange={(e) => setSecondaryYAxisKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
              >
                <option value="">-- Pilih Metrik Garis Sekunder --</option>
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Aggregation & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Fungsi Agregasi Data</label>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value as AggregationType)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none text-xs font-medium"
              >
                <option value="SUM">SUM (Jumlahkan Nilai)</option>
                <option value="AVG">AVG (Rata-rata Nilai)</option>
                <option value="COUNT">COUNT (Hitung Jumlah Baris)</option>
                <option value="MAX">MAX (Nilai Tertinggi)</option>
                <option value="MIN">MIN (Nilai Terendah)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Tema Palet Warna</label>
              <div className="flex items-center gap-2 pt-1">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    type="button"
                    key={theme.id}
                    onClick={() => setColorTheme(theme.id)}
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all ${
                      colorTheme === theme.id ? 'ring-2 ring-blue-600 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: theme.color, borderColor: '#cbd5e1' }}
                    title={theme.label}
                  >
                    {colorTheme === theme.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Top 10 & Bottom 10 Ranking Options */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl">
            <label className="block text-slate-800 font-extrabold text-xs mb-2">
              Pilihan Peringkat Data (Top / Bottom 10):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDataRankView('all')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  dataRankView === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {dataRankView === 'all' && <Check className="w-3.5 h-3.5" />}
                <span>Semua Data</span>
              </button>

              <button
                type="button"
                onClick={() => setDataRankView('top10')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  dataRankView === 'top10'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-amber-900 hover:bg-amber-50 border-amber-200'
                }`}
              >
                {dataRankView === 'top10' && <Check className="w-3.5 h-3.5" />}
                <span>★ 10 Top Data</span>
              </button>

              <button
                type="button"
                onClick={() => setDataRankView('bottom10')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  dataRankView === 'bottom10'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-indigo-900 hover:bg-indigo-50 border-indigo-200'
                }`}
              >
                {dataRankView === 'bottom10' && <Check className="w-3.5 h-3.5" />}
                <span>▼ 10 Bottom Data</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Pengaturan ini juga dapat diaktifkan/dinonaktifkan sewaktu-waktu langsung melalui menu checklist pada masing-masing kartu grafik.
            </p>
          </div>

          {/* Sort & Format options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <label className="block text-slate-600 font-bold mb-1">Urutkan Data</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-medium"
              >
                <option value="value">Berdasarkan Nilai (Value)</option>
                <option value="label">Berdasarkan Label (A-Z)</option>
                <option value="none">Sesuai Urutan Asli</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Arah Urutan</label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs font-medium"
              >
                <option value="desc">Tertinggi ke Terendah (Desc)</option>
                <option value="asc">Terendah ke Tertinggi (Asc)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">Format Mata Uang / Unit</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCurrency}
                    onChange={(e) => {
                      setIsCurrency(e.target.checked);
                      if (e.target.checked && !unit) setUnit('Rp');
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span>(Rp)</span>
                </label>
                <input
                  type="text"
                  placeholder="Unit (Pcs)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Width Span */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-bold text-slate-700">Lebar Tampilan Grid:</span>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setGridSpan(1)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  gridSpan === 1 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1 Kolom
              </button>
              <button
                type="button"
                onClick={() => setGridSpan(2)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  gridSpan === 2 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2 Kolom (Full)
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105"
            >
              {editingChart ? 'Simpan Perubahan' : 'Tambahkan Grafik'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

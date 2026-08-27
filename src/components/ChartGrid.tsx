import React from 'react';
import { ChartConfig, SheetRow } from '../types';
import { ChartCard } from './ChartCard';
import { Plus, BarChart3, Clock, ArrowDownUp } from 'lucide-react';

interface ChartGridProps {
  charts: ChartConfig[];
  rows: SheetRow[];
  onEditChart: (chart: ChartConfig) => void;
  onDuplicateChart: (chart: ChartConfig) => void;
  onDeleteChart: (chartId: string) => void;
  onAddChart: () => void;
  onUpdateChart?: (chart: ChartConfig) => void;
  onReorderCharts?: (charts: ChartConfig[]) => void;
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  charts,
  rows,
  onEditChart,
  onDuplicateChart,
  onDeleteChart,
  onAddChart,
  onUpdateChart,
  onReorderCharts,
}) => {
  if (charts.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center mb-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900 mb-1">Belum Ada Grafik Visualisasi</h3>
        <p className="text-sm text-slate-500 max-w-md mb-5 leading-relaxed">
          Buat grafik kustom pertama Anda untuk memvisualisasikan data Google Sheet dengan diagram batang, garis, area, pie, atau radar.
        </p>
        <button
          onClick={onAddChart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Grafik Pertama</span>
        </button>
      </div>
    );
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0 || !onReorderCharts) return;
    const updated = [...charts];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onReorderCharts(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= charts.length - 1 || !onReorderCharts) return;
    const updated = [...charts];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onReorderCharts(updated);
  };

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Visualizations
            </h2>
            <span className="text-xs bg-blue-50 text-blue-700 font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
              {charts.length} Grafik
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <Clock className="w-3 h-3 text-slate-400" />
              Sesuai Urutan Pembuatan (#1 - #{charts.length})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Grafik pertama berada di urutan #1. Dilengkapi opsi checklist 10 Top &amp; Bottom Data pada setiap grafik.
          </p>
        </div>

        <button
          onClick={onAddChart}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs shadow-blue-500/10 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Tambah Grafik</span>
        </button>
      </div>

      {/* Grid of Chart Cards in Strict Creation Sequence */}
      <div id="charts-grid-container" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart, index) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            rows={rows}
            chartIndex={index + 1}
            totalCharts={charts.length}
            onEdit={onEditChart}
            onDuplicate={onDuplicateChart}
            onDelete={onDeleteChart}
            onUpdateChart={onUpdateChart}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
          />
        ))}
      </div>
    </div>
  );
};

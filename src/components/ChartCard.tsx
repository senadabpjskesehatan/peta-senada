import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { 
  Edit3, Trash2, Copy, Activity, MoreVertical, 
  Check, ArrowUp, ArrowDown, ListFilter, Sparkles,
  ChevronUp, ChevronDown, CheckSquare, Square
} from 'lucide-react';
import { ChartConfig, SheetRow } from '../types';
import { prepareChartData, formatCompactNumber, formatCurrency, COLOR_THEMES } from '../utils/dataProcessor';

interface ChartCardProps {
  chart: ChartConfig;
  rows: SheetRow[];
  chartIndex?: number;
  totalCharts?: number;
  onEdit: (chart: ChartConfig) => void;
  onDuplicate: (chart: ChartConfig) => void;
  onDelete: (chartId: string) => void;
  onUpdateChart?: (updatedChart: ChartConfig) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  chart,
  rows,
  chartIndex,
  totalCharts,
  onEdit,
  onDuplicate,
  onDelete,
  onUpdateChart,
  onMoveUp,
  onMoveDown,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const chartData = useMemo(() => prepareChartData(rows, chart), [rows, chart]);
  const theme = COLOR_THEMES[chart.colorTheme] || COLOR_THEMES.indigo;

  // Toggle Top 10 / Bottom 10 checklist
  const handleToggleDataRank = (targetView: 'top10' | 'bottom10') => {
    const currentView = chart.dataRankView || 'all';
    // If already active, uncheck it to 'all', otherwise check the targetView
    const newView = currentView === targetView ? 'all' : targetView;
    if (onUpdateChart) {
      onUpdateChart({
        ...chart,
        dataRankView: newView,
      });
    }
  };

  const handleSelectAllData = () => {
    if (onUpdateChart) {
      onUpdateChart({
        ...chart,
        dataRankView: 'all',
      });
    }
  };

  const isTop10Checked = chart.dataRankView === 'top10';
  const isBottom10Checked = chart.dataRankView === 'bottom10';
  const isAllChecked = !chart.dataRankView || chart.dataRankView === 'all';

  // Custom tooltip formatter in Geometric Balance light theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-bold text-slate-900 mb-1 border-b border-slate-100 pb-1">{label || chart.title}</p>
          {payload.map((entry: any, index: number) => {
            const isCurr = chart.isCurrency || entry.name.includes('Pendapatan') || entry.name.includes('Pemasukan') || entry.name.includes('Biaya') || entry.name.includes('Harga');
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || theme.primary }}></span>
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-900">
                  {isCurr ? formatCurrency(entry.value, chart.unit || 'Rp') : `${formatCompactNumber(entry.value)} ${chart.unit || ''}`}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderChartGraphic = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
          <Activity className="w-8 h-8 opacity-40" />
          <span>Tidak ada data untuk kombinasi filter dan grafik ini</span>
        </div>
      );
    }

    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                axisLine={{ stroke: '#e2e8f0' }} 
                tickLine={false}
                angle={-20}
                textAnchor="end"
                interval={0}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(v) => formatCompactNumber(v, chart.isCurrency)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                name={chart.yAxisKey.replace(/_/g, ' ')} 
                fill={theme.primary} 
                radius={[6, 6, 0, 0]} 
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />
                ))}
              </Bar>
              {chart.secondaryYAxisKey && (
                <Bar 
                  dataKey="secondaryValue" 
                  name={chart.secondaryYAxisKey.replace(/_/g, ' ')} 
                  fill={theme.secondary} 
                  radius={[6, 6, 0, 0]} 
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                axisLine={{ stroke: '#e2e8f0' }} 
                tickLine={false}
                angle={-20}
                textAnchor="end"
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(v) => formatCompactNumber(v, chart.isCurrency)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                name={chart.yAxisKey.replace(/_/g, ' ')} 
                stroke={theme.primary} 
                strokeWidth={3} 
                dot={{ r: 4, fill: theme.primary, stroke: '#ffffff', strokeWidth: 2 }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
              <defs>
                <linearGradient id={`grad-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={theme.primary} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                axisLine={{ stroke: '#e2e8f0' }} 
                tickLine={false}
                angle={-20}
                textAnchor="end"
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(v) => formatCompactNumber(v, chart.isCurrency)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                name={chart.yAxisKey.replace(/_/g, ' ')} 
                stroke={theme.primary} 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill={`url(#grad-${chart.id})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={chart.type === 'donut' ? 60 : 0}
                outerRadius={95}
                paddingAngle={chart.type === 'donut' ? 3 : 1}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                formatter={(val) => <span className="text-xs font-medium text-slate-700">{val}</span>} 
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
            <RadarChart cx="50%" cy="50%" outerRadius={90} data={chartData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar 
                name={chart.yAxisKey.replace(/_/g, ' ')} 
                dataKey="value" 
                stroke={theme.primary} 
                fill={theme.primary} 
                fillOpacity={0.3} 
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={280} minWidth={0} debounce={50}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                axisLine={{ stroke: '#e2e8f0' }} 
                tickLine={false}
                angle={-20}
                textAnchor="end"
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(v) => formatCompactNumber(v, chart.isCurrency)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                name={chart.yAxisKey.replace(/_/g, ' ')} 
                fill={theme.primary} 
                radius={[6, 6, 0, 0]} 
              />
              {chart.secondaryYAxisKey && (
                <Line 
                  type="monotone" 
                  dataKey="secondaryValue" 
                  name={chart.secondaryYAxisKey.replace(/_/g, ' ')} 
                  stroke={theme.secondary} 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: theme.secondary, stroke: '#ffffff', strokeWidth: 2 }} 
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      id={`chart-card-${chart.id}`}
      className={`bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between shadow-xs transition-all hover:shadow-md min-w-0 overflow-visible relative ${
        chart.gridSpan === 2 ? 'lg:col-span-2' : 'col-span-1'
      }`}
    >
      {/* Header with Title, Sequence Order, Top/Bottom Checklist Menu, and Actions */}
      <div className="flex flex-col gap-2.5 mb-3">
        <div className="flex items-start justify-between gap-2">
          
          {/* Left: Title & Creation Sequence Badge */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Creation Sequence Order Badge (#1, #2, ...) */}
              {chartIndex !== undefined && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0" title={`Grafik urutan ke-${chartIndex} (Sesuai waktu pembuatan)`}>
                  Grafik #{chartIndex}
                </span>
              )}
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate">{chart.title}</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                {chart.type} • {chart.aggregation}
              </span>
            </div>
            {chart.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{chart.description}</p>
            )}
          </div>

          {/* Right: Menu Dropdown & Action Toolbar */}
          <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
            
            {/* Quick Move Up/Down Controls (if totalCharts > 1) */}
            {onMoveUp && chartIndex && chartIndex > 1 && (
              <button
                type="button"
                onClick={onMoveUp}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Pindahkan grafik ke urutan sebelumnya"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}
            {onMoveDown && chartIndex && totalCharts && chartIndex < totalCharts && (
              <button
                type="button"
                onClick={onMoveDown}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Pindahkan grafik ke urutan berikutnya"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Main Menu Button with Checklist Dropdown */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isTop10Checked || isBottom10Checked
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
              }`}
              title="Menu Grafik & Opsi Tampilan Top 10 / Bottom 10 Data"
              aria-label="Menu Opsi Grafik"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Menu Popup */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 p-2.5 animate-in fade-in-50 zoom-in-95">
                
                {/* 1. SECTION: Checklist 10 Top / Bottom / Semua Data */}
                <div className="pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between px-2 py-1 mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <ListFilter className="w-3 h-3 text-blue-600" />
                      Filter Peringkat Data
                    </span>
                    {(isTop10Checked || isBottom10Checked) && (
                      <button
                        type="button"
                        onClick={handleSelectAllData}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Checklist: 10 Top Data */}
                  <label
                    onClick={() => handleToggleDataRank('top10')}
                    className={`flex items-start gap-2 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isTop10Checked 
                        ? 'bg-amber-50 text-amber-900 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isTop10Checked ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold flex items-center gap-1">
                        10 Top Data (Tertinggi)
                        <span className="text-[10px] px-1 py-0.2 bg-amber-200 text-amber-800 rounded font-extrabold">Top 10</span>
                      </span>
                      <p className="text-[10px] text-slate-500">Tampilkan 10 data dengan nilai terbesar</p>
                    </div>
                  </label>

                  {/* Checklist: 10 Bottom Data */}
                  <label
                    onClick={() => handleToggleDataRank('bottom10')}
                    className={`flex items-start gap-2 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isBottom10Checked 
                        ? 'bg-indigo-50 text-indigo-900 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isBottom10Checked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold flex items-center gap-1">
                        10 Bottom Data (Terendah)
                        <span className="text-[10px] px-1 py-0.2 bg-indigo-200 text-indigo-800 rounded font-extrabold">Bottom 10</span>
                      </span>
                      <p className="text-[10px] text-slate-500">Tampilkan 10 data dengan nilai terkecil</p>
                    </div>
                  </label>

                  {/* Option: Semua Data */}
                  <label
                    onClick={handleSelectAllData}
                    className={`flex items-start gap-2 p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isAllChecked 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isAllChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold">Tampilkan Semua Data</span>
                      <p className="text-[10px] text-slate-500">Seluruh data tanpa batas ranking</p>
                    </div>
                  </label>
                </div>

                {/* 2. SECTION: Actions (Edit, Duplicate, Delete) */}
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(chart);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-xl font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Edit Konfigurasi Grafik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDuplicate(chart);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-xl font-semibold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duplikat Grafik</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(chart.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Hapus Grafik</span>
                  </button>
                </div>

              </div>
            )}

            {/* Direct Edit Button */}
            <button
              onClick={() => onEdit(chart)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Konfigurasi Grafik"
              aria-label="Edit Grafik"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Quick Ranking Filter Checklist Pills Bar on Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          
          {/* Pill: Semua Data */}
          <button
            type="button"
            onClick={handleSelectAllData}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              isAllChecked
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Tampilkan semua data tanpa filter ranking"
          >
            {isAllChecked && <Check className="w-3 h-3 text-white" />}
            <span>Semua Data</span>
          </button>

          {/* Pill: 10 Top Data (Check / Uncheck) */}
          <button
            type="button"
            onClick={() => handleToggleDataRank('top10')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              isTop10Checked
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs shadow-amber-200'
                : 'bg-amber-50/70 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
            title={isTop10Checked ? "Klik untuk uncheck (tampilkan semua data)" : "Klik untuk checklist 10 Data Tertinggi"}
          >
            {isTop10Checked ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <ArrowUp className="w-3 h-3 text-amber-600" />
            )}
            <span>10 Top Data</span>
          </button>

          {/* Pill: 10 Bottom Data (Check / Uncheck) */}
          <button
            type="button"
            onClick={() => handleToggleDataRank('bottom10')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              isBottom10Checked
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs shadow-indigo-200'
                : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}
            title={isBottom10Checked ? "Klik untuk uncheck (tampilkan semua data)" : "Klik untuk checklist 10 Data Terendah"}
          >
            {isBottom10Checked ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <ArrowDown className="w-3 h-3 text-indigo-600" />
            )}
            <span>10 Bottom Data</span>
          </button>

          {/* Result Count Info */}
          <span className="text-[10px] text-slate-400 font-medium ml-auto">
            {chartData.length} entri ditampilkan
          </span>

        </div>

      </div>

      {/* Chart Canvas */}
      <div className="w-full min-w-0 h-[280px] mt-1 relative overflow-hidden">
        {renderChartGraphic()}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
        <span className="truncate mr-2">Sumbu X: <strong className="text-slate-700 font-semibold">{chart.xAxisKey}</strong></span>
        <span className="truncate">Metrik: <strong className="text-slate-700 font-semibold">{chart.yAxisKey}</strong></span>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { SheetRow, ColumnDef, MetricCardConfig, CustomFilterRule, FilterOperator, MetricAggregationType } from '../types';
import { formatCompactNumber, formatCurrency, matchesCustomRule, safeMax, safeMin } from '../utils/dataProcessor';
import { OPERATOR_LABELS } from './FilterBar';
import { 
  Plus, Edit3, Trash2, Filter, RotateCcw, TrendingUp, Check, X, 
  SlidersHorizontal, Layers, Hash, Calendar, DollarSign, Percent, 
  Eye, HelpCircle, ChevronDown, Sparkles, BarChart3, ArrowUpRight
} from 'lucide-react';

interface MetricCardsProps {
  rows: SheetRow[];
  allRows: SheetRow[];
  columns: ColumnDef[];
}

const COLOR_MAP: Record<string, {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeText: string;
  progressBg: string;
  ring: string;
  accent: string;
}> = {
  blue: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-blue-300',
    text: 'text-blue-600',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    progressBg: 'bg-blue-600',
    ring: 'focus:ring-blue-500',
    accent: '#2563eb',
  },
  emerald: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-emerald-300',
    text: 'text-emerald-600',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    progressBg: 'bg-emerald-600',
    ring: 'focus:ring-emerald-500',
    accent: '#059669',
  },
  violet: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-violet-300',
    text: 'text-violet-600',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    progressBg: 'bg-violet-600',
    ring: 'focus:ring-violet-500',
    accent: '#7c3aed',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-amber-300',
    text: 'text-amber-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    progressBg: 'bg-amber-500',
    ring: 'focus:ring-amber-500',
    accent: '#d97706',
  },
  rose: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-rose-300',
    text: 'text-rose-600',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    progressBg: 'bg-rose-600',
    ring: 'focus:ring-rose-500',
    accent: '#e11d48',
  },
  cyan: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-cyan-300',
    text: 'text-cyan-600',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    progressBg: 'bg-cyan-600',
    ring: 'focus:ring-cyan-500',
    accent: '#0891b2',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-indigo-300',
    text: 'text-indigo-600',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    progressBg: 'bg-indigo-600',
    ring: 'focus:ring-indigo-500',
    accent: '#4f46e5',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-slate-200 hover:border-slate-400',
    text: 'text-slate-700',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    progressBg: 'bg-slate-700',
    ring: 'focus:ring-slate-500',
    accent: '#334155',
  },
};

export const MetricCards: React.FC<MetricCardsProps> = ({ rows, allRows, columns }) => {
  // Generate initial default metric cards based on columns
  const defaultMetricCards = useMemo<MetricCardConfig[]>(() => {
    const numericCols = columns.filter(c => c.isNumeric || c.type === 'number');
    const primaryCol = numericCols.find(c => 
      /total|pendapatan|omset|nilai|pemasukan|jumlah|stok/i.test(c.key)
    ) || numericCols[0];
    const secondaryCol = numericCols.find(c => c.key !== primaryCol?.key && /rating|margin|pengeluaran|harga/i.test(c.key)) || numericCols[1];

    const cards: MetricCardConfig[] = [];

    if (primaryCol) {
      const isCur = /pendapatan|omset|nilai|pemasukan|biaya|harga|gaji|margin/i.test(primaryCol.key);
      cards.push({
        id: 'metric-sum-primary',
        title: `TOTAL ${primaryCol.label.toUpperCase()}`,
        columnKey: primaryCol.key,
        aggregation: 'SUM',
        isCurrency: isCur,
        colorTheme: 'blue',
      });

      cards.push({
        id: 'metric-avg-primary',
        title: `RATA-RATA ${primaryCol.label.toUpperCase()}`,
        columnKey: primaryCol.key,
        aggregation: 'AVG',
        isCurrency: isCur,
        colorTheme: 'emerald',
      });

      cards.push({
        id: 'metric-max-primary',
        title: `NILAI TERTINGGI (MAKS)`,
        columnKey: primaryCol.key,
        aggregation: 'MAX',
        isCurrency: isCur,
        colorTheme: 'amber',
      });
    }

    if (secondaryCol && cards.length < 4) {
      const isCur = /pendapatan|omset|nilai|pemasukan|biaya|harga|margin/i.test(secondaryCol.key);
      cards.push({
        id: 'metric-sec-sum',
        title: `TOTAL ${secondaryCol.label.toUpperCase()}`,
        columnKey: secondaryCol.key,
        aggregation: 'SUM',
        isCurrency: isCur,
        colorTheme: 'violet',
      });
    }

    // Default card for row count
    if (cards.length < 4) {
      cards.push({
        id: 'metric-total-rows',
        title: 'SHEET ROWS & DATA AKTIF',
        columnKey: '_rows',
        aggregation: 'COUNT',
        isCurrency: false,
        suffix: 'Baris',
        colorTheme: 'indigo',
      });
    }

    return cards;
  }, [columns]);

  // Metric Cards State (Customizable by user)
  const [metricCards, setMetricCards] = useState<MetricCardConfig[]>(() => {
    try {
      const colSignature = columns.map(c => c.key).sort().join(',');
      const saved = localStorage.getItem(`dashboard_metric_cards_${colSignature}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultMetricCards;
  });

  // Sync with default if columns change drastically
  useEffect(() => {
    if (metricCards.length === 0 && defaultMetricCards.length > 0) {
      setMetricCards(defaultMetricCards);
    }
  }, [defaultMetricCards]);

  // Persist custom metric cards
  const saveMetricCards = (updated: MetricCardConfig[]) => {
    setMetricCards(updated);
    try {
      const colSignature = columns.map(c => c.key).sort().join(',');
      localStorage.setItem(`dashboard_metric_cards_${colSignature}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Modal State for Add / Edit Metric Card
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form drafting state
  const [formTitle, setFormTitle] = useState('');
  const [formColumnKey, setFormColumnKey] = useState<string>('_rows');
  const [formAggregation, setFormAggregation] = useState<MetricAggregationType>('SUM');
  const [formIsCurrency, setFormIsCurrency] = useState(false);
  const [formPrefix, setFormPrefix] = useState('');
  const [formSuffix, setFormSuffix] = useState('');
  const [formColorTheme, setFormColorTheme] = useState<string>('blue');

  // Independent Filter for this card
  const [hasCardFilter, setHasCardFilter] = useState(false);
  const [filterColKey, setFilterColKey] = useState<string>(columns[0]?.key || '');
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('equals');
  const [filterValue, setFilterValue] = useState<string>('');
  const [filterValue2, setFilterValue2] = useState<string>('');
  const [filterListValues, setFilterListValues] = useState<string[]>([]);

  // Unique sample values for filter column in modal
  const filterColDef = useMemo(() => {
    return columns.find(c => c.key === filterColKey);
  }, [columns, filterColKey]);

  const uniqueSampleVals = useMemo(() => {
    if (!filterColDef) return [];
    const rawVals = Array.from(new Set(allRows.map(r => String(r[filterColDef.key] ?? ''))));
    return rawVals.filter((v): v is string => typeof v === 'string' && v.trim() !== '').slice(0, 15);
  }, [filterColDef, allRows]);

  // Open modal for Adding a new card
  const handleOpenAddModal = () => {
    const firstNumCol = columns.find(c => c.isNumeric || c.type === 'number');
    const targetCol = firstNumCol ? firstNumCol.key : (columns[0]?.key || '_rows');
    const isCur = /pendapatan|omset|nilai|biaya|harga|gaji|margin/i.test(targetCol);

    setEditingCardId(null);
    setFormTitle('');
    setFormColumnKey(targetCol);
    setFormAggregation(firstNumCol ? 'SUM' : 'COUNT');
    setFormIsCurrency(isCur);
    setFormPrefix('');
    setFormSuffix('');
    setFormColorTheme('blue');

    // Reset independent filter
    setHasCardFilter(false);
    setFilterColKey(columns[0]?.key || '');
    setFilterOperator('equals');
    setFilterValue('');
    setFilterValue2('');
    setFilterListValues([]);

    setIsModalOpen(true);
  };

  // Open modal for Editing an existing card
  const handleOpenEditModal = (card: MetricCardConfig) => {
    setEditingCardId(card.id);
    setFormTitle(card.title);
    setFormColumnKey(card.columnKey);
    setFormAggregation(card.aggregation);
    setFormIsCurrency(Boolean(card.isCurrency));
    setFormPrefix(card.prefix || '');
    setFormSuffix(card.suffix || '');
    setFormColorTheme(card.colorTheme || 'blue');

    if (card.filterRule && card.filterRule.columnKey) {
      setHasCardFilter(true);
      setFilterColKey(card.filterRule.columnKey);
      setFilterOperator(card.filterRule.operator);
      setFilterValue(Array.isArray(card.filterRule.value) ? '' : String(card.filterRule.value ?? ''));
      setFilterValue2(card.filterRule.value2 !== undefined ? String(card.filterRule.value2) : '');
      setFilterListValues(Array.isArray(card.filterRule.value) ? card.filterRule.value : []);
    } else {
      setHasCardFilter(false);
      setFilterColKey(columns[0]?.key || '');
      setFilterOperator('equals');
      setFilterValue('');
      setFilterValue2('');
      setFilterListValues([]);
    }

    setIsModalOpen(true);
  };

  // Quick action: Delete card
  const handleDeleteCard = (cardId: string) => {
    const updated = metricCards.filter(c => c.id !== cardId);
    saveMetricCards(updated);
  };

  // Quick action: Remove only the independent filter from a card
  const handleRemoveCardFilter = (cardId: string) => {
    const updated = metricCards.map(c => {
      if (c.id === cardId) {
        const { filterRule, ...rest } = c;
        return rest;
      }
      return c;
    });
    saveMetricCards(updated);
  };

  // Save Card (Add or Edit)
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();

    let rule: CustomFilterRule | undefined = undefined;
    if (hasCardFilter && filterColKey) {
      let finalVal: any = filterValue;
      if (filterOperator === 'in_list') {
        finalVal = filterListValues;
      } else if (filterOperator === 'between') {
        finalVal = filterValue;
      }

      rule = {
        id: `card-rule-${Date.now()}`,
        columnKey: filterColKey,
        operator: filterOperator,
        value: finalVal,
        value2: filterOperator === 'between' ? filterValue2 : undefined,
      };
    }

    const colDef = columns.find(c => c.key === formColumnKey);
    const fallbackTitle = formColumnKey === '_rows'
      ? 'TOTAL BARIS DATA'
      : `${formAggregation} ${colDef?.label.toUpperCase() || formColumnKey.toUpperCase()}`;

    const cardPayload: MetricCardConfig = {
      id: editingCardId || `metric-card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: formTitle.trim() || fallbackTitle,
      columnKey: formColumnKey,
      aggregation: formAggregation,
      isCurrency: formIsCurrency,
      prefix: formPrefix.trim() || undefined,
      suffix: formSuffix.trim() || undefined,
      colorTheme: (formColorTheme as any) || 'blue',
      filterRule: rule,
    };

    if (editingCardId) {
      const updated = metricCards.map(c => c.id === editingCardId ? cardPayload : c);
      saveMetricCards(updated);
    } else {
      saveMetricCards([...metricCards, cardPayload]);
    }

    setIsModalOpen(false);
    setEditingCardId(null);
  };

  // Helper to compute a single card's value and percentage independently
  const computeCardStats = (card: MetricCardConfig) => {
    // 1. Determine dataset for this card:
    // If card has an independent filter rule, apply it to allRows independently!
    let targetRows = allRows;
    if (card.filterRule && card.filterRule.columnKey) {
      targetRows = allRows.filter(r => matchesCustomRule(r, card.filterRule!));
    } else {
      // If no card-specific filter, default to dashboard filtered rows or allRows
      targetRows = rows;
    }

    const totalCount = allRows.length;
    const cardRowCount = targetRows.length;

    // 2. Compute numeric aggregation
    let calculatedValue = 0;
    let baselineTotalValue = 0;
    let isCountAgg = card.aggregation === 'COUNT' || card.columnKey === '_rows';

    if (isCountAgg) {
      calculatedValue = cardRowCount;
      baselineTotalValue = totalCount;
    } else {
      const colValues = targetRows.map(r => Number(r[card.columnKey]) || 0);
      const allColValues = allRows.map(r => Number(r[card.columnKey]) || 0);
      baselineTotalValue = allColValues.reduce((a, b) => a + b, 0);

      switch (card.aggregation) {
        case 'SUM':
          calculatedValue = colValues.reduce((a, b) => a + b, 0);
          break;
        case 'AVG':
          calculatedValue = colValues.length > 0 ? (colValues.reduce((a, b) => a + b, 0) / colValues.length) : 0;
          break;
        case 'MAX':
          calculatedValue = safeMax(colValues);
          break;
        case 'MIN':
          calculatedValue = safeMin(colValues);
          break;
        case 'DISTINCT': {
          const uniqueSet = new Set(targetRows.map(r => String(r[card.columnKey] ?? '')));
          calculatedValue = uniqueSet.size;
          break;
        }
      }
    }

    // 3. Compute Percentage:
    // Percentage can be:
    // - For SUM: (card sum / total allRows sum) * 100%
    // - For COUNT / Filtered items: (card rows / total allRows) * 100%
    // - For AVG/MAX/MIN: ratio of card value vs overall dataset max or avg
    let percentage = 0;
    let percentageLabel = '';

    if (card.aggregation === 'SUM' && baselineTotalValue > 0) {
      percentage = Math.min(100, Math.max(0, (calculatedValue / baselineTotalValue) * 100));
      percentageLabel = `${percentage.toFixed(1)}% dari total nilai`;
    } else if (totalCount > 0) {
      percentage = Math.min(100, Math.max(0, (cardRowCount / totalCount) * 100));
      percentageLabel = `${percentage.toFixed(1)}% dari ${totalCount} baris`;
    } else {
      percentage = 100;
      percentageLabel = '100% dataset';
    }

    // Format display string
    const formattedIntegerOrDecimal = Number.isInteger(calculatedValue)
      ? new Intl.NumberFormat('id-ID').format(calculatedValue)
      : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(calculatedValue);

    const fullDetailNumber = card.isCurrency 
      ? formatCurrency(calculatedValue) 
      : `${card.prefix ? card.prefix + ' ' : ''}${formattedIntegerOrDecimal}${card.suffix ? ' ' + card.suffix : ''}`;

    let formattedNumber = fullDetailNumber;
    if (card.isCurrency) {
      formattedNumber = formatCompactNumber(calculatedValue, true);
    } else if (card.prefix || card.suffix) {
      formattedNumber = fullDetailNumber;
    } else {
      formattedNumber = formatCompactNumber(calculatedValue, false);
    }

    return {
      calculatedValue,
      formattedNumber,
      fullDetailNumber,
      percentage,
      percentageLabel,
      cardRowCount,
      totalCount,
      hasFilter: Boolean(card.filterRule && card.filterRule.columnKey),
    };
  };

  return (
    <div className="mb-8">
      
      {/* Top Header of Summary Metric Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-800 tracking-tight flex items-center gap-2">
              <span>Ringkasan Metrik Kolom Google Sheet</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {metricCards.length} Kartu
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Menampilkan angka lengkap data dan persentase komparasi dengan ukuran seimbang
            </p>
          </div>
        </div>

        {/* Action Controls for Summary Cards */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Metrik</span>
          </button>

          <button
            type="button"
            onClick={() => saveMetricCards(defaultMetricCards)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Reset ke kartu metrik default"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <section id="summary-metric-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((card) => {
          const stats = computeCardStats(card);
          const theme = COLOR_MAP[card.colorTheme || 'blue'] || COLOR_MAP.blue;
          const colDef = columns.find(c => c.key === card.columnKey);

          return (
            <div 
              key={card.id}
              className={`relative ${theme.bg} p-5 rounded-2xl border ${theme.border} shadow-sm transition-all duration-200 hover:shadow-md flex flex-col justify-between group`}
            >
              {/* Card Header (Title & Action Buttons) */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider truncate">
                      {card.title}
                    </p>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {card.columnKey === '_rows' ? 'Hitung Baris' : `${card.aggregation} • ${colDef?.label || card.columnKey}`}
                    </span>
                  </div>

                  {/* Per-Item Edit, Filter, Delete Action Icons */}
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
                    {/* Quick Filter Item Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(card)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        stats.hasFilter 
                          ? `${theme.badgeBg} ${theme.badgeText} font-bold ring-1 ring-blue-300` 
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                      title={stats.hasFilter ? 'Filter mandiri aktif (Klik untuk edit)' : 'Beri filter mandiri untuk kartu ini'}
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit Metric Card Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(card)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit kartu metrik ini"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Metric Card Button */}
                    {metricCards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus kartu metrik ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 1. Primary Display: Angka Lengkap */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Angka Lengkap
                    </span>
                    {card.isCurrency && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        Ringkas: {stats.formattedNumber}
                      </span>
                    )}
                  </div>

                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans break-words leading-tight">
                    {stats.fullDetailNumber}
                  </div>
                </div>
              </div>

              {/* 2. Secondary Display: Persentase (Font Sama Besar) */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                
                {/* Independent Filter Pill (if enabled for this item) */}
                {card.filterRule && card.filterRule.columnKey && (
                  <div className="flex items-center justify-between bg-blue-50/80 border border-blue-200/80 rounded-lg px-2 py-1 text-[10px] text-blue-800 mb-2">
                    <div className="flex items-center gap-1 truncate mr-1 font-medium">
                      <Filter className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                      <span className="truncate">
                        {card.filterRule.columnKey}: {card.filterRule.operator === 'between' 
                          ? `${card.filterRule.value}-${card.filterRule.value2}` 
                          : String(card.filterRule.value || 'Aktif')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCardFilter(card.id)}
                      className="text-slate-400 hover:text-rose-600 shrink-0 ml-1 p-0.5"
                      title="Hapus filter dari kartu ini saja"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Percentage Section with Equal Font Size */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <TrendingUp className={`w-3.5 h-3.5 ${theme.text}`} />
                      <span>Persentase</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[140px]" title={stats.percentageLabel}>
                      {stats.percentageLabel}
                    </span>
                  </div>

                  <div className={`text-2xl sm:text-3xl font-black ${theme.text} tracking-tight font-sans leading-tight`}>
                    {stats.percentage.toFixed(1)}%
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full ${theme.progressBg} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(4, Math.min(100, stats.percentage))}%` }}
                    />
                  </div>
                </div>

              </div>

            </div>
          );
        })}
      </section>

      {/* ========================================================================= */}
      {/* Modal: Tambah & Edit Kartu Metrik (Per-Item Filter & Setting) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  {editingCardId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {editingCardId ? 'Edit Kartu Metrik Kolom' : 'Tambah Kartu Metrik Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sesuaikan kolom Google Sheet, agregasi, persentase, dan filter mandiri item
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCard} className="p-6 space-y-5">
              
              {/* 1. Judul Kartu Metrik */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Judul Metrik (Label Kartu)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: TOTAL PENDAPATAN, TRANSAKSI SELESAI, dsb."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>

              {/* 2. Target Kolom Google Sheet & Metode Agregasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Kolom Target */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kolom Google Sheet
                  </label>
                  <select
                    value={formColumnKey}
                    onChange={(e) => {
                      const colKey = e.target.value;
                      setFormColumnKey(colKey);
                      if (colKey === '_rows') {
                        setFormAggregation('COUNT');
                        setFormIsCurrency(false);
                      } else {
                        const isCur = /pendapatan|omset|nilai|biaya|harga|gaji|margin/i.test(colKey);
                        setFormIsCurrency(isCur);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  >
                    <option value="_rows">-- Total Baris Data (Row Count) --</option>
                    {columns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label} ({c.type === 'number' ? 'Angka' : c.type === 'date' ? 'Tanggal' : 'Teks'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Metode Agregasi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Metode Agregasi
                  </label>
                  <select
                    value={formAggregation}
                    onChange={(e) => setFormAggregation(e.target.value as MetricAggregationType)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  >
                    <option value="SUM">SUM - Total Penjumlahan Nilai</option>
                    <option value="COUNT">COUNT - Hitung Jumlah Data</option>
                    <option value="AVG">AVG - Rata-rata Nilai</option>
                    <option value="MAX">MAX - Nilai Maksimum (Tertinggi)</option>
                    <option value="MIN">MIN - Nilai Minimum (Terendah)</option>
                    <option value="DISTINCT">DISTINCT - Hitung Nilai Unik</option>
                  </select>
                </div>

              </div>

              {/* 3. Format & Warna */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Format Mata Uang & Satuan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Format &amp; Satuan Nilai
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={formIsCurrency}
                        onChange={(e) => setFormIsCurrency(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Format Mata Uang Rupiah (Rp)</span>
                    </label>

                    {!formIsCurrency && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Prefix (misal: $)"
                          value={formPrefix}
                          onChange={(e) => setFormPrefix(e.target.value)}
                          className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Suffix (misal: Unit, Pcs)"
                          value={formSuffix}
                          onChange={(e) => setFormSuffix(e.target.value)}
                          className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Tema Warna Aksen */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Warna Aksen Kartu
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(COLOR_MAP).map(([colorKey, theme]) => (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setFormColorTheme(colorKey)}
                        className={`w-7 h-7 rounded-xl border-2 transition-all flex items-center justify-center ${
                          formColorTheme === colorKey ? 'border-slate-800 scale-110 shadow-xs' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: theme.accent }}
                      >
                        {formColorTheme === colorKey && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* 4. Filter Independen Per-Item (Krusial: Filter tidak saling terhubung) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Filter Khusus / Mandiri untuk Kartu Ini
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCardFilter}
                      onChange={(e) => setHasCardFilter(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Filter ini <strong>hanya berlaku untuk kartu ini</strong> dan tidak akan mengubah atau mempengaruhi kartu metrik lain maupun tabel data utama.
                </p>

                {hasCardFilter && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Kolom Filter */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Kolom Acuan Filter:
                        </label>
                        <select
                          value={filterColKey}
                          onChange={(e) => setFilterColKey(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          {columns.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label} ({c.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operator Logika */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Kondisi Operator:
                        </label>
                        <select
                          value={filterOperator}
                          onChange={(e) => setFilterOperator(e.target.value as FilterOperator)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          {Object.entries(OPERATOR_LABELS).map(([opKey, info]) => (
                            <option key={opKey} value={opKey}>
                              {info.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Nilai Target Filter */}
                    {filterOperator !== 'is_empty' && filterOperator !== 'is_not_empty' && filterOperator !== 'in_list' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Nilai Target:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Ketik nilai patokan filter..."
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                          />
                          {filterOperator === 'between' && (
                            <>
                              <span className="text-xs font-bold text-slate-400">s/d</span>
                              <input
                                type="text"
                                placeholder="Nilai Max"
                                value={filterValue2}
                                onChange={(e) => setFilterValue2(e.target.value)}
                                className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                              />
                            </>
                          )}
                        </div>

                        {/* Rekomendasi Nilai Cepat */}
                        {uniqueSampleVals.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400">Contoh data:</span>
                            {uniqueSampleVals.slice(0, 5).map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setFilterValue(val)}
                                className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors"
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCardId ? 'Simpan Perubahan' : 'Tambahkan Metrik'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

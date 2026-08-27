import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
  Search, Filter, X, RotateCcw, Check, Plus, 
  Trash2, Edit3, SlidersHorizontal, Calendar, Hash, Type, 
  ChevronDown, CheckCircle2, ListFilter, ArrowUpDown, Eye, EyeOff
} from 'lucide-react';
import { ColumnDef, FilterState, SheetRow, CustomFilterRule, FilterOperator } from '../types';

interface FilterBarProps {
  columns: ColumnDef[];
  allRows: SheetRow[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
}

export const OPERATOR_LABELS: Record<FilterOperator, { label: string; desc: string; type: 'all' | 'number' | 'string' }> = {
  equals: { label: 'Sama dengan (=)', desc: 'Nilai sama persis', type: 'all' },
  not_equals: { label: 'Tidak sama dengan (≠)', desc: 'Nilai tidak sama', type: 'all' },
  contains: { label: 'Mengandung teks', desc: 'Mengandung kata kunci', type: 'string' },
  not_contains: { label: 'Tidak mengandung', desc: 'Tidak ada kata kunci', type: 'string' },
  starts_with: { label: 'Diawali dengan', desc: 'Dimulai teks tertentu', type: 'string' },
  ends_with: { label: 'Diakhiri dengan', desc: 'Diakhiri teks tertentu', type: 'string' },
  is_empty: { label: 'Kosong (Empty / Null)', desc: 'Kolom tidak memiliki nilai', type: 'all' },
  is_not_empty: { label: 'Tidak kosong (Ada isi)', desc: 'Kolom memiliki nilai', type: 'all' },
  gt: { label: 'Lebih besar dari (>)', desc: 'Nilai angka > batas', type: 'number' },
  gte: { label: 'Lebih besar atau sama (≥)', desc: 'Nilai angka ≥ batas', type: 'number' },
  lt: { label: 'Lebih kecil dari (<)', desc: 'Nilai angka < batas', type: 'number' },
  lte: { label: 'Lebih kecil atau sama (≤)', desc: 'Nilai angka ≤ batas', type: 'number' },
  between: { label: 'Di antara (Rentang)', desc: 'Nilai berada di antara Min & Max', type: 'number' },
  in_list: { label: 'Termasuk dalam daftar', desc: 'Memilih dari beberapa nilai', type: 'all' },
};

export const FilterBar: React.FC<FilterBarProps> = ({
  columns,
  allRows,
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  // Dropdown open states
  const [openDropdownKey, setOpenDropdownKey] = useState<string | null>(null);
  const [dropdownSearchText, setDropdownSearchText] = useState<Record<string, string>>({});
  const [visibleDropdownColumns, setVisibleDropdownColumns] = useState<string[]>([]);
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);

  // Advanced Rules Modal states
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // New/Edit Rule Drafting State
  const [selectedColKey, setSelectedColKey] = useState<string>(columns[0]?.key || '');
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>('contains');
  const [ruleValue, setRuleValue] = useState<string>('');
  const [ruleValue2, setRuleValue2] = useState<string>('');
  const [ruleListValues, setRuleListValues] = useState<string[]>([]);

  // Ref for handling click outside dropdowns
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-initialize visible dropdown columns: prioritizes string & date columns
  useEffect(() => {
    if (columns.length > 0) {
      // Pick up to 5 default category/date columns for quick dropdowns
      const suggestedCols = columns
        .filter(c => c.type === 'string' || c.type === 'date')
        .map(c => c.key);
      
      // If none, take the first 4 columns
      const initial = suggestedCols.length > 0 ? suggestedCols : columns.slice(0, 4).map(c => c.key);
      setVisibleDropdownColumns(prev => {
        if (prev.length === 0) return initial;
        // Keep existing valid columns and add any active filters
        const activeFilterKeys = Object.keys(filters.categoryFilters || {}).filter(k => (filters.categoryFilters[k] || []).length > 0);
        return Array.from(new Set([...prev.filter(k => columns.some(c => c.key === k)), ...activeFilterKeys]));
      });
    }
  }, [columns, filters.categoryFilters]);

  // Click outside to close open dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownKey(null);
        setIsColumnSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute unique values and occurrence counts for each column from Google Sheet rows
  const columnUniqueValuesMap = useMemo(() => {
    const map: Record<string, { value: string; count: number }[]> = {};
    columns.forEach(col => {
      const counts: Record<string, number> = {};
      allRows.forEach(row => {
        const val = row[col.key];
        const strVal = val !== undefined && val !== null && String(val).trim() !== '' ? String(val).trim() : '(Kosong)';
        counts[strVal] = (counts[strVal] || 0) + 1;
      });

      const list = Object.entries(counts).map(([value, count]) => ({ value, count }));
      // Sort alphabetically or by frequency
      list.sort((a, b) => b.count - a.count);
      map[col.key] = list;
    });
    return map;
  }, [columns, allRows]);

  // Selected column definition for custom rule builder
  const activeColDef = useMemo(() => {
    return columns.find(c => c.key === selectedColKey) || columns[0];
  }, [columns, selectedColKey]);

  // Unique values for the active column in rule builder
  const uniqueValuesForActiveCol = useMemo(() => {
    if (!activeColDef) return [];
    return (columnUniqueValuesMap[activeColDef.key] || []).map(item => item.value);
  }, [activeColDef, columnUniqueValuesMap]);

  // Active custom rules list
  const customRules = filters.customRules || [];

  // Calculate total active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery?.trim()) count++;
    if (filters.datePreset !== 'all' || filters.startDate || filters.endDate) count++;
    Object.values(filters.categoryFilters || {}).forEach((vals) => {
      if (Array.isArray(vals) && vals.length > 0) count += 1;
    });
    Object.values(filters.numberRangeFilters || {}).forEach((range: { min?: number; max?: number }) => {
      if (range && (range.min !== undefined || range.max !== undefined)) count += 1;
    });
    count += customRules.length;
    return count;
  }, [filters, customRules]);

  // Search change
  const handleSearchChange = (val: string) => {
    onFilterChange({ ...filters, searchQuery: val });
  };

  // Toggle category value selection in dropdown
  const handleToggleCategoryValue = (colKey: string, val: string) => {
    const current = filters.categoryFilters[colKey] || [];
    const actualVal = val === '(Kosong)' ? '' : val;
    let next: string[];
    if (current.includes(actualVal)) {
      next = current.filter(v => v !== actualVal);
    } else {
      next = [...current, actualVal];
    }

    const updatedCategoryFilters = { ...filters.categoryFilters };
    if (next.length > 0) {
      updatedCategoryFilters[colKey] = next;
    } else {
      delete updatedCategoryFilters[colKey];
    }

    onFilterChange({
      ...filters,
      categoryFilters: updatedCategoryFilters,
    });
  };

  // Select all values for a column dropdown
  const handleSelectAllCategoryValues = (colKey: string) => {
    const allVals = (columnUniqueValuesMap[colKey] || []).map(item => item.value === '(Kosong)' ? '' : item.value);
    onFilterChange({
      ...filters,
      categoryFilters: {
        ...filters.categoryFilters,
        [colKey]: allVals,
      },
    });
  };

  // Clear selection for a specific column dropdown
  const handleClearCategoryColumn = (colKey: string) => {
    const updatedCategoryFilters = { ...filters.categoryFilters };
    delete updatedCategoryFilters[colKey];
    onFilterChange({
      ...filters,
      categoryFilters: updatedCategoryFilters,
    });
  };

  // Toggle visible dropdown columns
  const handleToggleVisibleColumn = (colKey: string) => {
    setVisibleDropdownColumns(prev => {
      if (prev.includes(colKey)) {
        return prev.filter(k => k !== colKey);
      } else {
        return [...prev, colKey];
      }
    });
  };

  // Date Preset handler
  const handleSelectDatePreset = (preset: string) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];
    const dateCol = columns.find(c => c.type === 'date' || /tanggal|date|waktu|bulan/i.test(c.key)) || columns[0];

    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'this_year') {
      const d = new Date(today.getFullYear(), 0, 1);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    onFilterChange({
      ...filters,
      dateColumnKey: dateCol?.key,
      datePreset: preset,
      startDate: start,
      endDate: end,
    });
  };

  // Custom Rule Builder handlers
  const handleOpenAddFilter = () => {
    const firstCol = columns[0];
    setSelectedColKey(firstCol ? firstCol.key : '');
    setSelectedOperator(firstCol?.type === 'number' ? 'gte' : 'contains');
    setRuleValue('');
    setRuleValue2('');
    setRuleListValues([]);
    setEditingRuleId(null);
    setIsFormOpen(true);
  };

  const handleEditRule = (rule: CustomFilterRule) => {
    setSelectedColKey(rule.columnKey);
    setSelectedOperator(rule.operator);
    setRuleValue(rule.value !== undefined ? String(rule.value) : '');
    setRuleValue2(rule.value2 !== undefined ? String(rule.value2) : '');
    setRuleListValues(Array.isArray(rule.value) ? rule.value : []);
    setEditingRuleId(rule.id);
    setIsFormOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColKey) return;

    let finalValue: any = ruleValue;
    if (selectedOperator === 'in_list') {
      finalValue = ruleListValues;
    } else if (selectedOperator === 'is_empty' || selectedOperator === 'is_not_empty') {
      finalValue = true;
    }

    const currentRules = [...(filters.customRules || [])];

    if (editingRuleId) {
      const updatedRules = currentRules.map(r => {
        if (r.id === editingRuleId) {
          return {
            ...r,
            columnKey: selectedColKey,
            operator: selectedOperator,
            value: finalValue,
            value2: ruleValue2,
          };
        }
        return r;
      });
      onFilterChange({ ...filters, customRules: updatedRules });
    } else {
      const newRule: CustomFilterRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        columnKey: selectedColKey,
        operator: selectedOperator,
        value: finalValue,
        value2: ruleValue2,
      };
      onFilterChange({ ...filters, customRules: [...currentRules, newRule] });
    }

    setIsFormOpen(false);
    setEditingRuleId(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = (filters.customRules || []).filter(r => r.id !== ruleId);
    onFilterChange({ ...filters, customRules: updated });
  };

  const formatRuleSummary = (rule: CustomFilterRule) => {
    const col = columns.find(c => c.key === rule.columnKey);
    const colLabel = col ? col.label : rule.columnKey;
    const opLabel = OPERATOR_LABELS[rule.operator]?.label || rule.operator;
    
    if (rule.operator === 'is_empty') return `${colLabel}: Kosong`;
    if (rule.operator === 'is_not_empty') return `${colLabel}: Ada Isi`;
    if (rule.operator === 'between') return `${colLabel}: ${rule.value} s/d ${rule.value2}`;
    if (rule.operator === 'in_list') {
      const count = Array.isArray(rule.value) ? rule.value.length : 0;
      return `${colLabel}: (${count} opsi)`;
    }
    return `${colLabel} ${opLabel.split(' ')[0]} "${rule.value}"`;
  };

  // Date column available in dataset
  const dateColumn = columns.find(c => c.type === 'date' || /tanggal|date|waktu|bulan/i.test(c.key));

  return (
    <div 
      id="dashboard-filter-bar" 
      ref={dropdownRef}
      className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs mb-6 transition-all"
    >
      <div className="flex flex-col gap-3.5">
        
        {/* ========================================================================= */}
        {/* TOP ROW: Search Input, Quick Dropdown Filter Menus, and Reset Button      */}
        {/* ========================================================================= */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          
          {/* Main Filter Controls Group */}
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            
            {/* 1. Global Search Box */}
            <div className="relative w-full sm:w-64 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="filter-search-input"
                type="text"
                placeholder="Cari semua data sheet..."
                value={filters.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Date Range Filter Dropdown (if date column exists or general preset) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdownKey(openDropdownKey === '__date_preset__' ? null : '__date_preset__')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  filters.datePreset !== 'all' || filters.startDate || filters.endDate
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {filters.datePreset === '7d'
                    ? '7 Hari Terakhir'
                    : filters.datePreset === '30d'
                    ? '30 Hari Terakhir'
                    : filters.datePreset === 'this_month'
                    ? 'Bulan Ini'
                    : filters.datePreset === 'this_year'
                    ? 'Tahun Ini'
                    : filters.datePreset === 'custom' && (filters.startDate || filters.endDate)
                    ? `${filters.startDate || '...'} s/d ${filters.endDate || '...'}`
                    : 'Semua Periode'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Date Preset Dropdown Popup */}
              {openDropdownKey === '__date_preset__' && (
                <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 p-3 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Filter Waktu / Tanggal
                    </span>
                    {filters.datePreset !== 'all' && (
                      <button
                        type="button"
                        onClick={() => handleSelectDatePreset('all')}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {[
                      { id: 'all', label: 'Semua Periode' },
                      { id: '7d', label: '7 Hari Terakhir' },
                      { id: '30d', label: '30 Hari Terakhir' },
                      { id: 'this_month', label: 'Bulan Ini' },
                      { id: 'this_year', label: 'Tahun Ini' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectDatePreset(item.id);
                          setOpenDropdownKey(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                          filters.datePreset === item.id
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        {filters.datePreset === item.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Inputs */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Rentang Kustom</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Mulai</label>
                        <input
                          type="date"
                          value={filters.startDate || ''}
                          onChange={(e) =>
                            onFilterChange({
                              ...filters,
                              datePreset: 'custom',
                              dateColumnKey: dateColumn?.key || filters.dateColumnKey,
                              startDate: e.target.value,
                            })
                          }
                          className="w-full text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Selesai</label>
                        <input
                          type="date"
                          value={filters.endDate || ''}
                          onChange={(e) =>
                            onFilterChange({
                              ...filters,
                              datePreset: 'custom',
                              dateColumnKey: dateColumn?.key || filters.dateColumnKey,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full text-[11px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Dynamic Column Filter Dropdowns based on Google Sheet Columns */}
            {visibleDropdownColumns.map((colKey) => {
              const col = columns.find(c => c.key === colKey);
              if (!col) return null;

              const selectedValues = filters.categoryFilters[colKey] || [];
              const hasActiveSelection = selectedValues.length > 0;
              const uniqueItems = columnUniqueValuesMap[colKey] || [];
              const searchKey = dropdownSearchText[colKey] || '';
              const filteredItems = searchKey
                ? uniqueItems.filter(item => item.value.toLowerCase().includes(searchKey.toLowerCase()))
                : uniqueItems;

              const isOpen = openDropdownKey === colKey;

              return (
                <div key={colKey} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdownKey(isOpen ? null : colKey);
                      setIsColumnSelectorOpen(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      hasActiveSelection
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-200'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {col.type === 'number' ? (
                      <Hash className={`w-3.5 h-3.5 ${hasActiveSelection ? 'text-blue-100' : 'text-slate-400'}`} />
                    ) : col.type === 'date' ? (
                      <Calendar className={`w-3.5 h-3.5 ${hasActiveSelection ? 'text-blue-100' : 'text-slate-400'}`} />
                    ) : (
                      <Filter className={`w-3.5 h-3.5 ${hasActiveSelection ? 'text-blue-100' : 'text-slate-400'}`} />
                    )}

                    <span className="truncate max-w-[140px]">{col.label}</span>

                    {hasActiveSelection ? (
                      <span className="ml-0.5 bg-white/20 text-white px-1.5 py-0.5 rounded-md text-[10px] font-extrabold">
                        {selectedValues.length === 1
                          ? selectedValues[0] === ''
                            ? 'Kosong'
                            : selectedValues[0]
                          : `${selectedValues.length}`}
                      </span>
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                    )}
                  </button>

                  {/* Dropdown Menu for this Column */}
                  {isOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl w-72 p-3 animate-in fade-in-50 zoom-in-95">
                      
                      {/* Dropdown Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            Filter: {col.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {uniqueItems.length} opsi tersedia dari Google Sheet
                          </span>
                        </div>

                        {hasActiveSelection && (
                          <button
                            type="button"
                            onClick={() => handleClearCategoryColumn(colKey)}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-bold"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Dropdown Search in Items */}
                      {uniqueItems.length > 5 && (
                        <div className="relative mb-2">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder={`Cari di ${col.label}...`}
                            value={searchKey}
                            onChange={(e) =>
                              setDropdownSearchText(prev => ({ ...prev, [colKey]: e.target.value }))
                            }
                            className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                          />
                        </div>
                      )}

                      {/* Quick Select Buttons */}
                      <div className="flex items-center justify-between mb-2 px-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleSelectAllCategoryValues(colKey)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          Pilih Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearCategoryColumn(colKey)}
                          className="text-slate-500 hover:text-slate-700 font-medium"
                        >
                          Hapus Pilihan
                        </button>
                      </div>

                      {/* Checkbox Items List */}
                      <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 divide-y divide-slate-50">
                        {filteredItems.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            Tidak ditemukan hasil cocok
                          </div>
                        ) : (
                          filteredItems.map((item) => {
                            const actualVal = item.value === '(Kosong)' ? '' : item.value;
                            const isChecked = selectedValues.includes(actualVal);
                            return (
                              <label
                                key={item.value}
                                className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                                  isChecked ? 'bg-blue-50 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleCategoryValue(colKey, item.value)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                                  />
                                  <span className="truncate">{item.value}</span>
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                                  isChecked ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {item.count}
                                </span>
                              </label>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{selectedValues.length} dipilih</span>
                        <button
                          type="button"
                          onClick={() => setOpenDropdownKey(null)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[10px] font-bold rounded-lg"
                        >
                          Terapkan
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}

            {/* 4. Column Visibility Selector (+ Tambah Dropdown Kolom) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsColumnSelectorOpen(!isColumnSelectorOpen);
                  setOpenDropdownKey(null);
                }}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-dashed border-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Pilih kolom mana saja yang ingin dimunculkan sebagai dropdown filter"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilih Dropdown Kolom</span>
              </button>

              {isColumnSelectorOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 p-3 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      Tampilkan Filter Dropdown
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisibleDropdownColumns(columns.map(c => c.key))}
                      className="text-[10px] text-blue-600 font-bold"
                    >
                      Semua
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                    {columns.map((col) => {
                      const isVisible = visibleDropdownColumns.includes(col.key);
                      return (
                        <label
                          key={col.key}
                          className="flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              onChange={() => handleToggleVisibleColumn(col.key)}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate font-semibold text-slate-700">{col.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {col.type === 'number' ? 'Angka' : col.type === 'date' ? 'Tanggal' : 'Teks'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Custom / Advanced Filter Rule Builder Button */}
            <button
              id="btn-add-custom-filter"
              type="button"
              onClick={handleOpenAddFilter}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Buat aturan filter kustom (lebih besar dari, mengandung kata, di antara rentang, dll.)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter Lanjutan</span>
            </button>

            {/* 6. Reset All Active Filters Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl transition-colors cursor-pointer shadow-xs"
                title="Hapus semua pilihan filter dan tampilkan seluruh data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({activeFilterCount})</span>
              </button>
            )}

          </div>

          {/* Right: Real-time Row Status Counter */}
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0 self-end xl:self-center">
            <span className="font-semibold text-slate-600">Status Data:</span>
            <span className={`font-bold px-2.5 py-1 rounded-lg border text-xs ${
              activeFilterCount > 0
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {activeFilterCount === 0 ? 'Semua baris aktif' : `${activeFilterCount} filter diterapkan`}
            </span>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ROW: Active Filter Chips Bar (Quick View & Remove)                */}
        {/* ========================================================================= */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-600" />
              Filter Aktif:
            </span>

            {/* Active Search Chip */}
            {filters.searchQuery && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs px-2.5 py-1 rounded-lg">
                <span className="font-semibold">Cari: "{filters.searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="p-0.5 text-blue-600 hover:text-blue-900 rounded hover:bg-blue-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Active Date Preset Chip */}
            {(filters.datePreset !== 'all' || filters.startDate || filters.endDate) && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs px-2.5 py-1 rounded-lg">
                <span className="font-semibold">
                  Periode:{' '}
                  {filters.datePreset === '7d'
                    ? '7 Hari Terakhir'
                    : filters.datePreset === '30d'
                    ? '30 Hari Terakhir'
                    : filters.datePreset === 'this_month'
                    ? 'Bulan Ini'
                    : filters.datePreset === 'this_year'
                    ? 'Tahun Ini'
                    : `${filters.startDate || '...'} s/d ${filters.endDate || '...'}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectDatePreset('all')}
                  className="p-0.5 text-blue-600 hover:text-blue-900 rounded hover:bg-blue-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Active Column Category Dropdown Chips */}
            {Object.entries(filters.categoryFilters || {}).map(([colKey, rawVals]) => {
              const vals = Array.isArray(rawVals) ? rawVals : [];
              if (vals.length === 0) return null;
              const col = columns.find(c => c.key === colKey);
              const label = col?.label || colKey;
              const displayVal = vals.length === 1 
                ? (vals[0] === '' ? '(Kosong)' : String(vals[0]))
                : `${vals.length} opsi (${vals.map((v: string) => v === '' ? '(Kosong)' : String(v)).slice(0, 2).join(', ')}${vals.length > 2 ? '...' : ''})`;

              return (
                <div 
                  key={colKey}
                  className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs px-2.5 py-1 rounded-lg shadow-2xs"
                >
                  <span className="font-bold text-blue-700">{label}:</span>
                  <span className="font-semibold">{displayVal}</span>
                  <button
                    type="button"
                    onClick={() => handleClearCategoryColumn(colKey)}
                    className="p-0.5 text-blue-600 hover:text-rose-700 rounded hover:bg-blue-200 transition-colors"
                    title={`Hapus filter kolom ${label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Active Advanced Custom Rules Chips */}
            {customRules.map((rule) => (
              <div 
                key={rule.id}
                className="group flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-900 text-xs px-2.5 py-1 rounded-lg"
              >
                <span className="font-semibold">{formatRuleSummary(rule)}</span>
                <button
                  type="button"
                  onClick={() => handleEditRule(rule)}
                  className="p-0.5 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-200 transition-colors"
                  title="Edit aturan filter"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-0.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-100 transition-colors"
                  title="Hapus aturan filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Clear All Inline Link */}
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline ml-1 cursor-pointer"
            >
              Bersihkan Semua
            </button>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* Modal Form Tambah / Edit Filter Lanjutan (Advanced Rule Builder)           */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  {editingRuleId ? <Edit3 className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {editingRuleId ? 'Edit Aturan Filter Lanjutan' : 'Tambah Aturan Filter Lanjutan'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pilih kolom spreadsheet dan tentukan kondisi logika penyaringan data
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingRuleId(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveRule} className="p-6 space-y-4 text-xs">
              
              {/* 1. Select Column */}
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  1. Pilih Kolom Spreadsheet
                </label>
                <select
                  value={selectedColKey}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    setSelectedColKey(newKey);
                    const col = columns.find(c => c.key === newKey);
                    if (col?.type === 'number') {
                      setSelectedOperator('gte');
                    } else {
                      setSelectedOperator('contains');
                    }
                    setRuleValue('');
                    setRuleValue2('');
                    setRuleListValues([]);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-slate-900 font-medium text-xs focus:outline-none"
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label} ({col.type === 'number' ? 'Angka' : col.type === 'date' ? 'Tanggal' : 'Teks'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Operator */}
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  2. Pilih Kondisi Logika
                </label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value as FilterOperator)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-slate-900 font-medium text-xs focus:outline-none"
                >
                  <optgroup label="Pencocokan Teks & Umum">
                    <option value="contains">Mengandung kata / teks (Contains)</option>
                    <option value="not_contains">Tidak mengandung (Does not contain)</option>
                    <option value="equals">Sama persis dengan (Equals)</option>
                    <option value="not_equals">Tidak sama dengan (Not equals)</option>
                    <option value="starts_with">Diawali teks (Starts with)</option>
                    <option value="ends_with">Diakhiri teks (Ends with)</option>
                    <option value="in_list">Pilih dari daftar nilai (In List)</option>
                    <option value="is_empty">Nilai Kosong / Tidak diisi (Is Empty)</option>
                    <option value="is_not_empty">Nilai Ada / Terisi (Is Not Empty)</option>
                  </optgroup>
                  <optgroup label="Perbandingan Angka & Nilai">
                    <option value="gt">Lebih besar dari (&gt;)</option>
                    <option value="gte">Lebih besar atau sama dengan (&ge;)</option>
                    <option value="lt">Lebih kecil dari (&lt;)</option>
                    <option value="lte">Lebih kecil atau sama dengan (&le;)</option>
                    <option value="between">Rentang Nilai (Antara Min &amp; Max)</option>
                  </optgroup>
                </select>
              </div>

              {/* 3. Input Filter Value(s) depending on operator */}
              {selectedOperator !== 'is_empty' && selectedOperator !== 'is_not_empty' && (
                <div>
                  <label className="block text-slate-800 font-bold mb-1.5">
                    3. Nilai Patokan Filter
                  </label>

                  {selectedOperator === 'between' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold mb-1 block">Batas Minimum (Min)</span>
                        <input
                          type="number"
                          required
                          placeholder="Min..."
                          value={ruleValue}
                          onChange={(e) => setRuleValue(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold mb-1 block">Batas Maksimum (Max)</span>
                        <input
                          type="number"
                          required
                          placeholder="Max..."
                          value={ruleValue2}
                          onChange={(e) => setRuleValue2(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : selectedOperator === 'in_list' ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500">Pilih satu atau beberapa nilai yang ingin disertakan:</p>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1">
                        {uniqueValuesForActiveCol.map((val) => {
                          const isChecked = ruleListValues.includes(val);
                          return (
                            <label 
                              key={val}
                              className={`flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isChecked ? 'bg-blue-100/70 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setRuleListValues([...ruleListValues, val]);
                                  } else {
                                    setRuleListValues(ruleListValues.filter(v => v !== val));
                                  }
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span className="truncate">{val}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        type={activeColDef?.type === 'number' ? 'number' : 'text'}
                        required
                        placeholder={`Masukkan nilai patokan untuk ${activeColDef?.label || 'kolom'}...`}
                        value={ruleValue}
                        onChange={(e) => setRuleValue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-slate-900 font-medium text-xs focus:outline-none"
                      />
                      
                      {uniqueValuesForActiveCol.length > 0 && activeColDef?.type !== 'number' && (
                        <div className="mt-2">
                          <span className="text-[10px] text-slate-400 font-semibold block mb-1">Contoh nilai dari sheet:</span>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {uniqueValuesForActiveCol.slice(0, 8).map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => setRuleValue(suggestion)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded-md text-[10px] font-medium transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingRuleId(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                >
                  {editingRuleId ? 'Simpan Perubahan' : 'Terapkan Filter'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

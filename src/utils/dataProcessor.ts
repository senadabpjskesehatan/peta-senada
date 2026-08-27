import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ColumnDef, SheetRow, ChartConfig, AggregationType, FilterState, CustomFilterRule } from '../types';

export function parseCSVToRows(csvText: string): { columns: ColumnDef[]; rows: SheetRow[] } {
  // Remove UTF-8 BOM if present
  const cleanCsv = csvText.replace(/^\uFEFF/, '').trim();

  const parsed = Papa.parse<Record<string, any>>(cleanCsv, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: true,
    transformHeader: (header) => header.trim().replace(/^["']|["']$/g, ''),
  });

  if (!parsed.data || parsed.data.length === 0) {
    return { columns: [], rows: [] };
  }

  // Filter out any rows that are completely empty
  const validData = parsed.data.filter(row => {
    if (!row || typeof row !== 'object') return false;
    return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
  });

  if (validData.length === 0) {
    return { columns: [], rows: [] };
  }

  const rawHeaders = Object.keys(validData[0] || {}).filter(k => k && k.trim() !== '' && !k.startsWith('__parsed_extra'));

  if (rawHeaders.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns: ColumnDef[] = rawHeaders.map((key) => {
    // Check first few rows to deduce column type
    let isNumeric = true;
    let isDate = true;
    let sampleCount = 0;

    for (let i = 0; i < Math.min(20, validData.length); i++) {
      const val = validData[i]?.[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        sampleCount++;
        const strVal = String(val).trim();
        // Check numeric
        const cleanedNum = strVal.replace(/[Rp$,\s.]/g, '');
        if (typeof val !== 'number' && isNaN(Number(strVal)) && isNaN(Number(cleanedNum))) {
          isNumeric = false;
        }
        // Check date
        const parsedDate = Date.parse(strVal);
        if (isNaN(parsedDate) || strVal.length < 6 || /^\d+$/.test(strVal) && strVal.length <= 4) {
          isDate = false;
        }
      }
    }

    let type: ColumnDef['type'] = 'string';
    if (sampleCount > 0 && isNumeric) {
      type = 'number';
    } else if (sampleCount > 0 && isDate) {
      type = 'date';
    }

    return {
      key,
      label: key.replace(/_/g, ' '),
      type,
      isNumeric: type === 'number',
    };
  });

  const rows: SheetRow[] = validData.map((item, index) => {
    const rowObj: SheetRow = { _id: `row-${Date.now()}-${index}` };
    columns.forEach((col) => {
      let val = item[col.key];
      if (col.type === 'number') {
        if (typeof val === 'number') {
          rowObj[col.key] = val;
        } else if (val) {
          const str = String(val).replace(/[^0-9.-]/g, '');
          const num = Number(str);
          rowObj[col.key] = isNaN(num) ? 0 : num;
        } else {
          rowObj[col.key] = 0;
        }
      } else {
        rowObj[col.key] = val !== undefined && val !== null ? String(val) : '';
      }
    });
    return rowObj;
  });

  return { columns, rows };
}

export function parseExcelBufferToRows(
  buffer: ArrayBuffer | Uint8Array,
  sheetIndexOrName?: number | string
): { columns: ColumnDef[]; rows: SheetRow[]; sheetNames: string[]; activeSheet: string } {
  try {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0) {
      return { columns: [], rows: [], sheetNames: [], activeSheet: '' };
    }

    let targetSheetName = sheetNames[0];
    if (typeof sheetIndexOrName === 'string' && sheetNames.includes(sheetIndexOrName)) {
      targetSheetName = sheetIndexOrName;
    } else if (typeof sheetIndexOrName === 'number' && sheetNames[sheetIndexOrName]) {
      targetSheetName = sheetNames[sheetIndexOrName];
    }

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return { columns: [], rows: [], sheetNames, activeSheet: targetSheetName };
    }

    // 1. Try standard header parsing (header: 1 gives array of arrays, header: default gives objects)
    let rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    // Fallback: if rawData is empty or headers are missing/all empty, try header: 1 to find header row
    let rawHeaders: string[] = [];
    let validData: Record<string, any>[] = [];

    if (rawData && rawData.length > 0) {
      validData = rawData.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        return Object.values(row).some((val) => val !== null && val !== undefined && String(val).trim() !== '');
      });

      if (validData.length > 0) {
        rawHeaders = Object.keys(validData[0] || {}).filter((k) => k && k.trim() !== '' && !k.startsWith('__EMPTY'));
      }
    }

    // If still no valid headers or data, try parsing with header: 1 (array of arrays)
    if (validData.length === 0 || rawHeaders.length === 0) {
      const aoa = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
      if (aoa && aoa.length > 0) {
        // Find first non-empty row as header
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(10, aoa.length); i++) {
          const row = aoa[i];
          if (row && row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
            headerRowIdx = i;
            break;
          }
        }

        const headerCols = aoa[headerRowIdx] || [];
        rawHeaders = headerCols.map((h, idx) => (h && String(h).trim() !== '' ? String(h).trim() : `Kolom_${idx + 1}`));

        // Convert remaining rows to objects
        validData = [];
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
          const rowArr = aoa[i];
          if (!rowArr || !rowArr.some((c: any) => c !== null && c !== undefined && String(c).trim() !== '')) continue;
          const obj: Record<string, any> = {};
          rawHeaders.forEach((hKey, hIdx) => {
            obj[hKey] = rowArr[hIdx] !== undefined ? rowArr[hIdx] : '';
          });
          validData.push(obj);
        }
      }
    }

    if (validData.length === 0 || rawHeaders.length === 0) {
      return { columns: [], rows: [], sheetNames, activeSheet: targetSheetName };
    }

    const columns: ColumnDef[] = rawHeaders.map((key) => {
      let isNumeric = true;
      let isDate = true;
      let sampleCount = 0;

      for (let i = 0; i < Math.min(30, validData.length); i++) {
        const val = validData[i]?.[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          sampleCount++;
          const strVal = String(val).trim();
          const cleanedNum = strVal.replace(/[Rp$,\s.]/g, '');
          if (typeof val !== 'number' && isNaN(Number(strVal)) && isNaN(Number(cleanedNum))) {
            isNumeric = false;
          }
          const parsedDate = Date.parse(strVal);
          if (isNaN(parsedDate) || strVal.length < 6 || (/^\d+$/.test(strVal) && strVal.length <= 4)) {
            isDate = false;
          }
        }
      }

      let type: ColumnDef['type'] = 'string';
      if (sampleCount > 0 && isNumeric) {
        type = 'number';
      } else if (sampleCount > 0 && isDate) {
        type = 'date';
      }

      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
      return {
        key: safeKey,
        label: key,
        type,
        isNumeric: type === 'number',
      };
    });

    const rows: SheetRow[] = validData.map((item, index) => {
      const rowObj: SheetRow = { _id: `row-excel-${Date.now()}-${index}` };
      rawHeaders.forEach((origKey, colIdx) => {
        const col = columns[colIdx];
        const val = item[origKey];
        if (col.type === 'number') {
          if (typeof val === 'number') {
            rowObj[col.key] = val;
          } else if (val) {
            const cleaned = String(val).replace(/[^0-9.-]/g, '');
            const num = Number(cleaned);
            rowObj[col.key] = isNaN(num) ? 0 : num;
          } else {
            rowObj[col.key] = 0;
          }
        } else {
          rowObj[col.key] = val !== undefined && val !== null ? String(val) : '';
        }
      });
      return rowObj;
    });

    return { columns, rows, sheetNames, activeSheet: targetSheetName };
  } catch (err) {
    console.error('Error parsing Excel buffer:', err);
    throw new Error('Gagal memproses file Excel. Pastikan file dalam format .xlsx atau .xls yang valid dan tidak terkunci.');
  }
}

export function exportRowsToExcel(columns: ColumnDef[], rows: SheetRow[], filename: string = 'dashboard_export.xlsx') {
  const exportable = rows.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col) => {
      obj[col.label || col.key] = row[col.key];
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportable);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportRowsToCSV(columns: ColumnDef[], rows: SheetRow[], filename: string = 'dashboard_export.csv') {
  const exportable = rows.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col) => {
      obj[col.label || col.key] = row[col.key];
    });
    return obj;
  });

  const csv = Papa.unparse(exportable);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatCurrency(value: number | undefined | null, prefix: string = 'Rp'): string {
  if (value === undefined || value === null || isNaN(value)) return `${prefix} 0`;
  return `${prefix} ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`;
}

export function formatCompactNumber(value: number | undefined | null, isCurrency: boolean = false): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const prefix = isCurrency ? 'Rp ' : '';

  if (abs >= 1_000_000_000_000) {
    return `${sign}${prefix}${(abs / 1_000_000_000_000).toFixed(1)} T`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${prefix}${(abs / 1_000_000_000).toFixed(1)} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${prefix}${(abs / 1_000_000).toFixed(1)} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${prefix}${(abs / 1_000).toFixed(1)} rb`;
  }
  return `${sign}${prefix}${new Intl.NumberFormat('id-ID').format(value)}`;
}

export function safeMin(values: number[]): number {
  if (!values || values.length === 0) return 0;
  let min = Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i]);
    if (!isNaN(v) && v < min) min = v;
  }
  return min === Infinity ? 0 : min;
}

export function safeMax(values: number[]): number {
  if (!values || values.length === 0) return 0;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = Number(values[i]);
    if (!isNaN(v) && v > max) max = v;
  }
  return max === -Infinity ? 0 : max;
}

export function aggregateValues(values: number[], agg: AggregationType): number {
  if (!values || values.length === 0) return 0;
  switch (agg) {
    case 'SUM': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += Number(values[i]) || 0;
      }
      return sum;
    }
    case 'AVG': {
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += Number(values[i]) || 0;
      }
      return sum / values.length;
    }
    case 'COUNT':
      return values.length;
    case 'MIN':
      return safeMin(values);
    case 'MAX':
      return safeMax(values);
    default: {
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += Number(values[i]) || 0;
      }
      return sum;
    }
  }
}

export function prepareChartData(rows: SheetRow[], chart: ChartConfig): { name: string; value: number; secondaryValue?: number; count: number }[] {
  if (!rows || rows.length === 0) return [];

  const grouped: Record<string, { values: number[]; secondaryValues: number[] }> = {};

  rows.forEach((row) => {
    const rawX = row[chart.xAxisKey];
    const xKey = rawX !== undefined && rawX !== null && rawX !== '' ? String(rawX) : '(Kosong)';
    
    if (!grouped[xKey]) {
      grouped[xKey] = { values: [], secondaryValues: [] };
    }

    const val = Number(row[chart.yAxisKey]);
    if (!isNaN(val)) {
      grouped[xKey].values.push(val);
    }

    if (chart.secondaryYAxisKey) {
      const secVal = Number(row[chart.secondaryYAxisKey]);
      if (!isNaN(secVal)) {
        grouped[xKey].secondaryValues.push(secVal);
      }
    }
  });

  let result = Object.entries(grouped).map(([name, data]) => {
    const val = aggregateValues(data.values, chart.aggregation);
    const item: { name: string; value: number; secondaryValue?: number; count: number } = {
      name,
      value: chart.aggregation === 'AVG' ? Number(val.toFixed(2)) : Math.round(val * 100) / 100,
      count: data.values.length,
    };
    if (chart.secondaryYAxisKey) {
      const secVal = aggregateValues(data.secondaryValues, chart.aggregation);
      item.secondaryValue = chart.aggregation === 'AVG' ? Number(secVal.toFixed(2)) : Math.round(secVal * 100) / 100;
    }
    return item;
  });

  // Ranking and Top/Bottom Data Filtering
  if (chart.dataRankView === 'top10') {
    // 10 Top Data (Tertinggi)
    result.sort((a, b) => b.value - a.value);
    result = result.slice(0, 10);
  } else if (chart.dataRankView === 'bottom10') {
    // 10 Bottom Data (Terendah)
    result.sort((a, b) => a.value - b.value);
    result = result.slice(0, 10);
  } else {
    // Standard Sorting & Limit
    if (chart.sortBy === 'value') {
      result.sort((a, b) => (chart.sortDirection === 'asc' ? a.value - b.value : b.value - a.value));
    } else if (chart.sortBy === 'label') {
      result.sort((a, b) => (chart.sortDirection === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
    }

    // Limit
    if (chart.limit && chart.limit > 0) {
      result = result.slice(0, chart.limit);
    }
  }

  return result;
}

export function matchesCustomRule(row: SheetRow, rule: CustomFilterRule): boolean {
  if (!rule || !rule.columnKey) return true;
  const rawVal = row[rule.columnKey];
  const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).toLowerCase().trim() : '';
  const numVal = Number(rawVal);
  const isNum = !isNaN(numVal) && rawVal !== '' && rawVal !== null && rawVal !== undefined;

  switch (rule.operator) {
    case 'equals': {
      if (rule.value === undefined || rule.value === '') return true;
      const targetStr = String(rule.value).toLowerCase().trim();
      if (isNum && !isNaN(Number(rule.value))) {
        return numVal === Number(rule.value);
      }
      return strVal === targetStr;
    }
    case 'not_equals': {
      if (rule.value === undefined || rule.value === '') return true;
      const targetStr = String(rule.value).toLowerCase().trim();
      if (isNum && !isNaN(Number(rule.value))) {
        return numVal !== Number(rule.value);
      }
      return strVal !== targetStr;
    }
    case 'contains': {
      if (rule.value === undefined || rule.value === '') return true;
      const targetStr = String(rule.value).toLowerCase().trim();
      return strVal.includes(targetStr);
    }
    case 'not_contains': {
      if (rule.value === undefined || rule.value === '') return true;
      const targetStr = String(rule.value).toLowerCase().trim();
      return !strVal.includes(targetStr);
    }
    case 'starts_with': {
      if (rule.value === undefined || rule.value === '') return true;
      const targetStr = String(rule.value).toLowerCase().trim();
      return strVal.startsWith(targetStr);
    }
    case 'ends_with': {
      if (rule.value === undefined || rule.value === '') return true;
      const targetStr = String(rule.value).toLowerCase().trim();
      return strVal.endsWith(targetStr);
    }
    case 'is_empty': {
      return rawVal === undefined || rawVal === null || String(rawVal).trim() === '';
    }
    case 'is_not_empty': {
      return rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';
    }
    case 'gt': {
      const targetNum = Number(rule.value);
      if (isNaN(targetNum)) return true;
      return isNum && numVal > targetNum;
    }
    case 'gte': {
      const targetNum = Number(rule.value);
      if (isNaN(targetNum)) return true;
      return isNum && numVal >= targetNum;
    }
    case 'lt': {
      const targetNum = Number(rule.value);
      if (isNaN(targetNum)) return true;
      return isNum && numVal < targetNum;
    }
    case 'lte': {
      const targetNum = Number(rule.value);
      if (isNaN(targetNum)) return true;
      return isNum && numVal <= targetNum;
    }
    case 'between': {
      const minNum = Number(rule.value);
      const maxNum = Number(rule.value2);
      if (!isNaN(minNum) && (!isNum || numVal < minNum)) return false;
      if (!isNaN(maxNum) && (!isNum || numVal > maxNum)) return false;
      return true;
    }
    case 'in_list': {
      if (!Array.isArray(rule.value) || rule.value.length === 0) return true;
      const currentStr = String(rawVal ?? '');
      return rule.value.includes(currentStr);
    }
    default:
      return true;
  }
}

export function filterRows(rows: SheetRow[], filters: FilterState, columns: ColumnDef[]): SheetRow[] {
  return rows.filter((row) => {
    // 1. Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      const match = columns.some((col) => {
        const val = row[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
      });
      if (!match) return false;
    }

    // 2. Category Filters
    for (const [colKey, selectedVals] of Object.entries(filters.categoryFilters)) {
      if (selectedVals && selectedVals.length > 0) {
        const rowVal = String(row[colKey] ?? '');
        if (!selectedVals.includes(rowVal)) {
          return false;
        }
      }
    }

    // 3. Date Filters
    if (filters.dateColumnKey && (filters.startDate || filters.endDate || filters.datePreset !== 'all')) {
      const rawDate = row[filters.dateColumnKey];
      if (rawDate) {
        const rowTime = new Date(rawDate).getTime();
        if (!isNaN(rowTime)) {
          if (filters.startDate) {
            const startTime = new Date(filters.startDate).getTime();
            if (!isNaN(startTime) && rowTime < startTime) return false;
          }
          if (filters.endDate) {
            const endTime = new Date(filters.endDate).getTime();
            if (!isNaN(endTime) && rowTime > endTime + 86400000) return false;
          }
        }
      }
    }

    // 4. Number Range Filters
    for (const [colKey, range] of Object.entries(filters.numberRangeFilters)) {
      const val = Number(row[colKey]);
      if (!isNaN(val)) {
        if (range.min !== undefined && val < range.min) return false;
        if (range.max !== undefined && val > range.max) return false;
      }
    }

    // 5. Custom Dynamic Filter Rules
    if (filters.customRules && filters.customRules.length > 0) {
      for (const rule of filters.customRules) {
        if (!matchesCustomRule(row, rule)) {
          return false;
        }
      }
    }

    return true;
  });
}

export const COLOR_THEMES: Record<string, { primary: string; secondary: string; light: string; gradient: string[]; colors: string[] }> = {
  indigo: {
    primary: '#2563eb', // Geometric Royal Blue
    secondary: '#60a5fa',
    light: '#eff6ff',
    gradient: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
    colors: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'],
  },
  emerald: {
    primary: '#059669',
    secondary: '#34d399',
    light: '#ecfdf5',
    gradient: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
    colors: ['#059669', '#2563eb', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6'],
  },
  cyan: {
    primary: '#0891b2',
    secondary: '#22d3ee',
    light: '#ecfeff',
    gradient: ['#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc'],
    colors: ['#0891b2', '#2563eb', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'],
  },
  purple: {
    primary: '#7c3aed',
    secondary: '#a78bfa',
    light: '#f5f3ff',
    gradient: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
    colors: ['#7c3aed', '#2563eb', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'],
  },
  amber: {
    primary: '#d97706',
    secondary: '#fbbf24',
    light: '#fffbeb',
    gradient: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
    colors: ['#d97706', '#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'],
  },
  rose: {
    primary: '#e11d48',
    secondary: '#fb7185',
    light: '#fff1f2',
    gradient: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3'],
    colors: ['#e11d48', '#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'],
  },
};

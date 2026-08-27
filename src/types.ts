export interface SheetRow {
  _id: string;
  [key: string]: any;
}

export type ColumnType = 'string' | 'number' | 'date' | 'boolean';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  isNumeric?: boolean;
}

export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'area' 
  | 'pie' 
  | 'donut' 
  | 'radar' 
  | 'composed' 
  | 'kpi';

export type AggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
export type MetricAggregationType = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'DISTINCT';

export interface MetricCardConfig {
  id: string;
  title: string;
  columnKey: string; // Column key from Google Sheets (or '_rows' for total row count)
  aggregation: MetricAggregationType;
  filterRule?: CustomFilterRule; // Independent filter for this specific card
  isCurrency?: boolean;
  prefix?: string;
  suffix?: string;
  colorTheme?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'slate';
  description?: string;
}

export interface ChartConfig {
  id: string;
  title: string;
  description?: string;
  type: ChartType;
  xAxisKey: string;
  yAxisKey: string;
  secondaryYAxisKey?: string; // For composed charts
  aggregation: AggregationType;
  colorTheme: string; // e.g. 'indigo', 'emerald', 'amber', 'rose', 'cyan', 'purple'
  gridSpan: 1 | 2; // 1 = half width, 2 = full width
  sortBy?: 'value' | 'label' | 'none';
  sortDirection?: 'asc' | 'desc';
  limit?: number; // e.g. 5, 10, 0 for all
  dataRankView?: 'all' | 'top10' | 'bottom10'; // Top 10 or Bottom 10 checklist toggle
  unit?: string;
  isCurrency?: boolean;
  createdAt?: number; // timestamp for strict creation order
}

export interface DateFilterPreset {
  id: string;
  label: string;
  days?: number;
}

export type FilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'starts_with' 
  | 'ends_with' 
  | 'is_empty' 
  | 'is_not_empty' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'between' 
  | 'in_list';

export interface CustomFilterRule {
  id: string;
  columnKey: string;
  operator: FilterOperator;
  value?: any;
  value2?: any; // For between operator
}

export interface FilterState {
  searchQuery: string;
  dateColumnKey?: string;
  datePreset: string; // 'all' | '7d' | '30d' | 'this_month' | 'this_year' | 'custom'
  startDate?: string;
  endDate?: string;
  categoryFilters: Record<string, string[]>;
  numberRangeFilters: Record<string, { min?: number; max?: number }>;
  customRules?: CustomFilterRule[];
}

export interface SyncConfig {
  sourceType: 'sample' | 'url' | 'csv' | 'excel' | 'manual';
  sheetUrl: string;
  sheetId: string;
  gid: string;
  sheetName: string;
  autoSync: boolean;
  intervalSeconds: number;
  lastSyncTime: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

export interface AIAnalysisResult {
  insight: string;
  keyFindings: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface DatasetPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  columns: ColumnDef[];
  rows: SheetRow[];
  defaultCharts: ChartConfig[];
}

export type PageColorTheme = 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'slate';

export interface DashboardPage {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  color?: PageColorTheme;
  columns: ColumnDef[];
  rows: SheetRow[];
  charts: ChartConfig[];
  metricCards?: MetricCardConfig[];
  filters: FilterState;
  syncConfig: SyncConfig;
  createdAt: string;
  updatedAt: string;
}

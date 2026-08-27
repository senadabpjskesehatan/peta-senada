import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Sparkles, 
  Plus, 
  Download, 
  Layers, 
  SlidersHorizontal,
  Clock,
  Menu,
  X,
  Globe,
  Share2,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { SyncConfig, DatasetPreset, FilterState } from '../types';
import { PRESET_DATASETS } from '../data/sampleDatasets';

interface HeaderProps {
  currentDatasetTitle: string;
  activeDatasetId: string;
  syncConfig: SyncConfig;
  rowCount: number;
  filteredCount: number;
  currentDatePreset: string;
  onSelectDatePreset: (preset: string) => void;
  onSelectPreset: (preset: DatasetPreset) => void;
  onOpenConnectModal: () => void;
  onManualSync: () => void;
  onOpenAIInsights?: () => void;
  onOpenChartBuilder: () => void;
  onOpenRowModal: () => void;
  onExportCSV: () => void;
  onIntervalChange: (seconds: number) => void;
  onToggleAutoSync: (enabled: boolean) => void;
  isMobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  cloudSyncStatus?: 'synced' | 'saving' | 'syncing' | 'error';
  lastSyncedTime?: string | null;
  onOpenShareModal?: () => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDatasetTitle,
  activeDatasetId,
  syncConfig,
  rowCount,
  filteredCount,
  currentDatePreset,
  onSelectDatePreset,
  onSelectPreset,
  onOpenConnectModal,
  onManualSync,
  onOpenAIInsights,
  onOpenChartBuilder,
  onOpenRowModal,
  onExportCSV,
  onIntervalChange,
  onToggleAutoSync,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
  cloudSyncStatus = 'synced',
  lastSyncedTime,
  onOpenShareModal,
  themeMode,
  onToggleTheme,
}) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      id="main-app-header" 
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800 mb-8"
    >
      {/* Left: Title & Source */}
      <div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm"
            aria-label="Buka Menu Navigasi"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                PETA SENADA
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5 flex items-center flex-wrap gap-1.5">
              <span>Pemanfaatan Data Senada</span>
              <span className="hidden">•</span>
              <span>Sumber: <span className="underline font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={onOpenConnectModal}>{currentDatasetTitle}</span></span>
              <span className="hidden">({filteredCount} dari {rowCount} baris aktif)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Date Range Selector + Actions */}
      <div className="flex items-center gap-3 flex-wrap justify-start md:justify-end">
        
        {/* Geometric Date Range Selector */}
        <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-semibold">
          <button
            onClick={() => onSelectDatePreset('7d')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              currentDatePreset === '7d'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Day (7h)
          </button>
          <button
            onClick={() => onSelectDatePreset('30d')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              currentDatePreset === '30d'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onSelectDatePreset('this_year')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              currentDatePreset === 'this_year'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Year
          </button>
          <button
            onClick={() => onSelectDatePreset('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              currentDatePreset === 'all'
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All
          </button>
        </div>

        {/* Polling Interval Select */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm text-xs text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="header-interval-select"
            value={syncConfig.autoSync ? syncConfig.intervalSeconds : 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (val === 0) {
                onToggleAutoSync(false);
              } else {
                onToggleAutoSync(true);
                onIntervalChange(val);
              }
            }}
            aria-label="Pilih Interval Polling"
            className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="3600" className="dark:bg-slate-800">Sync 1 Jam</option>
            <option value="0" className="dark:bg-slate-800">Manual</option>
          </select>
        </div>

        {/* Share Link / Multi-network button */}
        {onOpenShareModal && (
          <button
            type="button"
            id="btn-share-network-header"
            onClick={onOpenShareModal}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Bagikan Tautan Dashboard ke Jaringan Lain"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Bagikan</span>
          </button>
        )}

        {/* Update Source / Manual Sync Button */}
        <button
          id="btn-update-source"
          onClick={onManualSync}
          disabled={syncConfig.syncStatus === 'syncing'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${syncConfig.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          <span>Update Source</span>
        </button>

        {/* Connect Sheet Button */}
        <button
          id="btn-connect-sheet-header"
          onClick={onOpenConnectModal}
          className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Hubungkan Google Sheet Baru"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden lg:inline">Google Sheet</span>
        </button>

        {/* Dark / Light Theme Mode Menu (Replacing AI Insights button) */}
        <div className="relative" ref={themeMenuRef}>
          <button
            id="btn-theme-toggle-header"
            type="button"
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Pilih Tampilan Mode (Light / Dark)"
          >
            {themeMode === 'dark' ? (
              <>
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Mode Gelap</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Mode Terang</span>
              </>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                Pilih Tampilan
              </div>
              <button
                type="button"
                onClick={() => {
                  onToggleTheme('light');
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  themeMode === 'light'
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Mode Terang (Light)</span>
                </div>
                {themeMode === 'light' && <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleTheme('dark');
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  themeMode === 'dark'
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Mode Gelap (Dark)</span>
                </div>
                {themeMode === 'dark' && <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Export CSV */}
        <button
          id="btn-export-csv-header"
          onClick={onExportCSV}
          className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-2 rounded-xl shadow-sm transition-colors cursor-pointer"
          title="Unduh Data CSV"
          aria-label="Unduh CSV"
        >
          <Download className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
};


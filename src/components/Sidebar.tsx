import React from 'react';
import { 
  LayoutDashboard, 
  BarChart2, 
  Table, 
  Sparkles, 
  Layers, 
  Radio, 
  PlusCircle, 
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Plus,
  Settings,
  FolderPlus,
  MapPin
} from 'lucide-react';
import { SyncConfig, DatasetPreset, DashboardPage } from '../types';
import { PRESET_DATASETS } from '../data/sampleDatasets';

interface SidebarProps {
  activeView: 'dashboard' | 'charts' | 'table' | 'map';
  onSelectView: (view: 'dashboard' | 'charts' | 'table' | 'map') => void;
  pages?: DashboardPage[];
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  onAddPage?: () => void;
  onEditPage?: (page: DashboardPage) => void;
  currentDatasetTitle: string;
  activeDatasetId: string;
  syncConfig: SyncConfig;
  rowCount: number;
  filteredCount: number;
  onSelectPreset: (preset: DatasetPreset) => void;
  onOpenConnectModal: () => void;
  onOpenAIInsights: () => void;
  onOpenChartBuilder: () => void;
  onOpenRowModal: () => void;
  onClearAllRows?: () => void;
  onResetDataset?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  pages = [],
  activePageId,
  onSelectPage,
  onAddPage,
  onEditPage,
  currentDatasetTitle,
  activeDatasetId,
  syncConfig,
  rowCount,
  filteredCount,
  onSelectPreset,
  onOpenConnectModal,
  onOpenAIInsights,
  onOpenChartBuilder,
  onOpenRowModal,
  onClearAllRows,
  onResetDataset,
}) => {
  return (
    <aside 
      id="sidebar-navigation"
      className="w-64 bg-slate-900 flex flex-col text-slate-300 border-r border-slate-800 shrink-0 select-none"
    >
      {/* Brand Logo & Title */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
        <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-900/40">
          P
        </div>
        <div>
          <span className="text-white font-extrabold tracking-tight text-lg block leading-none">
            PETA SENADA
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1 block">
            Pemanfaatan Data Senada
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
          Navigasi Utama
        </div>

        <button
          id="nav-dashboard"
          onClick={() => {
            onSelectView('dashboard');
            const el = document.getElementById('summary-metric-cards');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`w-full p-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
            activeView === 'dashboard'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeView === 'dashboard' ? 'text-blue-400' : ''}`} />
          <span>Dashboard</span>
        </button>

        <button
          id="nav-visualizations"
          onClick={() => {
            onSelectView('charts');
            const el = document.getElementById('charts-grid-container');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`w-full p-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
            activeView === 'charts'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className={`w-5 h-5 ${activeView === 'charts' ? 'text-emerald-400' : ''}`} />
          <span>Visualizations</span>
        </button>



        {/* Halaman Dashboard Section */}
        {pages.length > 0 && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span>Halaman Dashboard ({pages.length})</span>
              {onAddPage && (
                <button
                  onClick={onAddPage}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Tambah Halaman Baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              {pages.map((p) => {
                const isActive = p.id === activePageId;
                const isGoogleSheet = p.syncConfig?.sourceType === 'url';

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPage?.(p.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isActive 
                        ? 'bg-slate-800 text-white border border-slate-700/80 shadow-xs' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        p.color === 'emerald' ? 'bg-emerald-500' :
                        p.color === 'indigo' ? 'bg-indigo-500' :
                        p.color === 'amber' ? 'bg-amber-500' :
                        p.color === 'rose' ? 'bg-rose-500' :
                        p.color === 'cyan' ? 'bg-cyan-500' :
                        p.color === 'purple' ? 'bg-purple-500' :
                        'bg-blue-500'
                      }`} />
                      <span className="truncate">{p.title}</span>
                      {isGoogleSheet && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Live Google Sheet" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                        {p.rows.length}
                      </span>
                      {onEditPage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditPage(p);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-200 transition-opacity"
                          title="Pengaturan Halaman"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


      </nav>

      {/* Footer Real-Time Connection Status */}
      <div className="p-5 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            {syncConfig.autoSync ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
            )}
            <span className="text-[11px] uppercase tracking-wider text-slate-300">
              {syncConfig.syncStatus === 'syncing' 
                ? 'SYNCING...' 
                : syncConfig.autoSync 
                ? 'REAL-TIME CONNECTED' 
                : 'MANUAL SYNC'}
            </span>
          </div>

          <button
            onClick={onOpenConnectModal}
            className="text-slate-400 hover:text-blue-400 text-xs transition-colors"
            title="Pengaturan Koneksi"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="truncate max-w-[130px]">
            {syncConfig.sheetName || 'Sample Dataset'}
          </span>
          <span className="opacity-70 text-[10px]">
            {syncConfig.lastSyncTime}
          </span>
        </div>
      </div>
    </aside>
  );
};

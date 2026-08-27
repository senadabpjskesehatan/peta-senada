import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Settings, 
  RefreshCw, 
  FileSpreadsheet, 
  Check, 
  X,
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';
import { DashboardPage, PageColorTheme } from '../types';

interface PageTabBarProps {
  pages: DashboardPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onEditPage: (page: DashboardPage) => void;
  onRenamePage: (pageId: string, newTitle: string) => void;
  onDeletePage: (pageId: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onSyncPage: (pageId: string) => void;
  onShowDefaultMap?: () => void;
  isMapVisible?: boolean;
  onToggleMap?: () => void;
}

const COLOR_MAP: Record<PageColorTheme, { bg: string; text: string; ring: string; border: string; dot: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-500/30', border: 'border-blue-500', dot: 'bg-blue-500' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', ring: 'ring-indigo-500/30', border: 'border-indigo-500', dot: 'bg-indigo-500' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-500/30', border: 'border-emerald-500', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-500/30', border: 'border-amber-500', dot: 'bg-amber-500' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-500/30', border: 'border-rose-500', dot: 'bg-rose-500' },
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', ring: 'ring-cyan-500/30', border: 'border-cyan-500', dot: 'bg-cyan-500' },
  purple: { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-500/30', border: 'border-purple-500', dot: 'bg-purple-500' },
  slate: { bg: 'bg-slate-500', text: 'text-slate-600', ring: 'ring-slate-500/30', border: 'border-slate-500', dot: 'bg-slate-500' },
};

export const PageTabBar: React.FC<PageTabBarProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onEditPage,
  onRenamePage,
  onDeletePage,
  onDuplicatePage,
  onSyncPage,
  onShowDefaultMap,
  isMapVisible = true,
  onToggleMap,
}) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuOpenPageId, setMenuOpenPageId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingPageId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPageId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenPageId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (page: DashboardPage, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPageId(page.id);
    setEditTitle(page.title);
    setMenuOpenPageId(null);
  };

  const handleSaveRename = (pageId: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenamePage(pageId, trimmed);
    }
    setEditingPageId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(pageId);
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
    }
  };

  return (
    <div 
      id="dashboard-page-tab-bar"
      className="w-full flex items-center justify-between gap-3 mb-6 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200 backdrop-blur-xs select-none"
    >
      {/* Scrollable Tabs List */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
        {pages.map((page) => {
          const isActive = page.id === activePageId;
          const isEditing = editingPageId === page.id;
          const colorTheme = page.color || 'blue';
          const themeStyle = COLOR_MAP[colorTheme] || COLOR_MAP.blue;
          const isMenuOpen = menuOpenPageId === page.id;
          const isGoogleSheet = page.syncConfig.sourceType === 'url';

          return (
            <div
              key={page.id}
              onClick={() => {
                if (!isEditing) onSelectPage(page.id);
              }}
              onDoubleClick={(e) => handleStartRename(page, e)}
              className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/90 ring-1 ring-slate-900/5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
              }`}
              title={page.description || page.title}
            >
              {/* Color Dot / Sync Indicator */}
              <div className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full ${themeStyle.dot} shrink-0`} />
                {isGoogleSheet && (
                  <span 
                    title="Terhubung dengan Google Sheet"
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" 
                  />
                )}
              </div>

              {/* Title or Inline Edit Input */}
              {isEditing ? (
                <div 
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, page.id)}
                    className="bg-slate-50 border border-blue-500 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-900 focus:outline-none w-36 shadow-inner"
                    placeholder="Nama Halaman..."
                  />
                  <button
                    onClick={() => handleSaveRename(page.id)}
                    className="p-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title="Simpan Nama"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingPageId(null)}
                    className="p-1 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    title="Batal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="truncate max-w-[130px] sm:max-w-[180px]">
                    {page.title}
                  </span>
                  <button
                    onClick={(e) => handleStartRename(page, e)}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-200/80 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Ubah Nama Halaman (Rename)"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Row Count Badge */}
              {!isEditing && (
                <span 
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                    isActive 
                      ? 'bg-slate-100 text-slate-600' 
                      : 'bg-slate-300/60 text-slate-600 group-hover:bg-slate-200'
                  }`}
                >
                  {page.rows.length}
                </span>
              )}

              {/* Menu & Action Trigger */}
              {!isEditing && (
                <div className="relative flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenPageId(isMenuOpen ? null : page.id);
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      isActive 
                        ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-80 group-hover:opacity-100' 
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 opacity-0 group-hover:opacity-100'
                    }`}
                    title="Menu Opsi Halaman"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Context Menu Dropdown */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <button
                        onClick={(e) => handleStartRename(page, e)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Ubah Nama (Rename)</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpenPageId(null);
                          onEditPage(page);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-600" />
                        <span>Pengaturan Halaman</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpenPageId(null);
                          onDuplicatePage(page.id);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                      >
                        <Copy className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Duplikat Halaman</span>
                      </button>

                      {page.syncConfig.sourceType === 'url' && (
                        <button
                          onClick={() => {
                            setMenuOpenPageId(null);
                            onSyncPage(page.id);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sinkronkan Sekarang</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={() => {
                          setMenuOpenPageId(null);
                          onDeletePage(page.id);
                        }}
                        disabled={pages.length <= 1}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-left ${
                          pages.length <= 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Halaman</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action: Add Page & Show Map Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {(onToggleMap || onShowDefaultMap) && (
          <button
            id="btn-toggle-dashboard-map"
            type="button"
            onClick={() => {
              if (onToggleMap) {
                onToggleMap();
              } else if (onShowDefaultMap) {
                onShowDefaultMap();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 border ${
              isMapVisible
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/20'
                : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-300'
            }`}
            title={isMapVisible ? "Sembunyikan Peta Wilayah" : "Tampilkan Peta Indonesia Default"}
          >
            <Layers className={`w-4 h-4 ${isMapVisible ? 'text-indigo-200' : 'text-indigo-600'}`} />
            <span className="hidden sm:inline">{isMapVisible ? 'Peta Wilayah Aktif' : 'Tampilkan Peta'}</span>
            <span className="sm:hidden">Peta</span>
            <span className={`w-2 h-2 rounded-full ${isMapVisible ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
          </button>
        )}
        <button
          id="btn-add-dashboard-page"
          onClick={onAddPage}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-xs hover:border-slate-300 hover:text-blue-600 transition-all cursor-pointer shrink-0"
          title="Tambah Halaman Baru"
        >
          <Plus className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Tambah Halaman</span>
          <span className="sm:hidden">Halaman</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  DatasetPreset, SheetRow, ColumnDef, ChartConfig, 
  FilterState, SyncConfig, DashboardPage, PageColorTheme 
} from './types';
import { EMPTY_DATASET, PRESET_DATASETS } from './data/sampleDatasets';
import { 
  parseCSVToRows, filterRows, exportRowsToCSV, exportRowsToExcel 
} from './utils/dataProcessor';
import { fetchGoogleSheet } from './utils/sheetFetcher';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PageTabBar } from './components/PageTabBar';
import { PageManagerModal } from './components/PageManagerModal';
import { MetricCards } from './components/MetricCards';
import { FilterBar } from './components/FilterBar';
import { ChartGrid } from './components/ChartGrid';
import { ChartBuilderModal } from './components/ChartBuilderModal';
import { DataTable } from './components/DataTable';
import { RowFormModal } from './components/RowFormModal';
import { GoogleSheetConnectModal } from './components/GoogleSheetConnectModal';
import { AIInsightsModal } from './components/AIInsightsModal';
import { ShareNetworkModal } from './components/ShareNetworkModal';
import { IndonesiaMapCard } from './components/IndonesiaMapCard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { getStateFromLocation, generateShareableUrl } from './utils/shareUtils';
import { saveLocalDashboardState, getLocalDashboardState } from './utils/storage';
import { saveFirebaseDashboardState, getFirebaseDashboardState } from './utils/firebaseStorage';
import { db, doc, onSnapshot } from './lib/firebase';

const STORAGE_KEY_PAGES = 'peta_senada_dashboard_pages_v1';
const STORAGE_KEY_ACTIVE_PAGE = 'peta_senada_active_page_id_v1';

// Initial page generator
const createDefaultPage = (id = 'page-1', title = 'Ringkasan Utama', color: PageColorTheme = 'blue'): DashboardPage => ({
  id,
  title,
  description: 'Lembar kerja utama pemantauan data dan visualisasi.',
  color,
  columns: EMPTY_DATASET.columns,
  rows: EMPTY_DATASET.rows,
  charts: EMPTY_DATASET.defaultCharts,
  filters: {
    searchQuery: '',
    datePreset: 'all',
    categoryFilters: {},
    numberRangeFilters: {},
    customRules: [],
  },
  syncConfig: {
    sourceType: 'sample',
    sheetUrl: '',
    sheetId: '',
    gid: '0',
    sheetName: title,
    autoSync: true,
    intervalSeconds: 10,
    lastSyncTime: new Date().toLocaleTimeString('id-ID'),
    syncStatus: 'idle',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function App() {
  // 1. Pages State (Multi-page dashboard)
  const [pages, setPages] = useState<DashboardPage[]>(() => {
    // Check if URL contains encoded dashboard data (for instant cross-network link sharing)
    const urlState = getStateFromLocation();
    if (urlState && urlState.pages && Array.isArray(urlState.pages) && urlState.pages.length > 0) {
      return urlState.pages;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY_PAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved pages:', e);
    }
    return [createDefaultPage('page-1', 'Ringkasan Utama', 'blue')];
  });

  const [activePageId, setActivePageId] = useState<string>(() => {
    const urlState = getStateFromLocation();
    if (urlState && urlState.activePageId) {
      return urlState.activePageId;
    }

    try {
      const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_PAGE);
      if (savedId) return savedId;
    } catch (e) {}
    return 'page-1';
  });

  // Admin Mode State (User: senada, Pass: 150bisa)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('peta_senada_is_admin') === 'true';
    } catch (e) {}
    return false;
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    try {
      localStorage.setItem('peta_senada_is_admin', 'true');
    } catch (e) {}
    addToast('success', 'Mode Admin Aktif', 'Selamat datang, Admin (senada)! Semua fitur penambahan & pengeditan telah dibuka.');
  };

  const handleLogoutAdmin = () => {
    setIsAdmin(false);
    try {
      localStorage.setItem('peta_senada_is_admin', 'false');
    } catch (e) {}
    addToast('info', 'Mode Tamu (View-Only)', 'Anda telah keluar dari Mode Admin. Aplikasi kembali ke fitur tampilan.');
  };

  // Helper guard to require Admin login for editing/adding operations
  const requireAdmin = useCallback((actionDescription: string, callback: (...args: any[]) => void) => {
    return (...args: any[]) => {
      if (!isAdmin) {
        addToast('info', 'Akses Admin Diperlukan', `Silakan login sebagai Admin (senada) untuk ${actionDescription}.`);
        setIsAdminLoginModalOpen(true);
        return;
      }
      callback(...args);
    };
  }, [isAdmin]);

  // Desktop Sidebar Visibility State
  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('peta_senada_sidebar_visible');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });

  const handleToggleSidebar = () => {
    setIsSidebarVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('peta_senada_sidebar_visible', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Theme Mode State (Light / Dark)
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('peta_senada_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return 'light';
  });

  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('peta_senada_theme_mode', themeMode);
    } catch (e) {}
  }, [themeMode]);

  // Cross-Network Cloud Synchronization State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'syncing' | 'error'>('synced');
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  const isInitialServerLoadDone = useRef(false);
  const isReceivingServerUpdate = useRef(false);
  const localVersionTimestamp = useRef<number>(0);

  // Ensure active page is valid
  const activePage = useMemo(() => {
    const found = pages.find((p) => p.id === activePageId);
    return found || pages[0] || createDefaultPage();
  }, [pages, activePageId]);

  // Keep IndexedDB & localStorage updated on every page change (ONLY AFTER INITIAL LOAD DONE)
  useEffect(() => {
    if (!isInitialServerLoadDone.current || isReceivingServerUpdate.current) return;
    saveLocalDashboardState(pages, activePage.id, localVersionTimestamp.current);
  }, [pages, activePage.id]);

  // Function to save state to Firebase Firestore, Local Storage, and Server
  const saveStateToServer = async (pagesToSave: DashboardPage[], activeId: string) => {
    try {
      setCloudSyncStatus('saving');
      
      const newVersion = Date.now();
      localVersionTimestamp.current = newVersion;

      // 1. Save locally to IndexedDB & localStorage
      await saveLocalDashboardState(pagesToSave, activeId, newVersion);

      // 2. Save directly to Firebase Firestore (Primary Cloud Master Baseline)
      await saveFirebaseDashboardState(pagesToSave, activeId, newVersion, true);

      // 3. Save to server disk endpoint
      const res = await fetch('/api/dashboard/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          pages: pagesToSave,
          activePageId: activeId,
          version: newVersion,
          updatedBy: 'client',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.version) {
          localVersionTimestamp.current = data.version;
          saveLocalDashboardState(pagesToSave, activeId, data.version);
        }
      }

      setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
      setCloudSyncStatus('synced');
    } catch (err) {
      console.warn('Save state error:', err);
      setCloudSyncStatus('error');
    }
  };

  // 1. Initial Load from Firebase Firestore, Local Storage, and Server
  useEffect(() => {
    let isMounted = true;

    const initializeState = async () => {
      try {
        setCloudSyncStatus('syncing');

        // Parallel fetch from Firebase Firestore, IndexedDB, and Server
        const [firebaseState, localState, serverRes] = await Promise.all([
          getFirebaseDashboardState().catch(() => null),
          getLocalDashboardState().catch(() => null),
          fetch('/api/dashboard/state').then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);

        if (!isMounted) return;

        // Firebase Firestore is our master baseline source of truth
        const firebaseHasData = firebaseState && Array.isArray(firebaseState.pages) && firebaseState.pages.length > 0;
        const localHasData = localState && Array.isArray(localState.pages) && localState.pages.length > 0 && localState.version > 0;
        const serverHasData = serverRes && serverRes.success && Array.isArray(serverRes.pages) && serverRes.pages.length > 0;

        let selectedPages: DashboardPage[] | null = null;
        let selectedActiveId = 'page-1';
        let selectedVersion = 0;

        if (firebaseHasData) {
          // Priority 1: Firebase Firestore master state
          selectedPages = firebaseState.pages;
          selectedActiveId = firebaseState.activePageId || 'page-1';
          selectedVersion = firebaseState.version || Date.now();

          // Check if local or server has a strictly newer version from an active edit session
          if (localHasData && localState.version > selectedVersion) {
            selectedPages = localState.pages;
            selectedActiveId = localState.activePageId || 'page-1';
            selectedVersion = localState.version;
            // Sync newer local data to Firebase
            saveFirebaseDashboardState(selectedPages, selectedActiveId, selectedVersion, true);
          } else if (serverHasData && serverRes.version > selectedVersion) {
            selectedPages = serverRes.pages;
            selectedActiveId = serverRes.activePageId || 'page-1';
            selectedVersion = serverRes.version;
            // Sync newer server data to Firebase
            saveFirebaseDashboardState(selectedPages, selectedActiveId, selectedVersion, true);
          }
        } else if (localHasData && localState.version > 0) {
          // Priority 2: Local storage if Firebase is clean
          selectedPages = localState.pages;
          selectedActiveId = localState.activePageId || 'page-1';
          selectedVersion = localState.version;
          saveFirebaseDashboardState(selectedPages, selectedActiveId, selectedVersion, true);
        } else if (serverHasData) {
          // Priority 3: Server disk backup if Firebase is clean
          selectedPages = serverRes.pages;
          selectedActiveId = serverRes.activePageId || 'page-1';
          selectedVersion = serverRes.version || Date.now();
          saveFirebaseDashboardState(selectedPages, selectedActiveId, selectedVersion, true);
        }

        if (selectedPages && selectedPages.length > 0) {
          isReceivingServerUpdate.current = true;
          setPages(selectedPages);
          if (selectedActiveId) setActivePageId(selectedActiveId);
          localVersionTimestamp.current = selectedVersion;

          saveLocalDashboardState(selectedPages, selectedActiveId, selectedVersion);
        } else {
          // All cloud & local persistence are empty -> save initial default sample page to Firebase & Server
          await saveStateToServer(pages, activePageId);
        }

        setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
        setCloudSyncStatus('synced');
        setTimeout(() => {
          if (isMounted) isReceivingServerUpdate.current = false;
        }, 300);
      } catch (err) {
        console.warn('State initialization warning:', err);
        if (isMounted) setCloudSyncStatus('synced');
      } finally {
        if (isMounted) {
          isInitialServerLoadDone.current = true;
        }
      }
    };

    initializeState();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time Firestore listener for multi-device live sync
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const docRef = doc(db, 'dashboard_states', 'master');
      unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && isInitialServerLoadDone.current) {
          const data = docSnap.data();
          if (data && Array.isArray(data.pages) && data.pages.length > 0) {
            const remoteVersion = data.version || 0;
            if (remoteVersion > localVersionTimestamp.current) {
              isReceivingServerUpdate.current = true;
              localVersionTimestamp.current = remoteVersion;
              setPages(data.pages);
              if (data.activePageId) setActivePageId(data.activePageId);
              saveLocalDashboardState(data.pages, data.activePageId, remoteVersion);
              setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
              setTimeout(() => {
                isReceivingServerUpdate.current = false;
              }, 300);
            }
          }
        }
      }, (error) => {
        console.warn('Firebase snapshot listener warning:', error);
      });
    } catch (e) {
      console.warn('Failed to attach Firebase snapshot listener:', e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Debounced Auto-Save to Server whenever pages or activePageId change (Autosave to Public Cloud)
  useEffect(() => {
    if (!isInitialServerLoadDone.current || isReceivingServerUpdate.current) {
      return;
    }

    const timer = setTimeout(() => {
      saveStateToServer(pages, activePageId);
    }, 400);

    return () => clearTimeout(timer);
  }, [pages, activePageId]);

  // Update URL Hash with compressed state for small datasets (avoid hash overhead for >100 rows)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const totalRows = pages.reduce((acc, p) => acc + (p.rows?.length || 0), 0);
        if (totalRows <= 150) {
          const fullUrl = generateShareableUrl(pages, activePage.id);
          if (fullUrl && typeof window !== 'undefined') {
            window.history.replaceState(null, '', fullUrl);
          }
        }
      } catch (e) {}
    }, 800);
    return () => clearTimeout(timer);
  }, [pages, activePage.id]);

  // 3. Real-Time Server-Sent Events (SSE) Listener for Instant Cross-Device Live Sync
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/dashboard/events');

        eventSource.addEventListener('state_updated', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.version && data.version > localVersionTimestamp.current && Array.isArray(data.pages)) {
              isReceivingServerUpdate.current = true;
              setPages(data.pages);
              if (data.activePageId) {
                setActivePageId(data.activePageId);
              }
              localVersionTimestamp.current = data.version;
              setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
              setCloudSyncStatus('synced');
              setTimeout(() => {
                isReceivingServerUpdate.current = false;
              }, 200);
            }
          } catch (err) {
            console.warn('Error parsing SSE event:', err);
          }
        });

        eventSource.onerror = () => {
          eventSource?.close();
          eventSource = null;
          // Try reconnecting after 4s
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.warn('SSE connection init error:', err);
      }
    };

    connectSSE();

    // 4. Responsive Polling Fallback (in case SSE is unavailable or reconnecting)
    const interval = setInterval(async () => {
      if (!isInitialServerLoadDone.current || isReceivingServerUpdate.current) return;
      try {
        const res = await fetch('/api/dashboard/version');
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version > localVersionTimestamp.current) {
          const stateRes = await fetch('/api/dashboard/state');
          if (!stateRes.ok) return;
          const stateData = await stateRes.json();
          if (stateData.success && stateData.pages && Array.isArray(stateData.pages)) {
            isReceivingServerUpdate.current = true;
            setPages(stateData.pages);
            if (stateData.activePageId) {
              setActivePageId(stateData.activePageId);
            }
            localVersionTimestamp.current = stateData.version || Date.now();
            setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
            setCloudSyncStatus('synced');
            setTimeout(() => {
              isReceivingServerUpdate.current = false;
            }, 200);
          }
        }
      } catch (e) {
        // Silent background fallback check
      }
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, []);

  // Manual Force Actions for Modal
  const handleForceSaveToCloud = async () => {
    await saveStateToServer(pages, activePageId);
    addToast('success', 'Tersimpan ke Cloud', 'Data & grafik berhasil diunggah ke server cloud dan siap diakses jaringan lain.');
  };

  const handleForcePullFromCloud = async () => {
    try {
      setCloudSyncStatus('syncing');
      const res = await fetch('/api/dashboard/state');
      if (!res.ok) throw new Error('Gagal mengambil data dari server');
      const data = await res.json();
      if (data.success && data.pages) {
        isReceivingServerUpdate.current = true;
        setPages(data.pages);
        if (data.activePageId) setActivePageId(data.activePageId);
        localVersionTimestamp.current = data.version || Date.now();
        setLastSyncedTime(new Date().toLocaleTimeString('id-ID'));
        setCloudSyncStatus('synced');
        setTimeout(() => {
          isReceivingServerUpdate.current = false;
        }, 300);
        addToast('success', 'Sinkronisasi Selesai', 'Data terbaru berhasil dimuat dari server cloud.');
      } else {
        addToast('info', 'Server Kosong', 'Tidak ada data tersimpan di server cloud.');
      }
    } catch (err: any) {
      addToast('error', 'Gagal Sinkronisasi', err.message);
    }
  };

  // Active view in sidebar
  const [activeView, setActiveView] = useState<'dashboard' | 'charts' | 'table' | 'map'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(true);

  // Active Page Properties
  const columns = activePage.columns;
  const rows = activePage.rows;
  const charts = activePage.charts;
  const filters = activePage.filters;
  const syncConfig = activePage.syncConfig;

  // Active dataset presentation
  const activeDataset: DatasetPreset = useMemo(() => {
    const isGoogleSheet = syncConfig.sourceType === 'url';
    const isCSV = syncConfig.sourceType === 'csv';
    return {
      id: isGoogleSheet ? 'google_sheet' : isCSV ? 'imported_csv' : 'blank_dataset',
      title: activePage.title,
      description: activePage.description || `Data lembar kerja "${activePage.title}"`,
      icon: isGoogleSheet ? 'FileSpreadsheet' : 'Layers',
      columns,
      rows,
      defaultCharts: charts,
    };
  }, [activePage, columns, rows, charts, syncConfig.sourceType]);

  // Helper to mutate active page
  const updateActivePage = useCallback((updater: (prev: DashboardPage) => DashboardPage) => {
    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.id === activePage.id) {
          const updated = updater(p);
          return { ...updated, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );
  }, [activePage.id]);

  // Helper to mutate any page by ID
  const updatePageById = useCallback((pageId: string, updater: (prev: DashboardPage) => DashboardPage) => {
    setPages((prevPages) =>
      prevPages.map((p) => {
        if (p.id === pageId) {
          const updated = updater(p);
          return { ...updated, updatedAt: new Date().toISOString() };
        }
        return p;
      })
    );
  }, []);

  // Modals and UI State
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);
  const [pageModalMode, setPageModalMode] = useState<'create' | 'edit'>('create');
  const [editingPageObj, setEditingPageObj] = useState<DashboardPage | null>(null);

  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);

  const [isRowModalOpen, setIsRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SheetRow | null>(null);

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev.slice(-4), newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ----------------------------------------------------
  // PAGE CRUD HANDLERS
  // ----------------------------------------------------

  // 1. Add / Create Page
  const handleOpenAddPage = () => {
    setPageModalMode('create');
    setEditingPageObj(null);
    setIsPageModalOpen(true);
  };

  const handleSavePageFromModal = async (data: {
    title: string;
    description: string;
    color: PageColorTheme;
    sourceType?: 'blank' | 'sheet_url' | 'preset' | 'duplicate';
    presetId?: string;
    sheetUrl?: string;
  }) => {
    if (pageModalMode === 'edit' && editingPageObj) {
      // Edit existing page
      updatePageById(editingPageObj.id, (prev) => ({
        ...prev,
        title: data.title,
        description: data.description,
        color: data.color,
      }));
      addToast('success', 'Halaman Diperbarui', `Perubahan pada halaman "${data.title}" berhasil disimpan.`);
      return;
    }

    // Create New Page
    const newPageId = `page-${Date.now()}`;
    let newColumns: ColumnDef[] = EMPTY_DATASET.columns;
    let newRows: SheetRow[] = [];
    let newCharts: ChartConfig[] = [];
    let newSyncConfig: SyncConfig = {
      sourceType: 'sample',
      sheetUrl: '',
      sheetId: '',
      gid: '0',
      sheetName: data.title,
      autoSync: true,
      intervalSeconds: 10,
      lastSyncTime: new Date().toLocaleTimeString('id-ID'),
      syncStatus: 'idle',
    };

    if (data.sourceType === 'preset' && data.presetId) {
      const preset = PRESET_DATASETS.find((p) => p.id === data.presetId);
      if (preset) {
        newColumns = preset.columns;
        newRows = preset.rows;
        newCharts = preset.defaultCharts;
        newSyncConfig.sheetName = preset.title;
      }
    } else if (data.sourceType === 'duplicate' && activePage) {
      newColumns = [...activePage.columns];
      newRows = activePage.rows.map((r) => ({ ...r, _id: `row-${Date.now()}-${Math.random()}` }));
      newCharts = activePage.charts.map((c) => ({ ...c, id: `chart-${Date.now()}-${Math.random()}` }));
      newSyncConfig = { ...activePage.syncConfig, sheetName: `${data.title} (Salinan)` };
    } else if (data.sourceType === 'sheet_url' && data.sheetUrl) {
      // Fetch Google Sheet using resilient multi-tier fetcher
      const sheetResult = await fetchGoogleSheet(data.sheetUrl);
      if (sheetResult.columns.length === 0 || sheetResult.rows.length === 0) {
        throw new Error('Data spreadsheet kosong atau format tidak valid.');
      }

      newColumns = sheetResult.columns;
      newRows = sheetResult.rows;
      newSyncConfig = {
        sourceType: 'url',
        sheetUrl: data.sheetUrl,
        sheetId: '',
        gid: '0',
        sheetName: data.title || sheetResult.sheetTitle || 'Google Sheet',
        autoSync: true,
        intervalSeconds: 10,
        lastSyncTime: new Date().toLocaleTimeString('id-ID'),
        syncStatus: 'success',
      };

      // Generate initial charts
      const numCol = sheetResult.columns.find((c) => c.isNumeric || c.type === 'number');
      const catCol = sheetResult.columns.find((c) => c.type === 'string' || c.type === 'date');
      if (numCol && catCol) {
        newCharts = [
          {
            id: `chart-${Date.now()}-1`,
            title: `Total ${numCol.label} per ${catCol.label}`,
            type: 'bar',
            xAxisKey: catCol.key,
            yAxisKey: numCol.key,
            aggregation: 'SUM',
            colorTheme: 'indigo',
            gridSpan: 1,
            sortBy: 'value',
            sortDirection: 'desc',
            unit: 'Rp',
            isCurrency: /pendapatan|omset|nilai|biaya|harga|gaji|total/i.test(numCol.key),
          },
          {
            id: `chart-${Date.now()}-2`,
            title: `Distribusi ${catCol.label}`,
            type: 'donut',
            xAxisKey: catCol.key,
            yAxisKey: numCol.key,
            aggregation: 'SUM',
            colorTheme: 'emerald',
            gridSpan: 1,
            sortBy: 'value',
            sortDirection: 'desc',
          },
        ];
      }
    }

    const newPage: DashboardPage = {
      id: newPageId,
      title: data.title,
      description: data.description,
      color: data.color,
      columns: newColumns,
      rows: newRows,
      charts: newCharts,
      filters: {
        searchQuery: '',
        datePreset: 'all',
        categoryFilters: {},
        numberRangeFilters: {},
        customRules: [],
      },
      syncConfig: newSyncConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPages((prev) => [...prev, newPage]);
    setActivePageId(newPageId);
    addToast('success', 'Halaman Baru Dibuat', `Halaman "${data.title}" siap digunakan.`);
  };

  // 2. Edit Page
  const handleOpenEditPage = (page: DashboardPage) => {
    setEditingPageObj(page);
    setPageModalMode('edit');
    setIsPageModalOpen(true);
  };

  // 3. Rename Page Inline / Quick
  const handleRenamePage = (pageId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    updatePageById(pageId, (prev) => ({
      ...prev,
      title: trimmed,
      syncConfig: {
        ...prev.syncConfig,
        sheetName: prev.syncConfig.sheetName === prev.title ? trimmed : prev.syncConfig.sheetName,
      },
    }));
    addToast('success', 'Nama Halaman Diubah', `Halaman berganti nama menjadi "${trimmed}".`);
  };

  // 4. Duplicate Page
  const handleDuplicatePage = (pageId: string) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target) return;

    const newPageId = `page-${Date.now()}`;
    const duplicated: DashboardPage = {
      ...target,
      id: newPageId,
      title: `${target.title} (Salinan)`,
      rows: target.rows.map((r) => ({ ...r, _id: `row-${Date.now()}-${Math.random()}` })),
      charts: target.charts.map((c) => ({ ...c, id: `chart-${Date.now()}-${Math.random()}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPages((prev) => [...prev, duplicated]);
    setActivePageId(newPageId);
    addToast('success', 'Halaman Diduplikasi', `Salinan "${duplicated.title}" berhasil dibuat.`);
  };

  // 5. Delete Page
  const handleDeletePage = (pageId: string) => {
    const target = pages.find((p) => p.id === pageId);
    if (!target) return;

    if (pages.length <= 1) {
      if (window.confirm('Ini adalah satu-satunya halaman pada dashboard. Hapus dan buat halaman kosong baru?')) {
        const fresh = createDefaultPage('page-1', 'Ringkasan Utama', 'blue');
        setPages([fresh]);
        setActivePageId(fresh.id);
        addToast('info', 'Halaman Direset', 'Dashboard dikembalikan ke halaman awal yang bersih.');
      }
      return;
    }

    if (window.confirm(`Yakin ingin menghapus halaman "${target.title}"? Semua data dan visualisasi pada halaman ini akan dihapus.`)) {
      const remaining = pages.filter((p) => p.id !== pageId);
      setPages(remaining);
      if (activePageId === pageId) {
        setActivePageId(remaining[0].id);
      }
      addToast('info', 'Halaman Dihapus', `Halaman "${target.title}" telah dihapus.`);
    }
  };

  // 6. Switch Preset Template into Active Page
  const handleSelectPreset = (preset: DatasetPreset) => {
    updateActivePage((prev) => ({
      ...prev,
      title: preset.id === 'blank_dataset' ? prev.title : preset.title,
      columns: preset.columns,
      rows: preset.rows,
      charts: preset.defaultCharts,
      filters: {
        searchQuery: '',
        datePreset: 'all',
        categoryFilters: {},
        numberRangeFilters: {},
        customRules: [],
      },
      syncConfig: {
        sourceType: 'sample',
        sheetUrl: '',
        sheetId: '',
        gid: '0',
        sheetName: preset.title,
        autoSync: true,
        intervalSeconds: 10,
        lastSyncTime: new Date().toLocaleTimeString('id-ID'),
        syncStatus: 'idle',
      },
    }));
    addToast('success', 'Template Berhasil Dimuat', `Data "${preset.title}" diterapkan pada halaman aktif.`);
  };

  // 7. Connect Google Sheet (supports updating active page OR creating a brand new page)
  const handleConnectUrl = async (
    url: string, 
    intervalSeconds: number, 
    customName?: string, 
    createNewPage = false
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      updateActivePage((prev) => ({
        ...prev,
        syncConfig: { ...prev.syncConfig, syncStatus: 'syncing' },
      }));

      const sheetResult = await fetchGoogleSheet(url);

      if (sheetResult.columns.length === 0 || sheetResult.rows.length === 0) {
        throw new Error('Data spreadsheet kosong atau format kolom tidak dikenali.');
      }

      const resolvedTitle = customName?.trim() || sheetResult.sheetTitle || 'Google Sheet Terhubung';

      // Auto generate initial charts for new sheet
      const numCol = sheetResult.columns.find((c) => c.isNumeric || c.type === 'number');
      const catCol = sheetResult.columns.find((c) => c.type === 'string' || c.type === 'date');

      let generatedCharts = charts;
      if (numCol && catCol) {
        generatedCharts = [
          {
            id: `chart-${Date.now()}-1`,
            title: `Total ${numCol.label} per ${catCol.label}`,
            type: 'bar',
            xAxisKey: catCol.key,
            yAxisKey: numCol.key,
            aggregation: 'SUM',
            colorTheme: 'indigo',
            gridSpan: 1,
            sortBy: 'value',
            sortDirection: 'desc',
            unit: 'Rp',
            isCurrency: /pendapatan|omset|nilai|biaya|harga|gaji|total/i.test(numCol.key),
          },
          {
            id: `chart-${Date.now()}-2`,
            title: `Distribusi ${catCol.label}`,
            type: 'donut',
            xAxisKey: catCol.key,
            yAxisKey: numCol.key,
            aggregation: 'SUM',
            colorTheme: 'emerald',
            gridSpan: 1,
            sortBy: 'value',
            sortDirection: 'desc',
          },
        ];
      }

      const newSyncConf: SyncConfig = {
        sourceType: 'url',
        sheetUrl: url,
        sheetId: '',
        gid: '0',
        sheetName: resolvedTitle,
        autoSync: true,
        intervalSeconds,
        lastSyncTime: new Date().toLocaleTimeString('id-ID'),
        syncStatus: 'success',
      };

      let updatedPages = pages;
      let targetActivePageId = activePageId;

      if (createNewPage) {
        const newPageId = `page-${Date.now()}`;
        const newPage: DashboardPage = {
          id: newPageId,
          title: resolvedTitle,
          description: `Data tersinkronisasi otomatis dari Google Sheet "${resolvedTitle}"`,
          color: 'emerald',
          columns: sheetResult.columns,
          rows: sheetResult.rows,
          charts: generatedCharts,
          filters: {
            searchQuery: '',
            datePreset: 'all',
            categoryFilters: {},
            numberRangeFilters: {},
            customRules: [],
          },
          syncConfig: newSyncConf,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        updatedPages = [...pages, newPage];
        targetActivePageId = newPageId;
        setPages(updatedPages);
        setActivePageId(targetActivePageId);
        addToast('success', 'Halaman Baru Terhubung!', `Halaman "${resolvedTitle}" (${sheetResult.rows.length} baris) berhasil dibuat dan disinkronkan.`);
      } else {
        // Update current page
        updatedPages = pages.map((p) => {
          if (p.id === activePage.id) {
            return {
              ...p,
              title: customName?.trim() ? customName.trim() : p.title === 'Ringkasan Utama' || p.title === 'Lembar Kerja Kosong' ? resolvedTitle : p.title,
              columns: sheetResult.columns,
              rows: sheetResult.rows,
              charts: generatedCharts,
              syncConfig: newSyncConf,
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
        setPages(updatedPages);
        addToast('success', 'Google Sheet Terhubung!', `Berhasil memuat "${resolvedTitle}" (${sheetResult.rows.length} baris data) ke halaman ini.`);
      }

      isInitialServerLoadDone.current = true;
      saveStateToServer(updatedPages, targetActivePageId);

      return { success: true };
    } catch (err: any) {
      console.error(err);
      const message = err.message || 'Periksa kembali izin publikasi Google Sheet';
      updateActivePage((prev) => ({
        ...prev,
        syncConfig: {
          ...prev.syncConfig,
          syncStatus: 'error',
          errorMessage: message,
        },
      }));
      addToast('error', 'Gagal Terhubung', message);
      return { success: false, error: message };
    }
  };

  // 8. Import Dataset (Excel / CSV / Pasted Text)
  const handleImportData = (
    data: { columns: ColumnDef[]; rows: SheetRow[] },
    name: string,
    createNewPage = false,
    sourceType: 'csv' | 'excel' = 'excel',
    importMode: 'replace' | 'append' = 'replace'
  ) => {
    try {
      if (!data.columns || data.columns.length === 0 || !data.rows || data.rows.length === 0) {
        throw new Error('Gagal upload: Format kolom tidak sesuai atau data kosong.');
      }

      if (importMode === 'append' && !createNewPage) {
        const activePageObj = pages.find(p => p.id === activePageId);
        if (activePageObj && activePageObj.columns.length > 0) {
          const activeCols = activePageObj.columns.map(c => c.key.toLowerCase());
          const incomingCols = data.columns.map(c => c.key.toLowerCase());
          const isMatch = activeCols.length === incomingCols.length && activeCols.every(k => incomingCols.includes(k));
          if (!isMatch) {
            throw new Error('Gagal upload: Format kolom tidak sama dengan data pada halaman aktif. Ketentuan kolom data harus sama.');
          }
        }
      }

      const numCol = data.columns.find((c) => c.isNumeric || c.type === 'number');
      const catCol = data.columns.find((c) => c.type === 'string' || c.type === 'date');

      let generatedCharts = charts;
      if (numCol && catCol) {
        generatedCharts = [
          {
            id: `chart-${Date.now()}-1`,
            title: `Visualisasi ${numCol.label} per ${catCol.label}`,
            type: 'bar',
            xAxisKey: catCol.key,
            yAxisKey: numCol.key,
            aggregation: 'SUM',
            colorTheme: 'cyan',
            gridSpan: 1,
            sortBy: 'value',
            sortDirection: 'desc',
          },
        ];
      }

      const datasetName = name?.trim() || (sourceType === 'excel' ? 'Dataset Excel' : 'Spreadsheet Terimpor');
      const syncConf: SyncConfig = {
        sourceType,
        sheetUrl: '',
        sheetId: '',
        gid: '0',
        sheetName: datasetName,
        autoSync: false,
        intervalSeconds: 10,
        lastSyncTime: new Date().toLocaleTimeString('id-ID'),
        syncStatus: 'success',
      };

      let updatedPages = pages;
      let targetActivePageId = activePageId;

      if (createNewPage) {
        const newPageId = `page-${Date.now()}`;
        const newPage: DashboardPage = {
          id: newPageId,
          title: datasetName,
          description: `Data terimpor dari file ${sourceType.toUpperCase()}: ${datasetName}`,
          color: sourceType === 'excel' ? 'emerald' : 'cyan',
          columns: data.columns,
          rows: data.rows,
          charts: generatedCharts,
          filters: {
            searchQuery: '',
            datePreset: 'all',
            categoryFilters: {},
            numberRangeFilters: {},
            customRules: [],
          },
          syncConfig: syncConf,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        updatedPages = [...pages, newPage];
        targetActivePageId = newPageId;
        setPages(updatedPages);
        setActivePageId(targetActivePageId);
        addToast('success', `Halaman Baru (${sourceType.toUpperCase()})`, `Halaman "${datasetName}" (${data.rows.length} baris) berhasil dibuat.`);
      } else {
        if (importMode === 'append') {
          updatedPages = pages.map((p) => {
            if (p.id === activePage.id) {
              const existingColKeys = new Set(p.columns.map(c => c.key));
              const newCols = data.columns.filter(c => !existingColKeys.has(c.key));
              const combinedColumns = [...p.columns, ...newCols];
              const appendedRows = [
                ...p.rows,
                ...data.rows.map((r, idx) => ({ ...r, _id: `row-appended-${Date.now()}-${idx}` }))
              ];
              return {
                ...p,
                columns: combinedColumns,
                rows: appendedRows,
                syncConfig: syncConf,
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          });
          setPages(updatedPages);
          addToast('success', 'Data Berhasil Ditambahkan', `Menambahkan ${data.rows.length} baris baru ke halaman aktif.`);
        } else {
          updatedPages = pages.map((p) => {
            if (p.id === activePage.id) {
              return {
                ...p,
                title: datasetName,
                columns: data.columns,
                rows: data.rows,
                charts: generatedCharts,
                syncConfig: syncConf,
                updatedAt: new Date().toISOString(),
              };
            }
            return p;
          });
          setPages(updatedPages);
          addToast('success', `Data ${sourceType.toUpperCase()} Berhasil Dimuat`, `"${datasetName}" (${data.rows.length} baris data) menggantikan halaman aktif.`);
        }
      }

      isInitialServerLoadDone.current = true;
      saveStateToServer(updatedPages, targetActivePageId);
    } catch (err: any) {
      addToast('error', 'Gagal Impor Data', err.message?.includes('Gagal upload') ? err.message : `Gagal upload: Format kolom tidak sesuai (${err.message})`);
    }
  };

  // Import CSV text handler (legacy & pasted text wrapper)
  const handleImportCSV = (csvText: string, name: string, createNewPage = false) => {
    try {
      const parsed = parseCSVToRows(csvText);
      handleImportData(parsed, name, createNewPage, 'csv');
    } catch (err: any) {
      addToast('error', 'Gagal Impor CSV', err.message);
    }
  };

  // 9. Manual & Real-Time Syncing Loop (Per Page)
  const isSyncingRef = React.useRef(false);

  const performSync = useCallback(async (targetPageId?: string, isSilent = false) => {
    if (isSyncingRef.current) return;

    const pageToSync = targetPageId 
      ? pages.find((p) => p.id === targetPageId) 
      : activePage;

    if (!pageToSync) return;

    if (pageToSync.syncConfig.sourceType === 'url' && pageToSync.syncConfig.sheetUrl) {
      isSyncingRef.current = true;
      if (!isSilent) {
        updatePageById(pageToSync.id, (prev) => ({
          ...prev,
          syncConfig: { ...prev.syncConfig, syncStatus: 'syncing' },
        }));
      }

      try {
        const sheetResult = await fetchGoogleSheet(pageToSync.syncConfig.sheetUrl, pageToSync.syncConfig.gid);

        if (sheetResult.rows.length > 0) {
          updatePageById(pageToSync.id, (prev) => ({
            ...prev,
            rows: sheetResult.rows,
            columns: sheetResult.columns.length > 0 ? sheetResult.columns : prev.columns,
            syncConfig: {
              ...prev.syncConfig,
              lastSyncTime: new Date().toLocaleTimeString('id-ID'),
              syncStatus: 'success',
            },
          }));
          if (!isSilent) {
            addToast('success', 'Sinkronisasi Berhasil', `Data "${pageToSync.title}" telah diperbarui dari Google Sheet.`);
          }
        }
      } catch (err: any) {
        if (!isSilent) {
          addToast('error', 'Sinkronisasi Gagal', err.message || 'Gagal memperbarui data spreadsheet.');
        }
      } finally {
        isSyncingRef.current = false;
      }
    } else {
      if (!isSilent) {
        updatePageById(pageToSync.id, (prev) => ({
          ...prev,
          syncConfig: {
            ...prev.syncConfig,
            lastSyncTime: new Date().toLocaleTimeString('id-ID'),
            syncStatus: 'success',
          },
        }));
        addToast('info', 'Data Tersinkron', `Data pada halaman "${pageToSync.title}" siap dan mutakhir.`);
      }
    }
  }, [pages, activePage, updatePageById]);

  // Real-time polling timer for active page
  useEffect(() => {
    if (!syncConfig.autoSync || syncConfig.intervalSeconds <= 0 || syncConfig.sourceType !== 'url' || !syncConfig.sheetUrl) {
      return;
    }

    const intervalMs = Math.max(5, syncConfig.intervalSeconds) * 1000;
    const timer = setInterval(() => {
      performSync(activePage.id, true);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [syncConfig.autoSync, syncConfig.intervalSeconds, syncConfig.sourceType, syncConfig.sheetUrl, activePage.id, performSync]);

  // 10. Filtered Rows calculation
  const filteredData = useMemo(() => {
    return filterRows(rows, filters, columns);
  }, [rows, filters, columns]);

  // Quick Date Preset handler
  const handleDatePreset = (preset: string) => {
    const today = new Date();
    let start = '';
    let end = today.toISOString().split('T')[0];

    const dateCol = columns.find(c => c.type === 'date' || /tanggal|date|waktu|bulan/i.test(c.key));

    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'this_year') {
      const d = new Date(today.getFullYear(), 0, 1);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    updateActivePage((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        dateColumnKey: dateCol?.key,
        datePreset: preset,
        startDate: start,
        endDate: end,
      },
    }));
  };

  // 11. CRUD Operations for Charts (Strict Creation Sequence: First created stays first)
  const handleSaveChart = (chartConfig: ChartConfig) => {
    const now = Date.now();
    if (editingChart) {
      updateActivePage((prev) => ({
        ...prev,
        charts: prev.charts.map((c) => (c.id === chartConfig.id ? { ...chartConfig, createdAt: c.createdAt || now } : c)),
      }));
      addToast('success', 'Grafik Diperbarui', `Grafik "${chartConfig.title}" berhasil diubah.`);
    } else {
      const newChart: ChartConfig = {
        ...chartConfig,
        createdAt: chartConfig.createdAt || now,
      };
      updateActivePage((prev) => ({
        ...prev,
        // Append to the end so the first created chart stays at the first position (#1)
        charts: [...prev.charts, newChart],
      }));
      addToast('success', 'Grafik Ditambahkan', `Grafik "${chartConfig.title}" berhasil dibuat pada urutan ke-${charts.length + 1}.`);
    }
    setEditingChart(null);
  };

  const handleDuplicateChart = (chart: ChartConfig) => {
    const duplicated: ChartConfig = {
      ...chart,
      id: `chart-${Date.now()}`,
      title: `${chart.title} (Salinan)`,
      createdAt: Date.now(),
    };
    updateActivePage((prev) => ({
      ...prev,
      // Appended to the end following creation sequence
      charts: [...prev.charts, duplicated],
    }));
    addToast('success', 'Grafik Diduplikasi', `Salinan untuk "${chart.title}" telah dibuat.`);
  };

  const handleUpdateChart = (updatedChart: ChartConfig) => {
    updateActivePage((prev) => ({
      ...prev,
      charts: prev.charts.map((c) => (c.id === updatedChart.id ? updatedChart : c)),
    }));
  };

  const handleReorderCharts = (newCharts: ChartConfig[]) => {
    updateActivePage((prev) => ({
      ...prev,
      charts: newCharts,
    }));
  };

  const handleDeleteChart = (chartId: string) => {
    const target = charts.find((c) => c.id === chartId);
    if (window.confirm(`Hapus grafik "${target?.title || 'ini'}"?`)) {
      updateActivePage((prev) => ({
        ...prev,
        charts: prev.charts.filter((c) => c.id !== chartId),
      }));
      addToast('info', 'Grafik Dihapus', 'Grafik berhasil dihapus dari halaman dashboard.');
    }
  };

  // 12. CRUD Operations for Table Rows & Columns
  const handleSaveRow = (rowToSave: SheetRow) => {
    if (editingRow) {
      updateActivePage((prev) => ({
        ...prev,
        rows: prev.rows.map((r) => (r._id === rowToSave._id ? rowToSave : r)),
      }));
      addToast('success', 'Baris Disimpan', 'Perubahan baris berhasil diperbarui.');
    } else {
      updateActivePage((prev) => ({
        ...prev,
        rows: [rowToSave, ...prev.rows],
      }));
      addToast('success', 'Baris Ditambahkan', 'Entri data baru berhasil ditambahkan.');
    }
    setEditingRow(null);
  };

  const handleDuplicateRow = (row: SheetRow) => {
    const dupRow: SheetRow = {
      ...row,
      _id: `row-${Date.now()}`,
    };
    updateActivePage((prev) => ({
      ...prev,
      rows: [dupRow, ...prev.rows],
    }));
    addToast('success', 'Baris Diduplikasi', 'Duplikat data baris berhasil dibuat.');
  };

  const handleDeleteRow = (rowId: string) => {
    if (window.confirm('Hapus baris data ini?')) {
      updateActivePage((prev) => ({
        ...prev,
        rows: prev.rows.filter((r) => r._id !== rowId),
      }));
      addToast('info', 'Baris Dihapus', 'Entri data telah dihapus.');
    }
  };

  const handleBulkDeleteRows = (rowIds: string[]) => {
    updateActivePage((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => !rowIds.includes(r._id)),
    }));
    addToast('info', 'Baris Dihapus', `${rowIds.length} entri data berhasil dihapus.`);
  };

  const handleClearAllRows = () => {
    if (rows.length === 0) {
      addToast('info', 'Data Sudah Kosong', 'Tidak ada data yang dapat dihapus pada halaman ini.');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus semua (${rows.length}) baris data pada halaman "${activePage.title}"? Seluruh tabel data halaman ini akan dikosongkan.`)) {
      const prevCount = rows.length;
      updateActivePage((prev) => ({
        ...prev,
        rows: [],
      }));
      addToast('info', 'Semua Data Dihapus', `${prevCount} baris data berhasil dikosongkan.`);
    }
  };

  const handleResetDataset = () => {
    if (window.confirm(`Pulihkan data halaman "${activePage.title}" ke versi awal bawaan?`)) {
      updateActivePage((prev) => ({
        ...prev,
        rows: EMPTY_DATASET.rows,
        columns: EMPTY_DATASET.columns,
        charts: EMPTY_DATASET.defaultCharts,
      }));
      addToast('success', 'Halaman Dipulihkan', `Halaman "${activePage.title}" dikembalikan ke kondisi default.`);
    }
  };

  const handleAddColumn = (colName: string, type: ColumnDef['type']) => {
    const formattedKey = colName.replace(/\s+/g, '_');
    if (columns.some((c) => c.key === formattedKey)) {
      addToast('error', 'Kolom Sudah Ada', `Kolom "${colName}" sudah terdaftar.`);
      return;
    }

    const newCol: ColumnDef = {
      key: formattedKey,
      label: colName,
      type,
      isNumeric: type === 'number',
    };

    updateActivePage((prev) => ({
      ...prev,
      columns: [...prev.columns, newCol],
      rows: prev.rows.map((r) => ({
        ...r,
        [formattedKey]: type === 'number' ? 0 : '',
      })),
    }));
    addToast('success', 'Kolom Ditambahkan', `Kolom "${colName}" siap digunakan di tabel dan grafik.`);
  };

  const handleExportCSV = () => {
    exportRowsToCSV(columns, filteredData, `${activePage.title.replace(/\s+/g, '_')}_export.csv`);
    addToast('success', 'Ekspor Selesai', 'File CSV berhasil diunduh.');
  };

  return (
    <div className={`flex h-screen w-full bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans ${themeMode}`}>
      
      {/* 1. Geometric Left Sidebar (Desktop fixed, Mobile drawer) */}
      {isSidebarVisible && (
        <div className="hidden lg:flex shrink-0">
          <Sidebar
            activeView={activeView}
            onSelectView={setActiveView}
            pages={pages}
            activePageId={activePage.id}
            onSelectPage={setActivePageId}
            onAddPage={requireAdmin('menambah halaman dashboard', handleOpenAddPage)}
            onEditPage={requireAdmin('mengedit halaman', handleOpenEditPage)}
            currentDatasetTitle={activePage.title}
            activeDatasetId={activeDataset.id}
            syncConfig={syncConfig}
            rowCount={rows.length}
            filteredCount={filteredData.length}
            onSelectPreset={requireAdmin('memuat template preset', handleSelectPreset)}
            onOpenConnectModal={requireAdmin('menghubungkan Google Sheet', () => setIsConnectModalOpen(true))}
            onOpenAIInsights={() => setIsAIInsightsOpen(true)}
            onOpenChartBuilder={requireAdmin('membuat grafik', () => {
              setEditingChart(null);
              setIsChartBuilderOpen(true);
            })}
            onOpenRowModal={requireAdmin('menambah baris data', () => {
              setEditingRow(null);
              setIsRowModalOpen(true);
            })}
            onClearAllRows={requireAdmin('mengosongkan data', handleClearAllRows)}
            onResetDataset={requireAdmin('mereset dataset', handleResetDataset)}
            isAdmin={isAdmin}
            onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
            onLogoutAdmin={handleLogoutAdmin}
            onToggleSidebar={handleToggleSidebar}
          />
        </div>
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" 
            onClick={() => setIsMobileSidebarOpen(false)} 
          />
          <div className="relative z-10 w-64 flex">
            <Sidebar
              activeView={activeView}
              onSelectView={(v) => {
                setActiveView(v);
                setIsMobileSidebarOpen(false);
              }}
              pages={pages}
              activePageId={activePage.id}
              onSelectPage={(id) => {
                setActivePageId(id);
                setIsMobileSidebarOpen(false);
              }}
              onAddPage={requireAdmin('menambah halaman dashboard', () => {
                handleOpenAddPage();
                setIsMobileSidebarOpen(false);
              })}
              onEditPage={requireAdmin('mengedit halaman', (p) => {
                handleOpenEditPage(p);
                setIsMobileSidebarOpen(false);
              })}
              currentDatasetTitle={activePage.title}
              activeDatasetId={activeDataset.id}
              syncConfig={syncConfig}
              rowCount={rows.length}
              filteredCount={filteredData.length}
              onSelectPreset={requireAdmin('memuat template preset', (p) => {
                handleSelectPreset(p);
                setIsMobileSidebarOpen(false);
              })}
              onOpenConnectModal={requireAdmin('menghubungkan Google Sheet', () => {
                setIsConnectModalOpen(true);
                setIsMobileSidebarOpen(false);
              })}
              onOpenAIInsights={() => {
                setIsAIInsightsOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenChartBuilder={requireAdmin('membuat grafik', () => {
                setEditingChart(null);
                setIsChartBuilderOpen(true);
                setIsMobileSidebarOpen(false);
              })}
              onOpenRowModal={requireAdmin('menambah baris data', () => {
                setEditingRow(null);
                setIsRowModalOpen(true);
                setIsMobileSidebarOpen(false);
              })}
              onClearAllRows={requireAdmin('mengosongkan data', handleClearAllRows)}
              onResetDataset={requireAdmin('mereset dataset', handleResetDataset)}
              isAdmin={isAdmin}
              onOpenAdminLogin={() => {
                setIsAdminLoginModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onLogoutAdmin={() => {
                handleLogoutAdmin();
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Executive Content Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 bg-[#f1f5f9] dark:bg-slate-900 transition-colors duration-200 overflow-y-auto">
        
        {/* Geometric Header Bar */}
        <Header
          currentDatasetTitle={activePage.title}
          activeDatasetId={activeDataset.id}
          syncConfig={syncConfig}
          rowCount={rows.length}
          filteredCount={filteredData.length}
          currentDatePreset={filters.datePreset}
          onSelectDatePreset={handleDatePreset}
          onSelectPreset={requireAdmin('memuat template preset', handleSelectPreset)}
          onOpenConnectModal={requireAdmin('menghubungkan Google Sheet', () => setIsConnectModalOpen(true))}
          onManualSync={requireAdmin('memperbarui data sumber', () => performSync(activePage.id, false))}
          onOpenAIInsights={() => setIsAIInsightsOpen(true)}
          onOpenChartBuilder={requireAdmin('membuat grafik', () => {
            setEditingChart(null);
            setIsChartBuilderOpen(true);
          })}
          onOpenRowModal={requireAdmin('menambah baris data', () => {
            setEditingRow(null);
            setIsRowModalOpen(true);
          })}
          onExportCSV={handleExportCSV}
          onIntervalChange={(sec) =>
            requireAdmin('mengubah interval sync', () =>
              updateActivePage((prev) => ({
                ...prev,
                syncConfig: { ...prev.syncConfig, intervalSeconds: sec },
              }))
            )()
          }
          onToggleAutoSync={(enabled) =>
            requireAdmin('mengubah mode sync otomatis', () =>
              updateActivePage((prev) => ({
                ...prev,
                syncConfig: { ...prev.syncConfig, autoSync: enabled },
              }))
            )()
          }
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          cloudSyncStatus={cloudSyncStatus}
          lastSyncedTime={lastSyncedTime}
          onOpenShareModal={async () => {
            await saveStateToServer(pages, activePageId);
            setIsShareModalOpen(true);
          }}
          themeMode={themeMode}
          onToggleTheme={setThemeMode}
          isAdmin={isAdmin}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onLogoutAdmin={handleLogoutAdmin}
          isSidebarVisible={isSidebarVisible}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* 3. Dashboard Page Tab Navigation Bar */}
        <PageTabBar
          pages={pages}
          activePageId={activePage.id}
          onSelectPage={setActivePageId}
          onAddPage={requireAdmin('menambah halaman baru', handleOpenAddPage)}
          onEditPage={requireAdmin('mengedit halaman', handleOpenEditPage)}
          onRenamePage={requireAdmin('mengubah nama halaman', handleRenamePage)}
          onDeletePage={requireAdmin('menghapus halaman', handleDeletePage)}
          onDuplicatePage={requireAdmin('menduplikasi halaman', handleDuplicatePage)}
          onSyncPage={requireAdmin('sinkronisasi halaman', (id) => performSync(id, false))}
          isMapVisible={isMapVisible}
          onToggleMap={() => {
            setIsMapVisible((prev) => {
              const nextState = !prev;
              if (nextState) {
                setTimeout(() => {
                  const el = document.getElementById('indonesia-map-card-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
              return nextState;
            });
          }}
          onShowDefaultMap={() => {
            setIsMapVisible(true);
            setTimeout(() => {
              const el = document.getElementById('indonesia-map-card-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
        />

        {/* Indonesia Geographical Map Card directly below tab bar button */}
        {isMapVisible && (
          <div className="animate-fade-in transition-all duration-300">
            <IndonesiaMapCard
              rows={rows}
              columns={columns}
              onClose={() => setIsMapVisible(false)}
              selectedRegionFilter={(() => {
                const regCol = columns.find(c => 
                  /wilayah|kota|kabupaten|dati|provinsi|lokasi|daerah|region|area|branch|cabang|pulau/i.test(c.key) ||
                  /wilayah|kota|kabupaten|dati|provinsi|lokasi|daerah|region|area|branch|cabang|pulau/i.test(c.label)
                )?.key || columns.find(c => c.type === 'string' || !c.type)?.key || columns[0]?.key || '';
                return regCol ? (filters.categoryFilters[regCol] || []) : [];
              })()}
              onSelectRegionFilter={(regionName) => {
                const regCol = columns.find(c => 
                  /wilayah|kota|kabupaten|dati|provinsi|lokasi|daerah|region|area|branch|cabang|pulau/i.test(c.key) ||
                  /wilayah|kota|kabupaten|dati|provinsi|lokasi|daerah|region|area|branch|cabang|pulau/i.test(c.label)
                )?.key || columns.find(c => c.type === 'string' || !c.type)?.key || columns[0]?.key || '';
                if (!regCol) return;
                const currentSelected = filters.categoryFilters[regCol] || [];
                const isAlreadySelected = currentSelected.includes(regionName);
                const updated = isAlreadySelected ? [] : [regionName];
                updateActivePage((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    categoryFilters: {
                      ...prev.filters.categoryFilters,
                      [regCol]: updated,
                    },
                  },
                }));
              }}
              onResetRegionFilter={() => {
                const regCol = columns.find(c => 
                  /wilayah|kota|kabupaten|dati|provinsi|lokasi|daerah|region|area|branch|cabang|pulau/i.test(c.key) ||
                  /wilayah|kota|kabupaten|dati|provinsi|lokasi|daerah|region|area|branch|cabang|pulau/i.test(c.label)
                )?.key || columns.find(c => c.type === 'string' || !c.type)?.key || columns[0]?.key || '';
                if (!regCol) return;
                updateActivePage((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    categoryFilters: {
                      ...prev.filters.categoryFilters,
                      [regCol]: [],
                    },
                  },
                }));
              }}
            />
          </div>
        )}

        {/* Overview Metric Cards */}
        <MetricCards
          rows={filteredData}
          allRows={rows}
          columns={columns}
        />

        {/* Dynamic Filter Controls */}
        <FilterBar
          columns={columns}
          allRows={rows}
          filters={filters}
          onFilterChange={(newFilters) =>
            updateActivePage((prev) => ({
              ...prev,
              filters: typeof newFilters === 'function' ? newFilters(prev.filters) : newFilters,
            }))
          }
          onResetFilters={() =>
            updateActivePage((prev) => ({
              ...prev,
              filters: {
                searchQuery: '',
                datePreset: 'all',
                categoryFilters: {},
                numberRangeFilters: {},
                customRules: [],
              },
            }))
          }
        />

        {/* Visualizations Grid in Creation Order */}
        <ChartGrid
          charts={charts}
          rows={filteredData}
          onEditChart={(chart) => {
            requireAdmin('mengedit grafik visualisasi', () => {
              setEditingChart(chart);
              setIsChartBuilderOpen(true);
            })();
          }}
          onDuplicateChart={(chart) => requireAdmin('menduplikasi grafik', () => handleDuplicateChart(chart))()}
          onDeleteChart={(chartId) => requireAdmin('menghapus grafik', () => handleDeleteChart(chartId))()}
          onUpdateChart={(chart) => requireAdmin('memperbarui grafik', () => handleUpdateChart(chart))()}
          onReorderCharts={(newCharts) => requireAdmin('mengatur urutan grafik', () => handleReorderCharts(newCharts))()}
          onAddChart={() => {
            requireAdmin('menambah grafik visualisasi baru', () => {
              setEditingChart(null);
              setIsChartBuilderOpen(true);
            })();
          }}
        />

        {/* Raw Data Table Grid */}
        <DataTable
          columns={columns}
          rows={filteredData}
          allRowsCount={rows.length}
          onAddRow={() => {
            requireAdmin('menambah baris data', () => {
              setEditingRow(null);
              setIsRowModalOpen(true);
            })();
          }}
          onEditRow={(row) => {
            requireAdmin('mengedit baris data', () => {
              setEditingRow(row);
              setIsRowModalOpen(true);
            })();
          }}
          onDuplicateRow={(row) => requireAdmin('menduplikasi baris data', () => handleDuplicateRow(row))()}
          onDeleteRow={(rowId) => requireAdmin('menghapus baris data', () => handleDeleteRow(rowId))()}
          onBulkDeleteRows={(selectedIds) => requireAdmin('menghapus beberapa baris data', () => handleBulkDeleteRows(selectedIds))()}
          onAddColumn={(name, type) => requireAdmin('menambah kolom data baru', () => handleAddColumn(name, type))()}
          onExportCSV={handleExportCSV}
          onClearAllRows={() => requireAdmin('mengosongkan data', () => handleClearAllRows())()}
        />

      </main>

      {/* Modals & Dialogs */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />
      <PageManagerModal
        isOpen={isPageModalOpen}
        onClose={() => {
          setIsPageModalOpen(false);
          setEditingPageObj(null);
        }}
        mode={pageModalMode}
        editingPage={editingPageObj}
        activePage={activePage}
        onSavePage={handleSavePageFromModal}
        onDeletePage={handleDeletePage}
      />

      <ChartBuilderModal
        isOpen={isChartBuilderOpen}
        onClose={() => {
          setIsChartBuilderOpen(false);
          setEditingChart(null);
        }}
        onSave={handleSaveChart}
        editingChart={editingChart}
        columns={columns}
        rows={rows}
      />

      <RowFormModal
        isOpen={isRowModalOpen}
        onClose={() => {
          setIsRowModalOpen(false);
          setEditingRow(null);
        }}
        onSave={handleSaveRow}
        editingRow={editingRow}
        columns={columns}
      />

      <GoogleSheetConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        syncConfig={syncConfig}
        activePageTitle={activePage.title}
        onConnectUrl={handleConnectUrl}
        onImportData={handleImportData}
        onImportCSV={handleImportCSV}
      />

      <AIInsightsModal
        isOpen={isAIInsightsOpen}
        onClose={() => setIsAIInsightsOpen(false)}
        title={activePage.title}
        rows={filteredData}
        columns={columns}
      />

      <ShareNetworkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        cloudSyncStatus={cloudSyncStatus}
        lastSyncedTime={lastSyncedTime}
        pages={pages}
        activePageId={activePage.id}
        onForceSaveToCloud={handleForceSaveToCloud}
        onForcePullFromCloud={handleForcePullFromCloud}
        onImportBackup={(importedPages, targetActiveId) => {
          setPages(importedPages);
          setActivePageId(targetActiveId);
          saveStateToServer(importedPages, targetActiveId);
          addToast('success', 'Cadangan Berhasil Dimuat', 'Semua data dan visualisasi grafik berhasil dipulihkan.');
        }}
      />

      {/* Toast Feedback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

    </div>
  );
}

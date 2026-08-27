import { DashboardPage } from '../types';

const DB_NAME = 'PetaSenadaDB';
const DB_VERSION = 1;
const STORE_NAME = 'dashboardStore';
const RECORD_KEY = 'master_dashboard_state';

export interface LocalStoredState {
  version: number;
  updatedAt: string;
  activePageId: string;
  pages: DashboardPage[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save state into IndexedDB and fallback to localStorage
 */
export async function saveLocalDashboardState(
  pages: DashboardPage[],
  activePageId: string,
  version?: number
): Promise<LocalStoredState> {
  const payload: LocalStoredState = {
    version: version || Date.now(),
    updatedAt: new Date().toISOString(),
    activePageId,
    pages,
  };

  // 1. Try writing to IndexedDB (unlimited storage for large datasets)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(payload, RECORD_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[STORAGE] IndexedDB save warning:', err);
  }

  // 2. Try writing to localStorage as fast sync backup (if quota allows)
  try {
    localStorage.setItem('peta_senada_pages_v2', JSON.stringify(pages));
    localStorage.setItem('peta_senada_active_page_v2', activePageId);
    localStorage.setItem('peta_senada_updated_at_v2', payload.updatedAt);
    localStorage.setItem('peta_senada_version_v2', String(payload.version));
  } catch (err) {
    console.warn('[STORAGE] localStorage save warning (quota exceeded or restricted):', err);
  }

  return payload;
}

/**
 * Load state from IndexedDB first, with fallback to localStorage
 */
export async function getLocalDashboardState(): Promise<LocalStoredState | null> {
  // 1. Try reading from IndexedDB
  try {
    const db = await openDB();
    const state = await new Promise<LocalStoredState | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (state && Array.isArray(state.pages) && state.pages.length > 0) {
      return state;
    }
  } catch (err) {
    console.warn('[STORAGE] IndexedDB read warning:', err);
  }

  // 2. Fallback to localStorage
  try {
    const saved = localStorage.getItem('peta_senada_pages_v2') || localStorage.getItem('peta_senada_pages');
    const savedActiveId = localStorage.getItem('peta_senada_active_page_v2') || localStorage.getItem('peta_senada_active_page') || 'page-1';
    const savedVersion = localStorage.getItem('peta_senada_version_v2');
    const savedUpdatedAt = localStorage.getItem('peta_senada_updated_at_v2');

    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          version: savedVersion ? parseInt(savedVersion, 10) : Date.now(),
          updatedAt: savedUpdatedAt || new Date().toISOString(),
          activePageId: savedActiveId,
          pages: parsed,
        };
      }
    }
  } catch (err) {
    console.warn('[STORAGE] localStorage read warning:', err);
  }

  return null;
}

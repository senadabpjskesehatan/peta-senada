import LZString from 'lz-string';
import { DashboardPage } from '../types';

export interface SerializedDashboardState {
  version: number;
  updatedAt: string;
  activePageId: string;
  pages: DashboardPage[];
}

/**
 * Encode full dashboard state into a compact URI string
 */
export function encodeDashboardState(pages: DashboardPage[], activePageId: string): string {
  try {
    const payload: SerializedDashboardState = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      activePageId,
      pages,
    };
    const json = JSON.stringify(payload);
    return LZString.compressToEncodedURIComponent(json);
  } catch (err) {
    console.error('Failed to encode dashboard state:', err);
    return '';
  }
}

/**
 * Decode dashboard state from encoded URI string
 */
export function decodeDashboardState(encodedString: string): SerializedDashboardState | null {
  try {
    if (!encodedString || typeof encodedString !== 'string') return null;
    const cleanStr = encodedString.trim();
    if (!cleanStr) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(cleanStr);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);
    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to decode dashboard state from string:', err);
  }
  return null;
}

/**
 * Generates a full shareable URL containing the complete dashboard state
 */
export function generateShareableUrl(pages: DashboardPage[], activePageId: string): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const encoded = encodeDashboardState(pages, activePageId);
  if (!encoded) return window.location.href;
  return `${baseUrl}#data=${encoded}`;
}

/**
 * Read state from current window location hash or query param if available
 */
export function getStateFromLocation(): SerializedDashboardState | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check hash #data=... or #d=...
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const match = hash.match(/(?:#|&)(?:data|d)=([^&]+)/);
      if (match && match[1]) {
        const decoded = decodeDashboardState(match[1]);
        if (decoded) return decoded;
      }
    }

    // 2. Check search query ?data=... or ?d=...
    const search = window.location.search;
    if (search && search.length > 1) {
      const params = new URLSearchParams(search);
      const dataParam = params.get('data') || params.get('d');
      if (dataParam) {
        const decoded = decodeDashboardState(dataParam);
        if (decoded) return decoded;
      }
    }
  } catch (e) {
    console.warn('Error reading state from location:', e);
  }
  return null;
}

/**
 * Export complete dashboard state as a downloadable .json / .senada backup file
 */
export function exportDashboardBackup(pages: DashboardPage[], activePageId: string, filename?: string) {
  try {
    const payload: SerializedDashboardState = {
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      activePageId,
      pages,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `peta-senada-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export dashboard backup:', err);
  }
}

/**
 * Parse uploaded JSON backup file
 */
export function readDashboardBackupFile(file: File): Promise<SerializedDashboardState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content) throw new Error('File kosong');
        const parsed = JSON.parse(content);
        if (!parsed || !Array.isArray(parsed.pages) || parsed.pages.length === 0) {
          throw new Error('Format file cadangan dashboard tidak valid.');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}

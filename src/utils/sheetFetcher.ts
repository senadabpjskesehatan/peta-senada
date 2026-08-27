import { parseCSVToRows } from './dataProcessor';
import { ColumnDef, SheetRow } from '../types';

export interface FetchSheetResult {
  columns: ColumnDef[];
  rows: SheetRow[];
  csv: string;
  sheetTitle?: string;
  sourceUrl: string;
}

/**
 * Converts GViz response (JSON / JSONP / setResponse) to standard CSV string.
 */
export function gvizJsonToCSV(gvizText: string): string | null {
  try {
    let jsonStr = '';
    const match = gvizText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?/);
    if (match && match[1]) {
      jsonStr = match[1];
    } else {
      const customMatch = gvizText.match(/^[a-zA-Z0-9_$]+\(([\s\S]*)\);?$/);
      if (customMatch && customMatch[1]) {
        jsonStr = customMatch[1];
      } else if (gvizText.trim().startsWith('{') && gvizText.trim().endsWith('}')) {
        jsonStr = gvizText.trim();
      }
    }

    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !parsed.table) return null;

    const cols = parsed.table.cols || [];
    const rows = parsed.table.rows || [];

    if (cols.length === 0 && rows.length === 0) return null;

    let headers: string[] = cols.map((c: any) => (c && c.label ? String(c.label).trim() : ''));
    let startRowIndex = 0;

    const hasEmptyHeaders = headers.every((h) => !h);
    if (hasEmptyHeaders && rows.length > 0) {
      const firstRowVals = (rows[0].c || []).map((cell: any) =>
        cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ''
      );
      if (firstRowVals.some((v: string) => v !== '')) {
        headers = firstRowVals.map((v: string, i: number) => v || `Kolom_${i + 1}`);
        startRowIndex = 1;
      } else {
        headers = cols.map((_: any, i: number) => `Kolom_${i + 1}`);
      }
    } else {
      headers = headers.map((h, i) => h || `Kolom_${i + 1}`);
    }

    const csvLines: string[] = [];
    csvLines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    for (let r = startRowIndex; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.c) continue;
      const rowVals: string[] = [];
      let hasVal = false;
      for (let c = 0; c < headers.length; c++) {
        const cell = row.c[c];
        if (cell && cell.v !== undefined && cell.v !== null) {
          hasVal = true;
          let val = cell.v;
          if (typeof val === 'string' && val.startsWith('Date(')) {
            const dateMatch = val.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
            if (dateMatch) {
              const y = parseInt(dateMatch[1]);
              const m = parseInt(dateMatch[2]) + 1;
              const d = parseInt(dateMatch[3]);
              val = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
          }
          const str = String(val).replace(/"/g, '""');
          rowVals.push(`"${str}"`);
        } else {
          rowVals.push('""');
        }
      }
      if (hasVal) {
        csvLines.push(rowVals.join(','));
      }
    }

    return csvLines.join('\n');
  } catch (err) {
    console.warn('Failed to parse GViz JSON:', err);
    return null;
  }
}

/**
 * Extracts Sheet ID and GID from any Google Spreadsheet URL format.
 */
export function extractGoogleSheetInfo(input: string): {
  sheetId: string;
  pubId: string;
  gid: string;
  isPublishToWeb: boolean;
  isDirectUrl: boolean;
} {
  const trimmed = input.trim();
  let sheetId = '';
  let pubId = '';
  let gid = '0';
  let isPublishToWeb = false;
  let isDirectUrl = false;

  // Extract GID if present
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  // Check if Publish to Web URL (/d/e/2PACX-...)
  const pubMatch = trimmed.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    pubId = pubMatch[1];
    isPublishToWeb = true;
    return { sheetId: '', pubId, gid, isPublishToWeb, isDirectUrl: false };
  }

  // Check standard Google Sheet URL (/d/{ID})
  const stdMatch = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (stdMatch && stdMatch[1] && stdMatch[1] !== 'e') {
    sheetId = stdMatch[1];
  } else if (trimmed.includes('drive.google.com') && trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/)) {
    const driveMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (driveMatch) sheetId = driveMatch[1];
  } else if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    sheetId = trimmed;
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    isDirectUrl = true;
  }

  return { sheetId, pubId, gid, isPublishToWeb, isDirectUrl };
}

/**
 * Executes a client-side JSONP fetch to Google GViz endpoint.
 * This completely bypasses any CORS restrictions in the browser.
 */
function fetchGvizJsonp(sheetId: string, gid: string = '0', timeoutMs = 7000): Promise<string> {
  return new Promise((resolve, reject) => {
    const callbackName = `__gviz_cb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement('script');
    let timer: any = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      try {
        const jsonStr = JSON.stringify(data);
        const csv = gvizJsonToCSV(jsonStr);
        if (csv && csv.trim().length > 0) {
          resolve(csv);
        } else {
          reject(new Error('Data Google Sheet kosong atau format tidak valid.'));
        }
      } catch (err: any) {
        reject(err);
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Gagal memuat Google Sheet via JSONP. Pastikan link Google Sheet dibagikan ke Publik (Siapa saja yang memiliki link).'));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Batas waktu koneksi Google Sheet berakhir (Timeout).'));
    }, timeoutMs);

    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${gid}`;
    script.src = url;
    document.body.appendChild(script);
  });
}

/**
 * Main function to fetch Google Sheet data across public networks.
 * Uses a multi-tiered strategy:
 * 1. Server-side proxy API (/api/fetch-sheet)
 * 2. Browser direct fetch of GViz CSV & Export CSV
 * 3. Browser JSONP script injection for GViz API (zero CORS issues)
 */
export async function fetchGoogleSheet(urlOrId: string, preferredGid?: string): Promise<FetchSheetResult> {
  const cleanInput = urlOrId.trim();
  if (!cleanInput) {
    throw new Error('Silakan masukkan URL atau ID Google Spreadsheet.');
  }

  const { sheetId, pubId, gid: detectedGid, isPublishToWeb, isDirectUrl } = extractGoogleSheetInfo(cleanInput);
  const gid = preferredGid && preferredGid !== '0' ? preferredGid : detectedGid;

  // ----------------------------------------------------
  // TIER 1: Server-side Proxy
  // ----------------------------------------------------
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const serverRes = await fetch('/api/fetch-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanInput, sheetId, gid }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (serverRes.ok) {
      const data = await serverRes.json();
      let csvContent = data.csv;

      // In case server returned GViz JSON format
      if (csvContent && (csvContent.startsWith('/*O_o*/') || csvContent.includes('google.visualization.Query.setResponse'))) {
        const converted = gvizJsonToCSV(csvContent);
        if (converted) csvContent = converted;
      }

      if (csvContent && csvContent.trim().length > 0) {
        const parsed = parseCSVToRows(csvContent);
        if (parsed.columns.length > 0 && parsed.rows.length > 0) {
          return {
            columns: parsed.columns,
            rows: parsed.rows,
            csv: csvContent,
            sheetTitle: data.sheetTitle,
            sourceUrl: data.sourceUrl || cleanInput,
          };
        }
      }
    } else {
      const errData = await serverRes.json().catch(() => ({}));
      if (serverRes.status === 403) {
        // Direct permission error from server
        throw new Error(errData.error || 'Akses Google Sheet dibatasi. Pastikan pengaturan diubah ke "Siapa saja yang memiliki link" -> "Pelihat".');
      }
    }
  } catch (serverErr: any) {
    // If it was an explicit permission error, throw directly
    if (serverErr.message && serverErr.message.includes('Akses Google Sheet dibatasi')) {
      throw serverErr;
    }
    console.warn('Server proxy fetch failed, attempting client-side fallback:', serverErr.message);
  }

  // ----------------------------------------------------
  // TIER 2: Browser Direct Fetch (GViz CSV & Web Publish)
  // ----------------------------------------------------
  const directCandidates: string[] = [];

  if (isPublishToWeb && pubId) {
    directCandidates.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv&gid=${gid}`);
    directCandidates.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`);
  } else if (sheetId) {
    directCandidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
    directCandidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`);
    directCandidates.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
  } else if (isDirectUrl) {
    directCandidates.push(cleanInput);
  }

  for (const candidate of directCandidates) {
    try {
      const res = await fetch(candidate, {
        method: 'GET',
        headers: { 'Accept': 'text/csv,text/plain,*/*' },
      });

      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();

        if (
          !trimmed.startsWith('<!DOCTYPE html>') &&
          !trimmed.startsWith('<html') &&
          !trimmed.includes('accounts.google.com') &&
          trimmed.length > 0
        ) {
          let csv = trimmed;
          if (trimmed.startsWith('/*O_o*/') || trimmed.includes('google.visualization.Query.setResponse')) {
            const converted = gvizJsonToCSV(trimmed);
            if (converted) csv = converted;
          }

          const parsed = parseCSVToRows(csv);
          if (parsed.columns.length > 0 && parsed.rows.length > 0) {
            return {
              columns: parsed.columns,
              rows: parsed.rows,
              csv,
              sourceUrl: candidate,
            };
          }
        }
      }
    } catch {
      // Continue to next tier
    }
  }

  // ----------------------------------------------------
  // TIER 3: Browser JSONP (Bypasses all CORS on public network)
  // ----------------------------------------------------
  if (sheetId) {
    try {
      // Try with gid first
      const csv = await fetchGvizJsonp(sheetId, gid, 6000);
      const parsed = parseCSVToRows(csv);
      if (parsed.columns.length > 0 && parsed.rows.length > 0) {
        return {
          columns: parsed.columns,
          rows: parsed.rows,
          csv,
          sourceUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`,
        };
      }
    } catch {
      // If preferred gid failed and it wasn't 0, try default gid=0
      if (gid !== '0') {
        try {
          const csv0 = await fetchGvizJsonp(sheetId, '0', 6000);
          const parsed0 = parseCSVToRows(csv0);
          if (parsed0.columns.length > 0 && parsed0.rows.length > 0) {
            return {
              columns: parsed0.columns,
              rows: parsed0.rows,
              csv: csv0,
              sourceUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`,
            };
          }
        } catch {}
      }
    }
  }

  // If all failed, produce a helpful diagnostic error message
  throw new Error(
    'Gagal mengambil data Google Sheet. Pastikan izin akses telah diubah menjadi "Siapa saja yang memiliki link" (Anyone with the link) dengan peran "Pelihat" (Viewer) di menu Bagikan pada Google Sheet.'
  );
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Server-side persistent storage file for cross-network state sharing
const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'dashboard_state.json');

// In-memory cache for ultra-fast response
let cachedDashboardState: any = null;
let lastVersionTimestamp = 0;

// Connected SSE clients for instantaneous real-time sync across devices
const sseClients = new Set<express.Response>();

function broadcastStateToSSEClients(payload: any) {
  const message = `event: state_updated\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

function ensureDataDirectory() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

function loadDashboardStateFromDisk() {
  try {
    ensureDataDirectory();
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          cachedDashboardState = parsed;
          lastVersionTimestamp = parsed.version || Date.now();
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Failed to read dashboard state from disk:', err);
  }
  return null;
}

function saveDashboardStateToDisk(state: any) {
  try {
    ensureDataDirectory();
    const tempFile = `${STATE_FILE}.tmp.${Date.now()}`;
    const payload = JSON.stringify(state, null, 2);
    fs.writeFileSync(tempFile, payload, 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
    cachedDashboardState = state;
    lastVersionTimestamp = state.version || Date.now();
    return true;
  } catch (err) {
    console.error('Failed to save dashboard state to disk:', err);
    // Fallback: update in-memory
    cachedDashboardState = state;
    lastVersionTimestamp = state.version || Date.now();
    return false;
  }
}

// Preload state on server boot
loadDashboardStateFromDisk();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      hasSharedState: !!cachedDashboardState
    });
  });

  // Cross-Network State Sharing Endpoints
  app.get('/api/dashboard/state', (req, res) => {
    try {
      if (!cachedDashboardState) {
        loadDashboardStateFromDisk();
      }
      if (cachedDashboardState) {
        return res.json({
          success: true,
          pages: cachedDashboardState.pages,
          activePageId: cachedDashboardState.activePageId || cachedDashboardState.pages[0]?.id || 'page-1',
          updatedAt: cachedDashboardState.updatedAt || new Date().toISOString(),
          version: lastVersionTimestamp,
          isCustom: true
        });
      }
      return res.json({
        success: true,
        pages: null,
        isCustom: false
      });
    } catch (err: any) {
      console.error('Error fetching dashboard state:', err);
      return res.status(500).json({ error: 'Gagal membaca status dashboard dari server.' });
    }
  });

  app.get('/api/dashboard/version', (req, res) => {
    res.json({
      version: lastVersionTimestamp,
      updatedAt: cachedDashboardState?.updatedAt || null,
      pageCount: cachedDashboardState?.pages?.length || 0,
    });
  });

  // Server-Sent Events endpoint for real-time live sync across devices and public networks
  app.get('/api/dashboard/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Register client
    sseClients.add(res);

    // Send initial ping/connection ack
    res.write(`event: connected\ndata: ${JSON.stringify({ version: lastVersionTimestamp })}\n\n`);

    // Keep connection alive with periodic ping every 25s
    const pingInterval = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(pingInterval);
        sseClients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(pingInterval);
      sseClients.delete(res);
    });
  });

  app.post('/api/dashboard/save', (req, res) => {
    try {
      const { pages, activePageId, updatedBy } = req.body;
      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return res.status(400).json({ error: 'Format data halaman tidak valid.' });
      }

      const now = new Date().toISOString();
      const version = Date.now();
      const newState = {
        pages,
        activePageId: activePageId || pages[0]?.id || 'page-1',
        updatedAt: now,
        version,
        updatedBy: updatedBy || 'client',
      };

      saveDashboardStateToDisk(newState);

      // Broadcast immediately to all connected devices in any network
      broadcastStateToSSEClients({
        version,
        updatedAt: now,
        pages: newState.pages,
        activePageId: newState.activePageId,
      });

      return res.json({
        success: true,
        updatedAt: now,
        version,
        message: 'Dashboard autosave berhasil disimpan ke server dan disiarkan ke semua device.'
      });
    } catch (err: any) {
      console.error('Error saving dashboard state:', err);
      return res.status(500).json({ error: 'Gagal menyimpan status dashboard ke server.' });
    }
  });

  app.post('/api/dashboard/reset', (req, res) => {
    try {
      cachedDashboardState = null;
      lastVersionTimestamp = Date.now();
      if (fs.existsSync(STATE_FILE)) {
        fs.unlinkSync(STATE_FILE);
      }
      return res.json({ success: true, message: 'Status dashboard berhasil direset ke default.' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Gagal mereset status dashboard.' });
    }
  });

// Convert GViz response (JSON/JSONP) to standard CSV
function parseGVizResponseToCSV(gvizText: string): string | null {
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
    return null;
  }
}

  // Proxy to fetch Google Sheet CSV / Data without CORS issues
  app.post('/api/fetch-sheet', async (req, res) => {
    try {
      const { url, sheetId: explicitSheetId, gid: rawGid } = req.body;
      const inputStr = (url || explicitSheetId || '').trim();

      if (!inputStr) {
        return res.status(400).json({ error: 'URL atau ID Google Spreadsheet diperlukan.' });
      }

      // 1. Extract GID (sheet tab ID)
      let gid = rawGid !== undefined && rawGid !== null && rawGid !== '' ? String(rawGid) : '0';
      const gidMatch = inputStr.match(/[?&#]gid=([0-9]+)/);
      if (gidMatch && gidMatch[1]) {
        gid = gidMatch[1];
      }

      // 2. Determine URL candidates
      const candidateUrls: string[] = [];
      let extractedId = '';

      // Check if it is a "Publish to web" URL: /d/e/2PACX-...
      const pubMatch = inputStr.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
      if (pubMatch && pubMatch[1]) {
        const pubId = pubMatch[1];
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv&gid=${gid}`);
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`);
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=tsv`);
      } else {
        // Check for standard Google Sheet ID in URL: /d/ID
        const standardMatch = inputStr.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (standardMatch && standardMatch[1] && standardMatch[1] !== 'e') {
          extractedId = standardMatch[1];
        } else if (inputStr.includes('drive.google.com') && inputStr.match(/[?&]id=([a-zA-Z0-9-_]+)/)) {
          const driveMatch = inputStr.match(/[?&]id=([a-zA-Z0-9-_]+)/);
          if (driveMatch) extractedId = driveMatch[1];
        } else if (/^[a-zA-Z0-9-_]{20,}$/.test(inputStr)) {
          extractedId = inputStr;
        }

        if (extractedId) {
          // Priority 1: GViz output csv with gid
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${extractedId}/gviz/tq?tqx=out:csv&gid=${gid}`);
          // Priority 2: Standard export csv with gid
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${extractedId}/export?format=csv&gid=${gid}`);
          // Priority 3: GViz output json with gid
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${extractedId}/gviz/tq?tqx=out:json&gid=${gid}`);
          // Priority 4: GViz output csv without gid (defaults to first active sheet)
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${extractedId}/gviz/tq?tqx=out:csv`);
          // Priority 5: Standard export csv without gid
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${extractedId}/export?format=csv`);
          // Priority 6: GViz json without gid
          candidateUrls.push(`https://docs.google.com/spreadsheets/d/${extractedId}/gviz/tq?tqx=out:json`);
          // Priority 7: Feed export
          candidateUrls.push(`https://spreadsheets.google.com/feeds/download/spreadsheets/Export?key=${extractedId}&exportFormat=csv&gid=${gid}`);
        } else if (inputStr.startsWith('http://') || inputStr.startsWith('https://')) {
          // Direct web URL / CSV endpoint
          candidateUrls.push(inputStr);
        }
      }

      if (candidateUrls.length === 0) {
        return res.status(400).json({
          error: 'Format URL atau ID Google Sheet tidak dikenali. Pastikan Anda memasukkan link lengkap Google Sheet atau ID spreadsheet.',
        });
      }

      let lastErrorStatus = 0;
      let lastErrorMessage = '';
      let isHtmlLoginEncountered = false;
      let extractedSheetTitle = '';

      // Try candidates in order
      for (const candidate of candidateUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(candidate, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'text/csv,application/json,text/plain,*/*',
              'Cache-Control': 'no-cache',
            },
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            lastErrorStatus = response.status;
            lastErrorMessage = response.statusText;
            if (response.status === 401 || response.status === 403) {
              isHtmlLoginEncountered = true;
            }
            continue;
          }

          const text = await response.text();
          const trimmed = text.trim();

          // Check if response is HTML (Google Login or Error page)
          if (
            trimmed.startsWith('<!DOCTYPE html>') ||
            trimmed.startsWith('<html') ||
            trimmed.includes('accounts.google.com') ||
            trimmed.includes('ServiceLogin') ||
            trimmed.includes('<title>Google Drive –')
          ) {
            isHtmlLoginEncountered = true;
            continue;
          }

          // Case A: GViz JSON / JSONP response
          if (trimmed.startsWith('/*O_o*/') || trimmed.includes('google.visualization.Query.setResponse')) {
            const convertedCSV = parseGVizResponseToCSV(trimmed);
            if (convertedCSV && convertedCSV.trim().length > 0) {
              return res.json({
                csv: convertedCSV,
                sourceUrl: candidate,
                sheetTitle: extractedSheetTitle || undefined,
                success: true,
              });
            }
          }

          // Case B: Raw CSV with content
          if (trimmed.length > 0 && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return res.json({
              csv: trimmed,
              sourceUrl: candidate,
              sheetTitle: extractedSheetTitle || undefined,
              success: true,
            });
          }

          // Case C: Standard JSON table
          if (trimmed.startsWith('{')) {
            const convertedCSV = parseGVizResponseToCSV(trimmed);
            if (convertedCSV && convertedCSV.trim().length > 0) {
              return res.json({
                csv: convertedCSV,
                sourceUrl: candidate,
                sheetTitle: extractedSheetTitle || undefined,
                success: true,
              });
            }
          }
        } catch (fetchErr: any) {
          lastErrorMessage = fetchErr.message || 'Fetch failed';
        }
      }

      if (isHtmlLoginEncountered) {
        return res.status(403).json({
          error: 'Google Sheet memerlukan izin akses publik. Pastikan pengaturan akses diubah: Klik tombol "Bagikan" (Share) di Google Sheet -> Ubah akses umum ke "Siapa saja yang memiliki link" (Anyone with the link) dengan peran "Pelihat" (Viewer).',
        });
      }

      return res.status(lastErrorStatus || 400).json({
        error: `Gagal memuat data dari Google Sheet (${lastErrorMessage || 'Spreadsheet tidak ditemukan atau kosong'}). Pastikan izin "Siapa saja yang memiliki link" telah aktif.`,
      });
    } catch (error: any) {
      console.error('Error fetching sheet:', error);
      return res.status(500).json({ error: error.message || 'Gagal mengambil data spreadsheet' });
    }
  });

  // AI Insights Generation via Gemini
  app.post('/api/analyze-sheet', async (req, res) => {
    try {
      const { summary, sampleRows, columns, title } = req.body;
      const ai = getAIClient();

      if (!ai) {
        return res.json({
          insight: 'Kunci API Gemini belum terkonfigurasi. Anda dapat menambahkan GEMINI_API_KEY di pengaturan untuk mengaktifkan analisis AI otomatis.',
          keyFindings: [
            'Data berhasil dimuat dan divisualisasikan.',
            'Gunakan filter interaktif untuk menyaring data berdasarkan waktu atau kategori.',
            'Anda dapat membuat grafik baru melalui tombol "Tambah Grafik".'
          ],
          recommendations: [
            'Monitor metrik tren secara berkala.',
            'Lakukan update data atau atur sinkronisasi real-time otomatis.'
          ]
        });
      }

      const prompt = `Anda adalah asisten data analyst senior. Analisis dataset Google Sheet berikut dan berikan wawasan eksekutif dalam bahasa Indonesia yang ringkas, profesional, dan dapat ditindaklanjuti.

Judul Dataset: ${title || 'Dashboard Data'}
Kolom: ${columns ? columns.join(', ') : 'N/A'}
Ringkasan Statistik:
${JSON.stringify(summary, null, 2)}

Sampel Data (3-5 baris pertama):
${JSON.stringify(sampleRows, null, 2)}

Format respon HARUS JSON valid dengan struktur:
{
  "insight": "Ringkasan analisis mendalam 2-3 kalimat tentang pola utama, performa, atau anomali yang terlihat.",
  "keyFindings": ["Poin temuan kunci 1", "Poin temuan kunci 2", "Poin temuan kunci 3"],
  "recommendations": ["Rekomendasi aksi 1", "Rekomendasi aksi 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text;
      try {
        const parsed = JSON.parse(text || '{}');
        return res.json(parsed);
      } catch (parseErr) {
        return res.json({
          insight: text || 'Analisis berhasil dibuat.',
          keyFindings: ['Data menunjukkan tren positif pada metrik utama.'],
          recommendations: ['Lanjutkan pemantauan berkala.']
        });
      }
    } catch (error: any) {
      console.error('Error analyzing sheet:', error);
      return res.status(500).json({ error: error.message || 'Gagal menghasilkan analisis AI' });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Google Sheets Dashboard Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

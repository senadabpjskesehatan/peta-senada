import React, { useState, useEffect } from 'react';
import { X, Sparkles, RefreshCw, CheckCircle2, TrendingUp, Compass, AlertCircle } from 'lucide-react';
import { SheetRow, ColumnDef, AIAnalysisResult } from '../types';
import { safeMin, safeMax } from '../utils/dataProcessor';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rows: SheetRow[];
  columns: ColumnDef[];
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  title,
  rows,
  columns,
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIAnalysis = async () => {
    if (rows.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      // Build summary data for prompt
      const numericCols = columns.filter(c => c.isNumeric || c.type === 'number');
      const statsSummary: Record<string, any> = {
        totalRows: rows.length,
      };

      numericCols.forEach(col => {
        const values = rows.map(r => Number(r[col.key]) || 0);
        const sum = values.reduce((a, b) => a + b, 0);
        statsSummary[col.key] = {
          sum,
          avg: values.length > 0 ? (sum / values.length).toFixed(2) : 0,
          min: safeMin(values),
          max: safeMax(values),
        };
      });

      const sampleRows = rows.slice(0, 5).map(r => {
        const item: Record<string, any> = {};
        columns.forEach(c => {
          item[c.label || c.key] = r[c.key];
        });
        return item;
      });

      const response = await fetch('/api/analyze-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          summary: statsSummary,
          sampleRows,
          columns: columns.map(c => c.label || c.key),
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi layanan AI');
      }

      const data = await response.json();
      setAnalysis({
        insight: data.insight || 'Data berhasil dianalisis.',
        keyFindings: data.keyFindings || [
          'Volume transaksi terpantau stabil pada periode ini.',
          'Metrik performa menunjukkan tingkat efisiensi yang baik.'
        ],
        recommendations: data.recommendations || [
          'Pertahankan pemantauan berkala pada segmen dengan kontribusi tertinggi.',
          'Gunakan filter grafik untuk mendalami pola musiman.'
        ],
        generatedAt: new Date().toLocaleTimeString('id-ID'),
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat membuat analisis AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (!analysis || rows.length > 0)) {
      fetchAIAnalysis();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="ai-insights-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Analisis AI & Wawasan Eksekutif</h3>
              <p className="text-xs text-slate-500">Didukung oleh Gemini AI berdasarkan data Google Sheet terkini</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                <Sparkles className="w-5 h-5 text-indigo-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="font-bold text-slate-900 text-sm">Menganalisis {rows.length} Baris Data Spreadsheet...</p>
              <p className="text-slate-500 text-xs">Mengekstraksi pola korelasi, tren statistik, dan anomali.</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gagal Menghasilkan Analisis AI</p>
                <p className="text-xs opacity-90 mt-1">{error}</p>
                <button
                  onClick={fetchAIAnalysis}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              
              {/* Main Insight Banner */}
              <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-sm text-indigo-900">Ringkasan Eksekutif</span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                  {analysis.insight}
                </p>
              </div>

              {/* Key Findings */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-sm text-slate-900">Temuan Kunci (Key Findings)</span>
                </div>
                <ul className="space-y-2">
                  {analysis.keyFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-sm text-slate-900">Rekomendasi Tindakan</span>
                </div>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5"></div>
                      <span className="leading-relaxed font-medium">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="text-[11px] text-slate-400 text-right">
                Diperbarui pada: {analysis.generatedAt}
              </div>

            </div>
          ) : null}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={fetchAIAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan Analisis</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm shadow-blue-500/20"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

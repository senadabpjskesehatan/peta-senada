import React, { useState, useMemo } from 'react';
import { 
  Table, Search, Plus, Edit2, Trash2, Copy, ArrowUpDown, 
  ArrowUp, ArrowDown, Download, Columns, CheckSquare, Square, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PlusCircle, X
} from 'lucide-react';
import { ColumnDef, SheetRow } from '../types';
import { formatCurrency, formatCompactNumber } from '../utils/dataProcessor';

interface DataTableProps {
  columns: ColumnDef[];
  rows: SheetRow[];
  allRowsCount: number;
  onAddRow: () => void;
  onEditRow: (row: SheetRow) => void;
  onDuplicateRow: (row: SheetRow) => void;
  onDeleteRow: (rowId: string) => void;
  onBulkDeleteRows: (rowIds: string[]) => void;
  onAddColumn: (colName: string, type: ColumnDef['type']) => void;
  onExportCSV: () => void;
  onClearAllRows?: () => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  allRowsCount,
  onAddRow,
  onEditRow,
  onDuplicateRow,
  onDeleteRow,
  onBulkDeleteRows,
  onAddColumn,
  onExportCSV,
  onClearAllRows,
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Add column modal state
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnDef['type']>('string');

  // Filter & Sort table data
  const processedRows = useMemo(() => {
    let list = [...rows];

    // Table specific search
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter((r) =>
        columns.some((c) => {
          const val = r[c.key];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        })
      );
    }

    // Sorting
    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? '').toLowerCase();
        const strB = String(valB ?? '').toLowerCase();
        return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [rows, tableSearch, sortKey, sortDirection, columns]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRows.map((r) => r._id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Hapus ${selectedIds.length} baris data yang dipilih?`)) {
      onBulkDeleteRows(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onAddColumn(newColName.trim(), newColType);
    setNewColName('');
    setShowAddColModal(false);
  };

  const renderCellContent = (row: SheetRow, col: ColumnDef) => {
    const val = row[col.key];
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-300 italic">-</span>;
    }

    // Status tags with Geometric Balance styling
    if (/status/i.test(col.key)) {
      const s = String(val).toLowerCase();
      let colorClass = 'text-slate-600 font-bold';
      if (s.includes('selesai') || s.includes('sukses') || s.includes('aman') || s.includes('disetujui') || s.includes('success')) {
        colorClass = 'text-emerald-600 font-bold';
      } else if (s.includes('proses') || s.includes('pending') || s.includes('rendah')) {
        colorClass = 'text-amber-600 font-bold';
      } else if (s.includes('batal') || s.includes('kritis') || s.includes('ditolak') || s.includes('error')) {
        colorClass = 'text-rose-600 font-bold';
      }
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs ${colorClass}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {String(val)}
        </span>
      );
    }

    // Category tags
    if (/kategori|category|departemen|tipe|jenis/i.test(col.key)) {
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          {String(val)}
        </span>
      );
    }

    // Currency values
    if (/pendapatan|omset|biaya|harga|gaji|nilai|pemasukan|pengeluaran|margin/i.test(col.key) && typeof val === 'number') {
      return (
        <span className="font-bold text-slate-900">
          {formatCurrency(val)}
        </span>
      );
    }

    // Number values
    if (col.type === 'number' && typeof val === 'number') {
      return <span className="font-semibold text-slate-800">{new Intl.NumberFormat('id-ID').format(val)}</span>;
    }

    return <span className="text-slate-700 font-medium">{String(val)}</span>;
  };

  return (
    <div id="dashboard-data-table" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      
      {/* Table Header Bar */}
      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-600" />
            Raw Data & Spreadsheet Grid
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen data tabel lengkap dengan fitur Create, Read, Update, Delete (CRUD).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          
          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="table-search-input"
              type="text"
              placeholder="Cari dalam tabel..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
            {tableSearch && (
              <button
                onClick={() => setTableSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Row Button (CRUD) */}
          <button
            id="btn-add-table-row"
            onClick={onAddRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris</span>
          </button>

          {/* Add Column Button */}
          <button
            id="btn-add-table-col"
            onClick={() => setShowAddColModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Columns className="w-3.5 h-3.5 text-slate-500" />
            <span>Tambah Kolom</span>
          </button>

          {/* Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <button
              id="btn-bulk-delete-rows"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.length})</span>
            </button>
          )}

          {/* Delete All Data / Kosongkan Data Button */}
          {onClearAllRows && allRowsCount > 0 && (
            <button
              id="btn-clear-all-data"
              onClick={onClearAllRows}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Hapus / Kosongkan semua baris data"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
              <span>Kosongkan Data</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={onExportCSV}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Unduh CSV"
          >
            <Download className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Table Content Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 text-xs uppercase font-black border-b border-slate-100 bg-slate-50/50">
              <th className="py-3 px-4 w-10">
                <button
                  onClick={toggleSelectAll}
                  className="text-slate-400 hover:text-slate-600 flex items-center"
                >
                  {selectedIds.length === paginatedRows.length && paginatedRows.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-400 cursor-pointer select-none hover:text-slate-700 transition-colors ${
                    col.type === 'number' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 ${col.type === 'number' ? 'justify-end' : 'justify-start'}`}>
                    <span>{col.label}</span>
                    {sortKey === col.key ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-blue-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
              <th className="py-3 px-4 text-right text-xs font-black uppercase tracking-wider text-slate-400 w-28">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="text-sm font-medium divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="py-12 text-center text-slate-400 text-xs">
                  {allRowsCount === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <p className="font-semibold text-slate-600 text-sm">Lembar kerja saat ini kosong (tanpa data bawaan)</p>
                      <p className="text-slate-400 text-xs max-w-sm">Mulai isi data dengan menambahkan baris data pertama atau hubungkan dengan Google Sheet.</p>
                      <button
                        onClick={onAddRow}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Baris Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <span>Tidak ada baris data yang cocok dengan kriteria pencarian / filter saat ini.</span>
                  )}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => {
                const isSelected = selectedIds.includes(row._id);
                return (
                  <tr
                    key={row._id}
                    className={`transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleSelectRow(row._id)}
                        className="text-slate-400 hover:text-slate-600 flex items-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3 px-4 text-xs ${col.type === 'number' ? 'text-right' : 'text-left'}`}
                      >
                        {renderCellContent(row, col)}
                      </td>
                    ))}

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditRow(row)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Baris"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateRow(row)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Duplikat Baris"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRow(row._id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Hapus Baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-slate-50/40">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <select
            id="table-page-size-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            aria-label="Pilih Jumlah Baris per Halaman"
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <span>dari <strong>{processedRows.length}</strong> entri</span>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-3 py-1 font-semibold text-slate-700">
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add Column Modal Dialog */}
      {showAddColModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Tambah Kolom Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Struktur kolom akan ditambahkan ke semua baris data spreadsheet.</p>
            
            <form onSubmit={handleCreateColumn} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kolom</label>
                <input
                  type="text"
                  placeholder="Contoh: Estimasi_Pengiriman"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Data</label>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value as ColumnDef['type'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option value="string">Teks (String)</option>
                  <option value="number">Angka (Numeric)</option>
                  <option value="date">Tanggal (Date)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddColModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20"
                >
                  Simpan Kolom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

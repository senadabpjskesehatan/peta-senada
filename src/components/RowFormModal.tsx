import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Database } from 'lucide-react';
import { ColumnDef, SheetRow } from '../types';

interface RowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: SheetRow) => void;
  editingRow: SheetRow | null;
  columns: ColumnDef[];
}

export const RowFormModal: React.FC<RowFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRow,
  columns,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (editingRow) {
      setFormData({ ...editingRow });
    } else {
      const initial: Record<string, any> = {};
      columns.forEach((col) => {
        if (col.type === 'number') {
          initial[col.key] = 0;
        } else if (col.type === 'date') {
          initial[col.key] = new Date().toISOString().split('T')[0];
        } else {
          initial[col.key] = '';
        }
      });
      setFormData(initial);
    }
  }, [editingRow, isOpen, columns]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any, type: ColumnDef['type']) => {
    if (type === 'number') {
      const num = Number(value);
      setFormData((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rowToSave: SheetRow = {
      ...formData,
      _id: editingRow ? editingRow._id : `row-${Date.now()}`,
    };
    onSave(rowToSave);
    onClose();
  };

  return (
    <div id="row-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {editingRow ? 'Edit Baris Data' : 'Tambah Baris Data Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                {editingRow ? `Memodifikasi entri ID: ${editingRow._id}` : 'Masukkan data baru ke spreadsheet'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {columns.map((col) => {
              const val = formData[col.key] ?? '';
              const isDate = col.type === 'date' || /tanggal|date|waktu/i.test(col.key);
              const isNumber = col.isNumeric || col.type === 'number';

              return (
                <div key={col.key} className={col.label.length > 20 ? 'sm:col-span-2' : ''}>
                  <label className="block text-slate-700 font-bold mb-1">
                    {col.label} {isNumber && <span className="text-slate-400 font-normal">(Angka)</span>}
                  </label>

                  {isDate ? (
                    <input
                      type="date"
                      value={val}
                      onChange={(e) => handleChange(col.key, e.target.value, 'date')}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                    />
                  ) : isNumber ? (
                    <input
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => handleChange(col.key, e.target.value, 'number')}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                    />
                  ) : (
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleChange(col.key, e.target.value, 'string')}
                      placeholder={`Masukkan ${col.label}...`}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-slate-900 focus:outline-none font-medium"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-105"
            >
              <Save className="w-4 h-4" />
              <span>{editingRow ? 'Simpan Perubahan' : 'Tambahkan Data'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

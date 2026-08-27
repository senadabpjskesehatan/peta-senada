import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, X, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanUser === 'senada' && cleanPass === '150bisa') {
      onLoginSuccess();
      setUsername('');
      setPassword('');
      onClose();
    } else {
      setErrorMsg('Username atau password salah. Silakan coba lagi.');
    }
  };

  const handleQuickFill = () => {
    setUsername('senada');
    setPassword('150bisa');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-300" />
          </div>

          <h2 className="text-xl font-extrabold tracking-tight">Login User Admin</h2>
          <p className="text-xs text-blue-100/90 mt-1 font-medium">
            Masuk sebagai Admin untuk mengedit data, menghubungkan Google Sheet, dan mengelola halaman dashboard.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Preset Helper Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 flex items-start justify-between gap-3">
            <div className="text-xs space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-blue-600 dark:text-blue-400 tracking-wider block">
                Kredensial Admin Resmi
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                User: <strong className="text-slate-900 dark:text-white">senada</strong> | Pass: <strong className="text-slate-900 dark:text-white">150bisa</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
            >
              Isi Otomatis
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Username Admin
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username (senada)"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password Admin
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password (150bisa)"
                required
                className="w-full pl-10 pr-12 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Masuk Mode Admin</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get('token')?.trim() || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (token) window.history.replaceState(null, '', '/reset-password');
  }, [token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('Tautan reset password tidak valid. Minta tautan baru.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password tidak sama');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.responseMessage || 'Tautan tidak valid atau sudah kedaluwarsa.');
        return;
      }

      setIsComplete(true);
    } catch {
      setError('Terjadi kesalahan. Periksa koneksi dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md px-6">
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00d4aa]/20">
        </div>
        <h1 className="text-3xl font-bold text-[#16332f] mb-2">Buat Password Baru</h1>
        <p className="text-zinc-500">Gunakan minimal 8 karakter untuk melindungi akun Anda</p>
      </div>

      {isComplete ? (
        <div className="rounded-2xl border border-[#00d4aa]/30 bg-white/70 p-6 text-center shadow-sm">
          <h2 className="font-semibold text-[#16332f]">Password berhasil diperbarui</h2>
          <p className="mt-2 text-sm text-zinc-500">Silakan masuk menggunakan password baru Anda.</p>
          <Link href="/login" className="mt-6 inline-block font-medium text-[#00a88a] hover:underline">
            Masuk sekarang
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-500 text-center">{error}</p>
            </div>
          )}

          {!token ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-6 text-center">
              <p className="text-sm leading-6 text-amber-800">Tautan reset password tidak valid atau tidak lengkap.</p>
              <Link href="/forgot-password" className="mt-4 inline-block font-medium text-[#00a88a] hover:underline">
                Minta tautan baru
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2" htmlFor="password">Password baru</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                  className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
                  placeholder="Minimal 8 karakter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2" htmlFor="confirm-password">Konfirmasi password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
                  placeholder="Ulangi password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl gradient-accent text-black font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition-all hover-scale"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f3faf8] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#00d4aa]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#00d4aa]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <Suspense fallback={<div className="w-12 h-12 rounded-full border-2 border-[#00d4aa] border-t-transparent animate-spin" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

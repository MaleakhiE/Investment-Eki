'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.responseMessage || 'Permintaan tidak dapat diproses. Coba lagi nanti.');
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError('Terjadi kesalahan. Periksa koneksi dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f3faf8] flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#00d4aa]/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00d4aa]/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00d4aa]/20">
            <span className="text-4xl">✉️</span>
          </div>
          <h1 className="text-3xl font-bold text-[#16332f] mb-2">Lupa Password</h1>
          <p className="text-zinc-500">Kami akan mengirimkan tautan untuk membuat password baru</p>
        </div>

        {isSubmitted ? (
          <div className="rounded-2xl border border-[#00d4aa]/30 bg-white/70 p-6 text-center shadow-sm">
            <h2 className="font-semibold text-[#16332f]">Periksa email Anda</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Jika akun dengan email tersebut terdaftar, tautan reset password akan segera dikirim.
            </p>
            <Link href="/login" className="mt-6 inline-block font-medium text-[#00a88a] hover:underline">
              Kembali ke halaman masuk
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500 text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
                  placeholder="nama@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl gradient-accent text-black font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition-all hover-scale"
              >
                {isLoading ? 'Mengirim...' : 'Kirim Tautan Reset'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="font-medium text-[#00a88a] hover:underline">
                Kembali ke halaman masuk
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

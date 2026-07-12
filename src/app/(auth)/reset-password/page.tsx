'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';

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
      setError('This reset link is invalid. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
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
        setError(data.responseMessage || 'This link is invalid or has expired.');
        return;
      }

      setIsComplete(true);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>

      {isComplete ? (
        <div className="rounded-2xl border border-[#00d4aa]/30 bg-white/70 p-6 text-center shadow-sm">
          <h2 className="font-semibold text-[#16332f]">Password updated</h2>
          <p className="mt-2 text-sm text-zinc-500">Sign in using your new password.</p>
          <Link href="/login" className="mt-6 inline-block font-medium text-[#00a88a] hover:underline">
            Sign in now
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
              <p className="text-sm leading-6 text-amber-800">This reset link is invalid or incomplete.</p>
              <Link href="/forgot-password" className="mt-4 inline-block font-medium text-[#00a88a] hover:underline">
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2" htmlFor="password">New password</label>
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
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2" htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
                  placeholder="Repeat password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl gradient-accent text-black font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition-all hover-scale"
              >
                {isLoading ? 'Saving...' : 'Save new password'}
              </button>
            </form>
          )}
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Create a new password" description="Use at least 8 characters to protect your account.">
      <Suspense fallback={<div className="w-12 h-12 rounded-full border-2 border-[#00d4aa] border-t-transparent animate-spin" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

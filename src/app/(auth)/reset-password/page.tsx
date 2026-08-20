'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { validatePassword } from '@/lib/validation';

function ResetPasswordForm() {
  const router = useRouter();
  const { showFeedback } = useFeedback();
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get('token')?.trim() || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
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
        void showFeedback({
          tone: 'error',
          title: 'Password not updated',
          message: data.responseMessage || 'This reset link is invalid or has expired.',
          primaryLabel: 'Review request',
        });
        return;
      }

      await showFeedback({
        tone: 'success',
        title: 'Password updated',
        message: 'Your new password is active and previous sessions have been signed out.',
        primaryLabel: 'Sign in now',
      });
      router.push('/login');
    } catch {
      void showFeedback({
        tone: 'error',
        title: 'Connection problem',
        message: 'Something went wrong. Check your connection and try again.',
        primaryLabel: 'Try again',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div role="alert" aria-live="assertive" className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
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

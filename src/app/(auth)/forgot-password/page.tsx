'use client';

import Link from 'next/link';
import { useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';

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
        setError(data.responseMessage || 'Your request could not be processed. Try again later.');
        return;
      }

      setIsSubmitted(true);
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" description="We will send a secure link to create a new password.">

        {isSubmitted ? (
          <div className="rounded-2xl border border-[#00d4aa]/30 bg-white/70 p-6 text-center shadow-sm">
            <h2 className="font-semibold text-[#16332f]">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              If an account exists for that email, a password reset link will be sent shortly.
            </p>
            <Link href="/login" className="mt-6 inline-block font-medium text-[#00a88a] hover:underline">
              Back to sign in
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
                  placeholder="name@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl gradient-accent text-black font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition-all hover-scale"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="font-medium text-[#00a88a] hover:underline">
                Back to sign in
              </Link>
            </div>
          </>
        )}
    </AuthShell>
  );
}

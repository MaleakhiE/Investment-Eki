'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/auth/AuthShell';
import { useFeedback } from '@/components/providers/FeedbackProvider';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showFeedback } = useFeedback();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        void showFeedback({
          tone: 'error',
          title: 'Request not completed',
          message: data.responseMessage || 'Your request could not be processed. Try again later.',
          primaryLabel: 'Try again',
        });
        return;
      }

      await showFeedback({
        tone: 'success',
        title: 'Check your email',
        message: 'If an account exists for that email, a secure password reset link will be sent shortly.',
        primaryLabel: 'Back to sign in',
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
    <AuthShell title="Forgot your password?" description="We will send a secure link to create a new password.">

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
    </AuthShell>
  );
}

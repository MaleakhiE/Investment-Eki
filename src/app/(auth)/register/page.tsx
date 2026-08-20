'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import FormError from '@/components/ui/FormError';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { validatePassword } from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const { showFeedback } = useFeedback();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        void showFeedback({
          tone: 'error',
          title: 'Account not created',
          message: data.responseMessage || 'FinTrack could not create the account. Review your details and try again.',
          primaryLabel: 'Review details',
        });
        return;
      }

      await showFeedback({
        tone: 'success',
        title: 'Registration successful',
        message: 'Your FinTrack account has been created. You can now sign in securely.',
        primaryLabel: 'Continue to sign in',
      });
      router.push('/login');
    } catch {
      void showFeedback({
        tone: 'error',
        title: 'Connection problem',
        message: 'FinTrack could not complete registration. Check your connection and try again.',
        primaryLabel: 'Try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" description="Start building a clearer financial future.">

        {/* Error */}
        {error && (
          <FormError>
            <p className="text-sm text-red-400 text-center">{error}</p>
          </FormError>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
              placeholder="name@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
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
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                Creating account...
              </span>
            ) : 'Create account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00d4aa] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
    </AuthShell>
  );
}

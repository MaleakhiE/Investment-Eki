'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Incorrect email or password');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
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
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-400">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-[#00a88a] hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8] text-[#16332f] placeholder-zinc-600 focus:border-[#00d4aa] focus:ring-2 focus:ring-[#00d4aa]/20 transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 rounded-2xl gradient-accent text-black font-semibold text-lg hover:opacity-90 disabled:opacity-50 transition-all hover-scale"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              Signing in...
            </span>
          ) : 'Sign in'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-zinc-500">
          New to FinTrack?{' '}
          <Link href="/register" className="text-[#00d4aa] hover:underline font-medium">
            Create account
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" description="Sign in to review your finances and keep moving toward your goals.">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-[#00d4aa] border-t-transparent animate-spin"></div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { useFeedback } from '@/components/providers/FeedbackProvider';

function LoginForm() {
  const router = useRouter();
  const { showFeedback } = useFeedback();
  const searchParams = useSearchParams();
  const requestedCallbackUrl = searchParams.get('callbackUrl');
  const oauthError = searchParams.get('error');
  const callbackUrl = requestedCallbackUrl?.startsWith('/') && !requestedCallbackUrl.startsWith('//')
    ? requestedCallbackUrl
    : '/dashboard';
  const displayedOAuthError = useRef<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!oauthError || displayedOAuthError.current === oauthError) return;
    displayedOAuthError.current = oauthError;
    void showFeedback({
      tone: 'error',
      title: 'Google sign-in was not completed',
      message: 'Please try Google sign-in again or continue with your email and password.',
      primaryLabel: 'Try again',
    });
  }, [oauthError, showFeedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        void showFeedback({
          tone: 'error',
          title: 'Unable to sign in',
          message: 'The email or password is incorrect. Check your details and try again.',
          primaryLabel: 'Try again',
        });
      } else {
        await showFeedback({
          tone: 'success',
          title: 'Login successful',
          message: 'Your account is ready. Continue to review your financial dashboard.',
          primaryLabel: 'Open dashboard',
        });
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      void showFeedback({
        tone: 'error',
        title: 'Connection problem',
        message: 'FinTrack could not complete the login. Check your connection and try again.',
        primaryLabel: 'Try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>

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

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#dcece8]" />
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">or</span>
        <span className="h-px flex-1 bg-[#dcece8]" />
      </div>

      <GoogleSignInButton callbackUrl={callbackUrl} />

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

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useFeedback } from '@/components/providers/FeedbackProvider';

export default function GoogleSignInButton({ callbackUrl }: { callbackUrl: string }) {
  const { showFeedback } = useFeedback();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { redirectTo: callbackUrl });
    } catch {
      void showFeedback({
        tone: 'error',
        title: 'Google sign-in unavailable',
        message: 'FinTrack could not start Google sign-in. Please try again or use your email and password.',
        primaryLabel: 'Try again',
      });
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={() => void handleSignIn()}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#dcece8] bg-white px-6 py-4 text-base font-semibold text-[#16332f] transition-all hover:border-[#9fcfc4] hover:bg-[#f5fbf9] disabled:cursor-wait disabled:opacity-60"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" focusable="false">
        <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.39 13.87A6 6 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.49l3.35-2.62Z" />
        <path fill="#EA4335" d="M12 6c1.47 0 2.79.51 3.82 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.62C7.18 7.76 9.39 6 12 6Z" />
      </svg>
      {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
    </button>
  );
}

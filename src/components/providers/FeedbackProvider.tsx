'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import FeedbackModal, { type FeedbackNotice, type FeedbackTone } from '@/components/ui/FeedbackModal';

type FeedbackRequest = FeedbackNotice;

interface ConfirmationRequest {
  title: string;
  message: string;
  tone?: FeedbackTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ActiveFeedback extends FeedbackNotice {
  secondaryLabel?: string;
}

interface FeedbackContextValue {
  showFeedback: (request: FeedbackRequest) => Promise<void>;
  confirmAction: (request: ConfirmationRequest) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export default function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [activeFeedback, setActiveFeedback] = useState<ActiveFeedback | null>(null);
  const activeResolver = useRef<((confirmed: boolean) => void) | null>(null);

  const settleFeedback = useCallback((confirmed: boolean) => {
    activeResolver.current?.(confirmed);
    activeResolver.current = null;
    setActiveFeedback(null);
  }, []);

  const showFeedback = useCallback((request: FeedbackRequest) => {
    activeResolver.current?.(false);
    return new Promise<void>((resolve) => {
      activeResolver.current = () => resolve();
      setActiveFeedback({
        ...request,
        primaryLabel: request.autoCloseMs ? undefined : request.primaryLabel ?? 'Close',
      });
    });
  }, []);

  const confirmAction = useCallback((request: ConfirmationRequest) => {
    activeResolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      activeResolver.current = resolve;
      setActiveFeedback({
        tone: request.tone ?? 'error',
        title: request.title,
        message: request.message,
        primaryLabel: request.confirmLabel ?? 'Confirm',
        secondaryLabel: request.cancelLabel ?? 'Cancel',
      });
    });
  }, []);

  const value = useMemo(() => ({ showFeedback, confirmAction }), [confirmAction, showFeedback]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackModal
        open={activeFeedback !== null}
        tone={activeFeedback?.tone}
        title={activeFeedback?.title ?? ''}
        message={activeFeedback?.message ?? ''}
        primaryLabel={activeFeedback?.primaryLabel}
        secondaryLabel={activeFeedback?.secondaryLabel}
        autoCloseMs={activeFeedback?.autoCloseMs}
        onClose={() => settleFeedback(false)}
        onPrimaryAction={() => settleFeedback(true)}
        onSecondaryAction={() => settleFeedback(false)}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider');
  return context;
}

'use client';

import { useEffect, useId, useRef } from 'react';

export type FeedbackTone = 'success' | 'error' | 'info';

export interface FeedbackNotice {
  tone: FeedbackTone;
  title: string;
  message: string;
  primaryLabel?: string;
  autoCloseMs?: number;
}

interface FeedbackModalProps {
  open: boolean;
  title: string;
  message: string;
  tone?: FeedbackTone;
  primaryLabel?: string;
  secondaryLabel?: string;
  autoCloseMs?: number;
  onClose: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

const toneLabels: Record<FeedbackTone, string> = {
  success: 'Success',
  error: 'Action needed',
  info: 'Information',
};

export default function FeedbackModal({
  open,
  title,
  message,
  tone = 'info',
  primaryLabel = 'Close',
  secondaryLabel,
  autoCloseMs,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
}: FeedbackModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const secondaryButtonRef = useRef<HTMLButtonElement>(null);
  const isPassive = typeof autoCloseMs === 'number' && autoCloseMs > 0;

  useEffect(() => {
    if (!open) return;

    if (isPassive) {
      const timer = window.setTimeout(onClose, autoCloseMs);
      return () => window.clearTimeout(timer);
    }

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = [secondaryButtonRef.current, primaryButtonRef.current]
          .filter((button): button is HTMLButtonElement => button !== null);
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    primaryButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [autoCloseMs, isPassive, open, onClose]);

  if (!open) return null;

  return (
    <div
      className="feedback-modal-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`feedback-modal feedback-modal-${tone}`}
        role={isPassive ? 'status' : 'dialog'}
        aria-modal={isPassive ? undefined : 'true'}
        aria-live={isPassive ? 'polite' : undefined}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={isPassive ? undefined : -1}
      >
        <p className="feedback-modal-status">{toneLabels[tone]}</p>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId} className="feedback-modal-message">{message}</p>
        {!isPassive && <div className="feedback-modal-actions">
          {secondaryLabel && (
            <button
              ref={secondaryButtonRef}
              type="button"
              className="feedback-modal-secondary"
              onClick={onSecondaryAction ?? onClose}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            ref={primaryButtonRef}
            type="button"
            className="feedback-modal-primary"
            onClick={onPrimaryAction ?? onClose}
          >
            {primaryLabel}
          </button>
        </div>}
      </section>
    </div>
  );
}

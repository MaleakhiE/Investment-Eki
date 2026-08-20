import type { ReactNode } from 'react';

interface FormErrorProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Inline client-side form-validation error.
 * role="alert" + aria-live="assertive" announce the message to assistive tech
 * the moment it renders (e.g. password mismatch, weak password).
 */
export default function FormError({ children, className }: FormErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={className ?? 'mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20'}
    >
      {children}
    </div>
  );
}

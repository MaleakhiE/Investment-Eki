import type { ReactNode } from 'react';

export default function AuthShell({ title, description, children, footer }: { title: string; description: string; children?: ReactNode; footer?: ReactNode }) {
  return <main className="auth-shell"><section className="auth-panel"><div className="auth-brand"><span className="app-brand-mark">F</span><span>FinTrack</span></div><div className="auth-heading"><p className="app-eyebrow">Personal finance</p><h1>{title}</h1><p>{description}</p></div>{children}{footer && <div className="auth-footer">{footer}</div>}</section><aside className="auth-story" aria-hidden="true"><div><p className="app-eyebrow">Clear money decisions</p><strong>Build a calmer relationship with your finances.</strong><div className="auth-preview"><small>Monthly balance</small><b>Rp 4,600,000</b><span>Income is ahead of spending this month</span></div></div></aside></main>;
}

import type { ReactNode } from 'react';

export function MetricCard({ label, value, detail, tone = 'plain' }: { label: string; value: string; detail?: string; tone?: 'plain' | 'mint' | 'yellow' | 'lavender' | 'dark' }) { return <article className={`finance-metric tone-${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>; }

export function TransactionRow({ title, meta, amount, direction, action }: { title: string; meta: string; amount: string; direction: 'income' | 'expense'; action?: ReactNode }) { return <article className="finance-row"><div><strong>{title}</strong><span>{meta}</span></div><div className="finance-row-amount"><small>{direction === 'income' ? 'Income' : 'Expense'}</small><b className={direction === 'income' ? 'number-up' : 'number-down'}>{amount}</b></div>{action}</article>; }

export function ProgressCard({ label, value, detail, status }: { label: string; value: number; detail: string; status?: string }) { const safe = Math.max(0, Math.min(100, value)); return <article className="finance-progress"><div><strong>{label}</strong>{status && <span>{status}</span>}</div><div className="finance-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safe)}><i style={{ width: `${safe}%` }}/></div><small>{detail}</small></article>; }

export function ChartCard({ title, summary, children }: { title: string; summary: string; children: ReactNode }) { return <section className="app-surface finance-chart"><div><h2>{title}</h2><p>{summary}</p></div><div className="finance-chart-body">{children}</div></section>; }

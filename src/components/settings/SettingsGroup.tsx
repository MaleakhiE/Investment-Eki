import type { ReactNode } from 'react';
export function SettingsGroup({ title, children }: { title: string; children?: ReactNode }) { return <section className="settings-group"><h2>{title}</h2><div>{children}</div></section>; }
export function SettingsRow({ label, description, value, action }: { label: string; description?: string; value?: string; action?: ReactNode }) { return <div className="settings-row"><div><strong>{label}</strong>{description && <span>{description}</span>}</div>{value && <b>{value}</b>}{action}</div>; }

import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-shell-header" aria-label="Workspace status">
          <div>
            <p className="app-shell-kicker">Personal finance workspace</p>
            <p className="app-shell-title">Make the next money decision visible.</p>
          </div>
          <span className="app-shell-status"><span aria-hidden="true" /> Private workspace</span>
        </div>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

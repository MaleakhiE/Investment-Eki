'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import { useFeedback } from '@/components/providers/FeedbackProvider';

interface SmtpSettings {
  configured: boolean;
  host: string;
  port: number;
  username: string;
  fromAddress: string;
}

interface ApiEnvelope<T> {
  responseMessage?: string;
  responseDetails?: T | null;
}

const emptySettings: SmtpSettings = {
  configured: false,
  host: '',
  port: 465,
  username: '',
  fromAddress: '',
};

export default function SuperadminSmtpPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showFeedback } = useFeedback();
  const [settings, setSettings] = useState<SmtpSettings>(emptySettings);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState<'save' | 'verify' | 'test' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (status === 'authenticated' && session.user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      void loadSettings();
    }
    // Loading is intentionally keyed to authentication changes, not form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, session, status]);

  async function parseResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
    try {
      return await response.json() as ApiEnvelope<T>;
    } catch {
      return {};
    }
  }

  function handleForbidden(response: Response) {
    if (response.status === 401) {
      router.replace('/login');
      return true;
    }
    if (response.status === 403) {
      router.replace('/dashboard');
      return true;
    }
    return false;
  }

  async function loadSettings() {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/superadmin/smtp', { cache: 'no-store' });
      if (handleForbidden(response)) return;
      const body = await parseResponse<SmtpSettings>(response);
      if (!response.ok || !body.responseDetails) {
        setError(body.responseMessage || 'SMTP configuration could not be loaded.');
        return;
      }
      setSettings({ ...emptySettings, ...body.responseDetails });
    } catch {
      setError('SMTP configuration could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }

  function updateField<K extends keyof SmtpSettings>(key: K, value: SmtpSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function requestPayload() {
    return {
      host: settings.host.trim(),
      port: settings.port,
      username: username.trim(),
      fromAddress: settings.fromAddress.trim(),
      password,
    };
  }

  async function runAction(action: 'save' | 'verify', event?: FormEvent) {
    event?.preventDefault();
    setActiveAction(action);
    try {
      const response = action === 'save'
        ? await fetch('/api/superadmin/smtp', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(requestPayload()),
          })
        : await fetch('/api/superadmin/smtp/verify', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      if (handleForbidden(response)) return;
      const body = await parseResponse<SmtpSettings>(response);
      if (!response.ok) {
        void showFeedback({
          tone: 'error',
          title: action === 'save' ? 'SMTP configuration not saved' : 'SMTP verification failed',
          message: body.responseMessage || `SMTP ${action === 'save' ? 'configuration' : 'connection'} failed.`,
        });
        return;
      }
      if (action === 'save') {
        if (body.responseDetails) setSettings((current) => ({ ...current, ...body.responseDetails }));
        else setSettings((current) => ({ ...current, configured: true }));
        setPassword('');
        setUsername('');
      }
      void showFeedback({
        tone: 'success',
        title: action === 'save' ? 'SMTP configuration saved' : 'SMTP connection verified',
        message: body.responseMessage || (action === 'save' ? 'The global SMTP configuration is ready to use.' : 'The mail server accepted the connection.'),
      });
    } catch {
      void showFeedback({
        tone: 'error',
        title: action === 'save' ? 'SMTP configuration not saved' : 'SMTP verification failed',
        message: `SMTP ${action === 'save' ? 'configuration' : 'connection'} failed. Check the server details and try again.`,
      });
    } finally {
      setActiveAction(null);
    }
  }

  async function sendTestEmail(event: FormEvent) {
    event.preventDefault();
    setActiveAction('test');
    try {
      const response = await fetch('/api/superadmin/smtp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ recipient: recipient.trim() }),
      });
      if (handleForbidden(response)) return;
      const body = await parseResponse<null>(response);
      if (!response.ok) {
        void showFeedback({ tone: 'error', title: 'Test email not sent', message: body.responseMessage || 'Test email could not be sent.' });
        return;
      }
      void showFeedback({ tone: 'success', title: 'Test email sent', message: body.responseMessage || `A test message was sent to ${recipient.trim()}.` });
    } catch {
      void showFeedback({ tone: 'error', title: 'Test email not sent', message: 'Test email could not be sent. Check the connection and try again.' });
    } finally {
      setActiveAction(null);
    }
  }

  if (status === 'loading' || status === 'unauthenticated' || session?.user.role !== 'SUPERADMIN') {
    return <div className="flex min-h-screen items-center justify-center bg-[#f3faf8] text-sm text-zinc-600">Checking access...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page smtp-page p-4 pb-28 lg:ml-64 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#008f78]">Superadmin</p>
            <h1 className="mt-1 text-2xl font-bold text-[#16332f]">Global SMTP Configuration</h1>
            <p className="mt-1 text-sm text-zinc-600">Manage the mail server used by every account.</p>
          </header>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <section className="card rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dcece8] pb-4">
              <div><h2 className="font-semibold text-[#16332f]">Configuration</h2><p className="text-xs text-zinc-600">Passwords are never returned after saving.</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{settings.configured ? 'Configured' : 'Not configured'}</span>
            </div>

            {isLoading ? <p className="py-8 text-center text-sm text-zinc-600">Loading configuration...</p> : (
              <form onSubmit={(event) => void runAction('save', event)} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <label className="text-sm font-medium text-[#16332f]">Host<input required value={settings.host} onChange={(event) => updateField('host', event.target.value)} placeholder="smtp.example.com" className="mt-1 w-full rounded-lg border border-[#dcece8] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#00d4aa]" /></label>
                  <label className="text-sm font-medium text-[#16332f]">Port<input required type="number" min={1} max={65535} value={settings.port} onChange={(event) => updateField('port', Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#dcece8] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#00d4aa]" /></label>
                </div>
                <label className="block text-sm font-medium text-[#16332f]">Username<input required={!settings.configured} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={settings.configured ? `Current: ${settings.username}. Leave blank to keep it` : 'Enter SMTP username'} className="mt-1 w-full rounded-lg border border-[#dcece8] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#00d4aa]" /></label>
                <label className="block text-sm font-medium text-[#16332f]">From address<input required type="email" value={settings.fromAddress} onChange={(event) => updateField('fromAddress', event.target.value)} className="mt-1 w-full rounded-lg border border-[#dcece8] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#00d4aa]" /></label>
                <label className="block text-sm font-medium text-[#16332f]">Password<input type="password" autoComplete="new-password" required={!settings.configured} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={settings.configured ? 'Leave blank to keep the current password' : 'Enter SMTP password'} className="mt-1 w-full rounded-lg border border-[#dcece8] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#00d4aa]" /></label>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button type="submit" disabled={activeAction !== null} className="rounded-lg bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-[#16332f] hover:bg-[#00b995] disabled:cursor-not-allowed disabled:opacity-50">{activeAction === 'save' ? 'Saving...' : 'Save'}</button>
                  <button type="button" onClick={() => void runAction('verify')} disabled={activeAction !== null} className="rounded-lg border border-[#00a88a] px-4 py-2 text-sm font-semibold text-[#008f78] hover:bg-[#e9f8f4] disabled:cursor-not-allowed disabled:opacity-50">{activeAction === 'verify' ? 'Verifying...' : 'Verify Connection'}</button>
                </div>
              </form>
            )}
          </section>

          <section className="card rounded-2xl p-5">
            <h2 className="font-semibold text-[#16332f]">Send Test Email</h2>
            <p className="mt-1 text-xs text-zinc-600">Send a test message using the saved global configuration.</p>
            <form onSubmit={(event) => void sendTestEmail(event)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-medium text-[#16332f]">Recipient email<input required type="email" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="recipient@example.com" className="mt-1 w-full rounded-lg border border-[#dcece8] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#00d4aa]" /></label>
              <button type="submit" disabled={activeAction !== null || !settings.configured} className="rounded-lg bg-[#16332f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#234942] disabled:cursor-not-allowed disabled:opacity-50">{activeAction === 'test' ? 'Sending...' : 'Send Test Email'}</button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

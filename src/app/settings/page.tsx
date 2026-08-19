'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { useFeedback } from '@/components/providers/FeedbackProvider';

interface UserSettings { ai_recommendation_enabled: boolean; }
interface CustomAlert { id: string; name: string; type: 'expense_limit' | 'income_target' | 'savings_goal'; threshold: number; enabled: boolean; }
interface NotificationSettings {
  monthly_reminder: boolean;
  monthly_reminder_day: number;
  monthly_summary: boolean;
  low_balance_alert: boolean;
  low_balance_threshold: number;
  custom_alerts: CustomAlert[];
}
interface ExportSummary {
  transactions: number;
  investment_snapshots: number;
  budgets: number;
  goals: number;
  accounts: number;
  total_records: number;
  account_options: { id: string; name: string; is_archived: boolean }[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { showFeedback, confirmAction } = useFeedback();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [error, setError] = useState('');
  const [notifError, setNotifError] = useState(false);
  const [showCustomAlertForm, setShowCustomAlertForm] = useState(false);
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertType, setNewAlertType] = useState<'expense_limit' | 'income_target' | 'savings_goal'>('expense_limit');
  const [newAlertThreshold, setNewAlertThreshold] = useState('');
  const [lowBalanceDraft, setLowBalanceDraft] = useState('');
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null);
  const [exportSummaryError, setExportSummaryError] = useState(false);
  const [isExportSummaryLoading, setIsExportSummaryLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportAccountId, setExportAccountId] = useState('');

  useEffect(() => { fetchSettings(); fetchNotifSettings(); fetchExportSummary(); }, []);

  async function fetchSettings() {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Settings unavailable');
      const d = await res.json();
      setSettings(d.responseDetails);
    } catch { setSettings(null); setError('Settings are unavailable.'); } finally { setIsLoading(false); }
  }
  async function fetchNotifSettings() {
    setNotifError(false);
    try {
      const res = await fetch('/api/settings/notifications');
      if (!res.ok) throw new Error('Notification settings unavailable');
      const d = await res.json();
      setNotifSettings(d.responseDetails);
      setLowBalanceDraft(String(d.responseDetails?.low_balance_threshold ?? ''));
    } catch { setNotifSettings(null); setNotifError(true); }
  }
  async function fetchExportSummary() {
    setIsExportSummaryLoading(true);
    setExportSummaryError(false);
    try {
      const res = await fetch('/api/export?summary=true');
      if (!res.ok) throw new Error('Summary unavailable');
      const d = await res.json();
      setExportSummary(d.responseDetails);
    } catch {
      setExportSummary(null);
      setExportSummaryError(true);
    } finally {
      setIsExportSummaryLoading(false);
    }
  }
  async function handleExport(format: 'json' | 'csv') {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (format === 'csv') {
        if (exportFrom) params.set('from', exportFrom);
        if (exportTo) params.set('to', exportTo);
        if (exportAccountId) params.set('accountId', exportAccountId);
      }
      const res = await fetch(`/api/export?${params}`);
      if (!res.ok) {
        let message = 'Your data could not be exported. Please try again.';
        try {
          const body = await res.json();
          message = Array.isArray(body.responseDetails?.errors)
            ? body.responseDetails.errors.join(' ')
            : body.responseMessage || message;
        } catch { /* The export endpoint may return a non-JSON error. */ }
        void showFeedback({ tone: 'error', title: 'Export failed', message });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? `transactions_${new Date().toISOString().split('T')[0]}.csv` : `fintrack_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      void showFeedback({ tone: 'success', title: 'Export complete', message: `Your ${format.toUpperCase()} file has been downloaded.` });
    } catch {
      void showFeedback({ tone: 'error', title: 'Export failed', message: 'Your data could not be exported. Check your connection and try again.' });
    } finally { setIsExporting(false); }
  }
  async function toggleAI() {
    if (!settings) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/ai-recommendation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !settings.ai_recommendation_enabled }) });
      const d = await res.json();
      if (!res.ok) {
        void showFeedback({ tone: 'error', title: 'Setting not updated', message: d.responseMessage || 'AI recommendation preferences could not be updated.' });
        return;
      }
      setSettings(d.responseDetails);
      void showFeedback({
        tone: 'success',
        title: 'AI recommendation updated',
        message: d.responseDetails?.ai_recommendation_enabled ? 'AI recommendations are now enabled.' : 'AI recommendations are now disabled.',
      });
    } catch {
      void showFeedback({ tone: 'error', title: 'Setting not updated', message: 'AI recommendation preferences could not be updated. Please try again.' });
    } finally { setIsSaving(false); }
  }
  async function updateNotifSetting(key: string, value: unknown): Promise<boolean> {
    if (!notifSettings) return false;
    setIsSavingNotif(true);
    try {
      const res = await fetch('/api/settings/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) });
      const d = await res.json();
      if (!res.ok) {
        void showFeedback({ tone: 'error', title: 'Notification setting not saved', message: d.responseMessage || 'The notification preference could not be saved.' });
        return false;
      }
      setNotifSettings(d.responseDetails);
      setLowBalanceDraft(String(d.responseDetails?.low_balance_threshold ?? ''));
      void showFeedback({ tone: 'success', title: 'Notification setting saved', message: 'Your notification preferences have been updated.' });
      return true;
    } catch {
      void showFeedback({ tone: 'error', title: 'Notification setting not saved', message: 'The notification preference could not be saved. Please try again.' });
      return false;
    } finally { setIsSavingNotif(false); }
  }
  async function addCustomAlert() {
    if (!notifSettings || !newAlertName || !newAlertThreshold) return;
    const threshold = parseFloat(newAlertThreshold.replace(/[^\d]/g, ''));
    if (!threshold) return;
    const newAlert: CustomAlert = { id: Date.now().toString(), name: newAlertName, type: newAlertType, threshold, enabled: true };
    const saved = await updateNotifSetting('custom_alerts', [...notifSettings.custom_alerts, newAlert]);
    if (!saved) return;
    setNewAlertName(''); setNewAlertThreshold(''); setShowCustomAlertForm(false);
  }
  async function toggleCustomAlert(id: string) {
    if (!notifSettings) return;
    await updateNotifSetting('custom_alerts', notifSettings.custom_alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }
  async function deleteCustomAlert(id: string) {
    if (!notifSettings) return;
    const confirmed = await confirmAction({
      title: 'Delete custom alert?',
      message: 'This alert will be removed permanently. This action cannot be undone.',
      confirmLabel: 'Delete alert',
      cancelLabel: 'Keep alert',
    });
    if (!confirmed) return;
    await updateNotifSetting('custom_alerts', notifSettings.custom_alerts.filter(a => a.id !== id));
  }

  async function handleSignOut() {
    const confirmed = await confirmAction({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your financial data.',
      confirmLabel: 'Sign out',
      cancelLabel: 'Stay signed in',
    });
    if (confirmed) await signOut({ callbackUrl: '/login' });
  }
  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const alertTypeLabel = (t: string) => t === 'expense_limit' ? 'Expense limit' : t === 'income_target' ? 'Income target' : 'Savings target';

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page settings-page lg:ml-64 p-3 sm:p-4 lg:p-8">
        <div className="mb-4"><h2 className="text-xl font-bold text-[#16332f]">Settings</h2><p className="text-xs text-zinc-600">Manage your preferences</p></div>
        {error && <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-400">{error}</div>}
        {isLoading ? <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div> : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1"><h3 className="font-semibold text-[#16332f] text-sm mb-1">AI Recommendation</h3><p className="text-xs text-zinc-600 mb-2">Enable AI-powered investment recommendations.</p><p className="text-xs"><span className="text-zinc-500">Status: </span><span className={`font-medium ${settings?.ai_recommendation_enabled ? 'text-green-400' : 'text-zinc-500'}`}>{settings?.ai_recommendation_enabled ? 'Active' : 'Inactive'}</span></p></div>
                  <ToggleSwitch checked={settings?.ai_recommendation_enabled ?? false} onChange={() => { void toggleAI(); }} label="Enable AI recommendations" disabled={isSaving} />
                </div>
              </div>
              <div className="card rounded-xl p-4">
                <h3 className="font-semibold text-[#16332f] text-sm mb-3">Account</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-xs text-zinc-600">Email</span><span className="text-xs font-medium text-[#16332f] truncate max-w-[150px]">{session?.user?.email}</span></div>
                  <div className="flex justify-between py-1"><span className="text-xs text-zinc-600">User ID</span><span className="text-xs font-mono text-zinc-600">{session?.user?.id}</span></div>
                </div>
              </div>
            </div>

            <div className="card rounded-xl p-4">
              <h3 className="font-semibold text-[#16332f] text-sm mb-3">Notification settings</h3>
              {notifError ? <p role="alert" className="text-xs text-amber-700 text-center py-4">Notification settings are unavailable.{' '}<button type="button" onClick={() => { void fetchNotifSettings(); }} className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">Retry loading notifications</button></p> : !notifSettings ? <p className="text-xs text-zinc-500 text-center py-4">Loading...</p> : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="flex-1 mr-3"><p className="text-xs font-medium text-[#16332f]">Monthly reminder</p><p className="text-[10px] text-zinc-600">Reminder to update your finances</p>
                      <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-600">Day:</span>
                        <select aria-describedby="monthly-reminder-day-note" value={notifSettings.monthly_reminder_day} disabled className="px-1.5 py-0.5 text-[10px] border border-[#dcece8] rounded bg-[#f3faf8] text-[#16332f] disabled:opacity-50">{Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}</select>
                      </div>
                      <p id="monthly-reminder-day-note" className="mt-1 text-[9px] text-amber-700">Delivery-day scheduling is not active yet.</p>
                    </div>
                    <ToggleSwitch checked={notifSettings.monthly_reminder} onChange={(checked) => { void updateNotifSetting('monthly_reminder', checked); }} label="Enable monthly reminder" disabled={isSavingNotif} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="mr-3"><p className="text-xs font-medium text-[#16332f]">Monthly summary</p><p className="text-[10px] text-zinc-600">Financial summary when current-month data exists</p></div>
                    <ToggleSwitch checked={notifSettings.monthly_summary} onChange={(checked) => { void updateNotifSetting('monthly_summary', checked); }} label="Enable monthly summary" disabled={isSavingNotif} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="flex-1 mr-3"><p className="text-xs font-medium text-[#16332f]">Low balance alert</p><p className="text-[10px] text-zinc-600">Notification when cash flow is low</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-600">Min:</span>
                        <CurrencyInput value={lowBalanceDraft} onChange={setLowBalanceDraft} placeholder="0" className="w-28 py-0.5 text-[10px] border border-[#dcece8] rounded disabled:opacity-50" disabled={isSavingNotif || !notifSettings.low_balance_alert} />
                        <button type="button" onClick={() => { void updateNotifSetting('low_balance_threshold', Number(lowBalanceDraft) || 0); }} disabled={isSavingNotif || !notifSettings.low_balance_alert || Number(lowBalanceDraft) === notifSettings.low_balance_threshold} className="rounded border border-[#00a88a] px-2 py-1 text-[9px] font-semibold text-[#008f78] disabled:opacity-40">Save</button>
                      </div>
                    </div>
                    <ToggleSwitch checked={notifSettings.low_balance_alert} onChange={(checked) => { void updateNotifSetting('low_balance_alert', checked); }} label="Enable low balance alert" disabled={isSavingNotif} />
                  </div>
                  <div className="p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="flex items-center justify-between mb-2"><div><p className="text-xs font-medium text-[#16332f]">Custom alerts</p><p className="text-[10px] text-zinc-600">Notifications tailored to your needs</p></div><button onClick={() => setShowCustomAlertForm(!showCustomAlertForm)} className="text-[10px] text-[#00d4aa] hover:underline">{showCustomAlertForm ? 'Cancel' : 'Add'}</button></div>
                    {showCustomAlertForm && (<div className="mb-2 p-2 bg-[#f3faf8] rounded-lg border border-[#dcece8] space-y-2"><input type="text" value={newAlertName} onChange={(e) => setNewAlertName(e.target.value)} placeholder="Alert name..." className="w-full px-2 py-1 text-[10px] border border-[#dcece8] rounded bg-white text-[#16332f]" /><div className="grid grid-cols-2 gap-2"><select value={newAlertType} onChange={(e) => setNewAlertType(e.target.value as typeof newAlertType)} className="px-2 py-1 text-[10px] border border-[#dcece8] rounded bg-white text-[#16332f]"><option value="expense_limit">Expense limit</option><option value="income_target">Income target</option><option value="savings_goal">Savings target</option></select><CurrencyInput value={newAlertThreshold} onChange={setNewAlertThreshold} placeholder="Threshold" className="py-1 text-[10px] border border-[#dcece8] rounded bg-white text-[#16332f]" /></div><button onClick={addCustomAlert} disabled={!newAlertName || !newAlertThreshold || isSavingNotif} className="w-full py-1 bg-[#00d4aa] text-[#16332f] text-[10px] rounded hover:bg-[#00a88a] disabled:opacity-50">Save</button></div>)}
                    {notifSettings.custom_alerts.length > 0 ? (<div className="space-y-2">{notifSettings.custom_alerts.map((alert) => (<div key={alert.id} className="flex items-center justify-between gap-3 p-2 bg-[#f3faf8] rounded-lg border border-[#dcece8]"><div className="flex-1 min-w-0"><p className="text-[10px] font-medium text-[#16332f] truncate">{alert.name}</p><p className="text-[9px] text-zinc-500 truncate">{alertTypeLabel(alert.type)}: {fmt(alert.threshold)}</p></div><div className="flex flex-shrink-0 items-center gap-1.5"><ToggleSwitch checked={alert.enabled} onChange={() => { void toggleCustomAlert(alert.id); }} label={`Custom alert: ${alert.name}`} disabled={isSavingNotif} /><button onClick={() => deleteCustomAlert(alert.id)} className="min-h-11 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-red-400">Delete</button></div></div>))}</div>) : !showCustomAlertForm && <div className="rounded-lg border border-dashed border-[#dcece8] bg-[#f5fbf9] p-3 text-center" role="status" aria-live="polite"><div aria-hidden="true" className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[#dff5ef] text-base">🔔</div><p className="text-[10px] font-medium text-[#16332f]">Belum ada alarm kustom</p><p className="mt-0.5 text-[9px] text-zinc-500">Buat alarm khusus untuk batas pengeluaran, target pemasukan, atau tujuan tabungan Anda.</p></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Export Data */}
            <div className="card rounded-xl p-4">
              <h3 className="font-semibold text-[#16332f] text-sm mb-3">Export Data</h3>
              <p className="text-xs text-zinc-600 mb-3">Download a portable JSON data export or a filtered transaction CSV. JSON files are plaintext, contain decrypted financial data, and should be stored securely. They are not restorable backups; notable exclusions include receipts, credentials, recurring rules, and notification settings.</p>
              {exportSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.transactions}</p><p className="text-[10px] text-zinc-600">Transactions</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.accounts}</p><p className="text-[10px] text-zinc-600">Accounts</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.investment_snapshots}</p><p className="text-[10px] text-zinc-600">Investments</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.budgets}</p><p className="text-[10px] text-zinc-600">Budgets</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.goals}</p><p className="text-[10px] text-zinc-600">Goals</p></div>
                </div>
              )}
              {exportSummaryError && (
                <p role="status" className="mb-3 text-xs text-amber-700">
                  Account filters are unavailable.{' '}
                  <button type="button" onClick={() => { void fetchExportSummary(); }} className="min-h-11 font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">Retry</button>
                </p>
              )}
              <fieldset className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <legend className="mb-2 text-xs font-medium text-[#16332f]">CSV filters (optional)</legend>
                <label className="text-[10px] text-zinc-600">
                  From
                  <input type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} max={exportTo || undefined} className="mt-1 block min-h-11 w-full rounded border border-[#dcece8] bg-white px-2 py-1.5 text-xs text-[#16332f] focus-visible:outline-2 focus-visible:outline-offset-2" />
                </label>
                <label className="text-[10px] text-zinc-600">
                  To
                  <input type="date" value={exportTo} onChange={(event) => setExportTo(event.target.value)} min={exportFrom || undefined} className="mt-1 block min-h-11 w-full rounded border border-[#dcece8] bg-white px-2 py-1.5 text-xs text-[#16332f] focus-visible:outline-2 focus-visible:outline-offset-2" />
                </label>
                <label className="text-[10px] text-zinc-600">
                  Account
                  <select value={exportAccountId} onChange={(event) => setExportAccountId(event.target.value)} disabled={isExportSummaryLoading || exportSummaryError} className="mt-1 block min-h-11 w-full rounded border border-[#dcece8] bg-white px-2 py-1.5 text-xs text-[#16332f] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2">
                    <option value="">All accounts</option>
                    {exportSummary?.account_options.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}{account.is_archived ? ' (archived)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
              <div className="flex gap-2">
                <button onClick={() => handleExport('json')} disabled={isExporting} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-[#00d4aa] px-3 py-2 text-xs font-medium text-[#16332f] hover:bg-[#00a88a] disabled:bg-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {isExporting ? '...' : 'JSON Data Export'}
                </button>
                <button onClick={() => handleExport('csv')} disabled={isExporting} className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2">
                  {isExporting ? '...' : 'CSV Transactions'}
                </button>
              </div>
            </div>

            <div className="card rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center justify-between"><div><h3 className="font-semibold text-[#16332f] text-sm mb-1">Session</h3><p className="text-xs text-zinc-600">Sign out from your account.</p></div><button onClick={() => { void handleSignOut(); }} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs">Sign Out</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

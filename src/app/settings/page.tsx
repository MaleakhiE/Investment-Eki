'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';

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
interface ExportSummary { transactions: number; investment_snapshots: number; budgets: number; goals: number; total_records: number; }

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifError, setNotifError] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [showCustomAlertForm, setShowCustomAlertForm] = useState(false);
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertType, setNewAlertType] = useState<'expense_limit' | 'income_target' | 'savings_goal'>('expense_limit');
  const [newAlertThreshold, setNewAlertThreshold] = useState('');
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { fetchSettings(); fetchNotifSettings(); fetchExportSummary(); }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) { const d = await res.json(); setSettings(d.responseDetails); }
    } catch { setError('Failed to load'); } finally { setIsLoading(false); }
  }
  async function fetchNotifSettings() {
    try {
      const res = await fetch('/api/settings/notifications');
      if (res.ok) { const d = await res.json(); setNotifSettings(d.responseDetails); }
    } catch { /* ignore */ }
  }
  async function fetchExportSummary() {
    try {
      const res = await fetch('/api/export?summary=true');
      if (res.ok) { const d = await res.json(); setExportSummary(d.responseDetails); }
    } catch { /* ignore */ }
  }
  async function handleExport(format: 'json' | 'csv') {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = format === 'csv' ? `transactions_${new Date().toISOString().split('T')[0]}.csv` : `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        setSuccess('Export complete!'); setTimeout(() => setSuccess(''), 3000);
      }
    } catch { setError('Export failed'); } finally { setIsExporting(false); }
  }
  async function toggleAI() {
    if (!settings) return;
    setError(''); setSuccess(''); setIsSaving(true);
    try {
      const res = await fetch('/api/settings/ai-recommendation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !settings.ai_recommendation_enabled }) });
      const d = await res.json();
      if (!res.ok) { setError(d.responseMessage || 'Failed'); return; }
      setSettings(d.responseDetails); setSuccess('Updated'); setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Error'); } finally { setIsSaving(false); }
  }
  async function updateNotifSetting(key: string, value: unknown) {
    if (!notifSettings) return;
    setNotifError(''); setNotifSuccess(''); setIsSavingNotif(true);
    try {
      const res = await fetch('/api/settings/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) });
      const d = await res.json();
      if (!res.ok) { setNotifError(d.responseMessage || 'Failed'); return; }
      setNotifSettings(d.responseDetails); setNotifSuccess('Saved'); setTimeout(() => setNotifSuccess(''), 3000);
    } catch { setNotifError('Error'); } finally { setIsSavingNotif(false); }
  }
  async function addCustomAlert() {
    if (!notifSettings || !newAlertName || !newAlertThreshold) return;
    const threshold = parseFloat(newAlertThreshold.replace(/[^\d]/g, ''));
    if (!threshold) return;
    const newAlert: CustomAlert = { id: Date.now().toString(), name: newAlertName, type: newAlertType, threshold, enabled: true };
    await updateNotifSetting('custom_alerts', [...notifSettings.custom_alerts, newAlert]);
    setNewAlertName(''); setNewAlertThreshold(''); setShowCustomAlertForm(false);
  }
  async function toggleCustomAlert(id: string) {
    if (!notifSettings) return;
    await updateNotifSetting('custom_alerts', notifSettings.custom_alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }
  async function deleteCustomAlert(id: string) {
    if (!notifSettings || !confirm('Delete this alert?')) return;
    await updateNotifSetting('custom_alerts', notifSettings.custom_alerts.filter(a => a.id !== id));
  }
  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const alertTypeLabel = (t: string) => t === 'expense_limit' ? 'Expense limit' : t === 'income_target' ? 'Income target' : 'Savings target';

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page settings-page lg:ml-64 p-3 sm:p-4 lg:p-8">
        <div className="mb-4"><h2 className="text-xl font-bold text-[#16332f]">Settings</h2><p className="text-xs text-zinc-600">Manage your preferences</p></div>
        {error && <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-xl text-xs text-red-400">{error}</div>}
        {success && <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-xl text-xs text-green-400">{success}</div>}
        {isLoading ? <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div> : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1"><h3 className="font-semibold text-[#16332f] text-sm mb-1">AI Recommendation</h3><p className="text-xs text-zinc-600 mb-2">Enable AI-powered investment recommendations.</p><p className="text-xs"><span className="text-zinc-500">Status: </span><span className={`font-medium ${settings?.ai_recommendation_enabled ? 'text-green-400' : 'text-zinc-500'}`}>{settings?.ai_recommendation_enabled ? 'Active' : 'Inactive'}</span></p></div>
                  <button type="button" role="switch" aria-checked={settings?.ai_recommendation_enabled ?? false} aria-label="Enable AI recommendations" onClick={toggleAI} disabled={isSaving} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings?.ai_recommendation_enabled ? 'bg-[#00d4aa]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${settings?.ai_recommendation_enabled ? 'translate-x-4' : 'translate-x-0'}`} /></button>
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
              {notifError && <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400">{notifError}</div>}
              {notifSuccess && <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg text-xs text-green-400">{notifSuccess}</div>}
              {!notifSettings ? <p className="text-xs text-zinc-500 text-center py-4">Loading...</p> : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="flex-1 mr-3"><p className="text-xs font-medium text-[#16332f]">Monthly reminder</p><p className="text-[10px] text-zinc-600">Reminder to update your finances</p>
                      <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-600">Day:</span>
                        <select value={notifSettings.monthly_reminder_day} onChange={(e) => updateNotifSetting('monthly_reminder_day', parseInt(e.target.value))} disabled={isSavingNotif || !notifSettings.monthly_reminder} className="px-1.5 py-0.5 text-[10px] border border-[#dcece8] rounded bg-[#f3faf8] text-[#16332f] disabled:opacity-50">{Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}</select>
                      </div>
                    </div>
                    <button type="button" role="switch" aria-checked={notifSettings.monthly_reminder} aria-label="Enable monthly reminder" onClick={() => updateNotifSetting('monthly_reminder', !notifSettings.monthly_reminder)} disabled={isSavingNotif} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notifSettings.monthly_reminder ? 'bg-[#00d4aa]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${notifSettings.monthly_reminder ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="mr-3"><p className="text-xs font-medium text-[#16332f]">Monthly summary</p><p className="text-[10px] text-zinc-600">End-of-month financial summary</p></div>
                    <button type="button" role="switch" aria-checked={notifSettings.monthly_summary} aria-label="Enable monthly summary" onClick={() => updateNotifSetting('monthly_summary', !notifSettings.monthly_summary)} disabled={isSavingNotif} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notifSettings.monthly_summary ? 'bg-[#00d4aa]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${notifSettings.monthly_summary ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="flex-1 mr-3"><p className="text-xs font-medium text-[#16332f]">Low balance alert</p><p className="text-[10px] text-zinc-600">Notification when cash flow is low</p>
                      <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-600">Min:</span><CurrencyInput value={notifSettings.low_balance_threshold.toString()} onChange={(v) => { const num = parseFloat(v.replace(/[^\d]/g, '')) || 0; updateNotifSetting('low_balance_threshold', num); }} placeholder="0" className="w-28 py-0.5 text-[10px] border border-[#dcece8] rounded disabled:opacity-50" disabled={isSavingNotif || !notifSettings.low_balance_alert} /></div>
                    </div>
                    <button type="button" role="switch" aria-checked={notifSettings.low_balance_alert} aria-label="Enable low balance alert" onClick={() => updateNotifSetting('low_balance_alert', !notifSettings.low_balance_alert)} disabled={isSavingNotif} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notifSettings.low_balance_alert ? 'bg-[#00d4aa]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${notifSettings.low_balance_alert ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="p-3 bg-[#f5fbf9] rounded-lg">
                    <div className="flex items-center justify-between mb-2"><div><p className="text-xs font-medium text-[#16332f]">Custom alerts</p><p className="text-[10px] text-zinc-600">Notifications tailored to your needs</p></div><button onClick={() => setShowCustomAlertForm(!showCustomAlertForm)} className="text-[10px] text-[#00d4aa] hover:underline">{showCustomAlertForm ? 'Cancel' : 'Add'}</button></div>
                    {showCustomAlertForm && (<div className="mb-2 p-2 bg-[#f3faf8] rounded-lg border border-[#dcece8] space-y-2"><input type="text" value={newAlertName} onChange={(e) => setNewAlertName(e.target.value)} placeholder="Alert name..." className="w-full px-2 py-1 text-[10px] border border-[#dcece8] rounded bg-white text-[#16332f]" /><div className="grid grid-cols-2 gap-2"><select value={newAlertType} onChange={(e) => setNewAlertType(e.target.value as typeof newAlertType)} className="px-2 py-1 text-[10px] border border-[#dcece8] rounded bg-white text-[#16332f]"><option value="expense_limit">Expense limit</option><option value="income_target">Income target</option><option value="savings_goal">Savings target</option></select><CurrencyInput value={newAlertThreshold} onChange={setNewAlertThreshold} placeholder="Threshold" className="py-1 text-[10px] border border-[#dcece8] rounded bg-white text-[#16332f]" /></div><button onClick={addCustomAlert} disabled={!newAlertName || !newAlertThreshold || isSavingNotif} className="w-full py-1 bg-[#00d4aa] text-[#16332f] text-[10px] rounded hover:bg-[#00a88a] disabled:opacity-50">Save</button></div>)}
                    {notifSettings.custom_alerts.length > 0 ? (<div className="space-y-2">{notifSettings.custom_alerts.map((alert) => (<div key={alert.id} className="flex items-center justify-between p-2 bg-[#f3faf8] rounded-lg border border-[#dcece8]"><div className="flex-1 min-w-0"><p className="text-[10px] font-medium text-[#16332f] truncate">{alert.name}</p><p className="text-[9px] text-zinc-500 truncate">{alertTypeLabel(alert.type)}: {fmt(alert.threshold)}</p></div><div className="flex items-center gap-1.5 ml-2"><button onClick={() => toggleCustomAlert(alert.id)} disabled={isSavingNotif} aria-label={`${alert.enabled ? 'Disable' : 'Enable'} ${alert.name}`} className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${alert.enabled ? 'bg-[#00d4aa]' : 'bg-white/20'}`}><span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${alert.enabled ? 'translate-x-3' : 'translate-x-0'}`} /></button><button onClick={() => deleteCustomAlert(alert.id)} className="px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-red-400">Delete</button></div></div>))}</div>) : !showCustomAlertForm && <p className="text-[10px] text-zinc-500 text-center py-2">No custom alerts yet</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Export Data */}
            <div className="card rounded-xl p-4">
              <h3 className="font-semibold text-[#16332f] text-sm mb-3">Export Data</h3>
              <p className="text-xs text-zinc-600 mb-3">Download your financial data for backup or analysis.</p>
              {exportSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.transactions}</p><p className="text-[10px] text-zinc-600">Transactions</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.investment_snapshots}</p><p className="text-[10px] text-zinc-600">Investments</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.budgets}</p><p className="text-[10px] text-zinc-600">Budgets</p></div>
                  <div className="bg-[#f5fbf9] rounded-lg p-2 text-center"><p className="text-lg font-bold text-[#16332f]">{exportSummary.goals}</p><p className="text-[10px] text-zinc-600">Goals</p></div>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => handleExport('json')} disabled={isExporting} className="flex-1 py-2 px-3 bg-[#00d4aa] hover:bg-[#00a88a] disabled:bg-blue-400 text-[#16332f] font-medium rounded-lg text-xs flex items-center justify-center gap-1">
                  {isExporting ? '...' : 'JSON Backup'}
                </button>
                <button onClick={() => handleExport('csv')} disabled={isExporting} className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1">
                  {isExporting ? '...' : 'CSV Transactions'}
                </button>
              </div>
            </div>

            <div className="card rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center justify-between"><div><h3 className="font-semibold text-[#16332f] text-sm mb-1">Session</h3><p className="text-xs text-zinc-600">Sign out from your account.</p></div><button onClick={() => signOut({ callbackUrl: '/login' })} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs">Sign Out</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

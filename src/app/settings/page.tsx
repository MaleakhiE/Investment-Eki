'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface UserSettings { ai_recommendation_enabled: boolean; }
interface SmtpSettings { host: string; port: string; user: string; from_email: string; source: 'user' | 'env' | 'none'; }
interface CustomAlert { id: string; name: string; type: 'expense_limit' | 'income_target' | 'savings_goal'; threshold: number; enabled: boolean; }
interface NotificationSettings {
  monthly_reminder: boolean;
  monthly_reminder_day: number;
  monthly_summary: boolean;
  low_balance_alert: boolean;
  low_balance_threshold: number;
  custom_alerts: CustomAlert[];
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isSavingNotif, setIsSavingNotif] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [smtpError, setSmtpError] = useState('');
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [notifError, setNotifError] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [showCustomAlertForm, setShowCustomAlertForm] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [newAlertName, setNewAlertName] = useState('');
  const [newAlertType, setNewAlertType] = useState<'expense_limit' | 'income_target' | 'savings_goal'>('expense_limit');
  const [newAlertThreshold, setNewAlertThreshold] = useState('');

  useEffect(() => { fetchSettings(); fetchSmtpSettings(); fetchNotifSettings(); }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) { const d = await res.json(); setSettings(d.responseDetails); }
    } catch { setError('Failed to load'); } finally { setIsLoading(false); }
  }
  async function fetchSmtpSettings() {
    try {
      const res = await fetch('/api/settings/smtp');
      if (res.ok) {
        const d = await res.json();
        setSmtpSettings(d.responseDetails);
        if (d.responseDetails) { setSmtpHost(d.responseDetails.host); setSmtpPort(d.responseDetails.port); setSmtpUser(d.responseDetails.user); setSmtpFromEmail(d.responseDetails.from_email); }
      }
    } catch { /* ignore */ }
  }
  async function fetchNotifSettings() {
    try {
      const res = await fetch('/api/settings/notifications');
      if (res.ok) { const d = await res.json(); setNotifSettings(d.responseDetails); }
    } catch { /* ignore */ }
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
  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault(); setSmtpError(''); setSmtpSuccess(''); setIsSavingSmtp(true);
    try {
      const res = await fetch('/api/settings/smtp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from_email: smtpFromEmail }) });
      const d = await res.json();
      if (!res.ok) { setSmtpError(d.responseMessage || 'Failed'); return; }
      setSmtpSettings(d.responseDetails); setSmtpSuccess('Saved'); setShowSmtpForm(false); setSmtpPass(''); setTimeout(() => setSmtpSuccess(''), 3000);
    } catch { setSmtpError('Error'); } finally { setIsSavingSmtp(false); }
  }
  async function handleTestSmtp() {
    setSmtpError(''); setSmtpSuccess(''); setIsTestingSmtp(true);
    try {
      const res = await fetch('/api/settings/smtp/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from_email: smtpFromEmail }) });
      const d = await res.json();
      if (!res.ok) { setSmtpError(d.responseMessage || 'Failed'); return; }
      setSmtpSuccess('Connection successful!'); setTimeout(() => setSmtpSuccess(''), 3000);
    } catch { setSmtpError('Failed'); } finally { setIsTestingSmtp(false); }
  }
  async function handleResetSmtp() {
    if (!confirm('Reset SMTP?')) return;
    try { const res = await fetch('/api/settings/smtp', { method: 'DELETE' }); const d = await res.json(); if (res.ok) { setSmtpSettings(d.responseDetails); setSmtpSuccess('Reset'); setTimeout(() => setSmtpSuccess(''), 3000); } } catch { setSmtpError('Failed'); }
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
    if (!notifSettings || !confirm('Hapus alert?')) return;
    await updateNotifSetting('custom_alerts', notifSettings.custom_alerts.filter(a => a.id !== id));
  }
  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const alertTypeLabel = (t: string) => t === 'expense_limit' ? 'Batas Expense' : t === 'income_target' ? 'Target Income' : 'Target Saving';

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-3 sm:p-4 lg:p-8">
        <div className="mb-4"><h2 className="text-xl font-bold text-zinc-900">Settings</h2><p className="text-xs text-zinc-500">Manage your preferences</p></div>
        {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">{error}</div>}
        {success && <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-xl text-xs text-green-600">{success}</div>}
        {isLoading ? <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div> : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1"><h3 className="font-semibold text-zinc-900 text-sm mb-1">AI Recommendation</h3><p className="text-xs text-zinc-500 mb-2">Enable AI-powered investment recommendations.</p><p className="text-xs"><span className="text-zinc-500">Status: </span><span className={`font-medium ${settings?.ai_recommendation_enabled ? 'text-green-600' : 'text-zinc-600'}`}>{settings?.ai_recommendation_enabled ? 'Active' : 'Inactive'}</span></p></div>
                  <button onClick={toggleAI} disabled={isSaving} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings?.ai_recommendation_enabled ? 'bg-blue-600' : 'bg-zinc-200'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${settings?.ai_recommendation_enabled ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-semibold text-zinc-900 text-sm mb-3">Account</h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-zinc-100"><span className="text-xs text-zinc-500">Email</span><span className="text-xs font-medium text-zinc-900 truncate max-w-[150px]">{session?.user?.email}</span></div>
                  <div className="flex justify-between py-1"><span className="text-xs text-zinc-500">User ID</span><span className="text-xs font-mono text-zinc-600">{session?.user?.id}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-zinc-900 text-sm mb-3">Pengaturan Notifikasi</h3>
              {notifError && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{notifError}</div>}
              {notifSuccess && <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-600">{notifSuccess}</div>}
              {!notifSettings ? <p className="text-xs text-zinc-400 text-center py-4">Loading...</p> : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div className="flex-1 mr-3"><p className="text-xs font-medium text-zinc-900">Pengingat Bulanan</p><p className="text-[10px] text-zinc-500">Pengingat mengisi data keuangan</p>
                      <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-500">Tanggal:</span>
                        <select value={notifSettings.monthly_reminder_day} onChange={(e) => updateNotifSetting('monthly_reminder_day', parseInt(e.target.value))} disabled={isSavingNotif || !notifSettings.monthly_reminder} className="px-1.5 py-0.5 text-[10px] border border-zinc-200 rounded bg-white disabled:opacity-50">{Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}</select>
                      </div>
                    </div>
                    <button onClick={() => updateNotifSetting('monthly_reminder', !notifSettings.monthly_reminder)} disabled={isSavingNotif} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notifSettings.monthly_reminder ? 'bg-blue-600' : 'bg-zinc-200'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${notifSettings.monthly_reminder ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div className="mr-3"><p className="text-xs font-medium text-zinc-900">Ringkasan Bulanan</p><p className="text-[10px] text-zinc-500">Ringkasan keuangan akhir bulan</p></div>
                    <button onClick={() => updateNotifSetting('monthly_summary', !notifSettings.monthly_summary)} disabled={isSavingNotif} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notifSettings.monthly_summary ? 'bg-blue-600' : 'bg-zinc-200'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${notifSettings.monthly_summary ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div className="flex-1 mr-3"><p className="text-xs font-medium text-zinc-900">Peringatan Saldo Rendah</p><p className="text-[10px] text-zinc-500">Notifikasi jika cashflow rendah</p>
                      <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-zinc-500">Min:</span><CurrencyInput value={notifSettings.low_balance_threshold.toString()} onChange={(v) => { const num = parseFloat(v.replace(/[^\d]/g, '')) || 0; updateNotifSetting('low_balance_threshold', num); }} placeholder="0" className="w-24 px-1.5 py-0.5 text-[10px] border border-zinc-200 rounded disabled:opacity-50" disabled={isSavingNotif || !notifSettings.low_balance_alert} /></div>
                    </div>
                    <button onClick={() => updateNotifSetting('low_balance_alert', !notifSettings.low_balance_alert)} disabled={isSavingNotif} className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${notifSettings.low_balance_alert ? 'bg-blue-600' : 'bg-zinc-200'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${notifSettings.low_balance_alert ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2"><div><p className="text-xs font-medium text-zinc-900">Alert Kustom</p><p className="text-[10px] text-zinc-500">Notifikasi sesuai kebutuhan</p></div><button onClick={() => setShowCustomAlertForm(!showCustomAlertForm)} className="text-[10px] text-blue-600 hover:underline">{showCustomAlertForm ? 'Batal' : '+ Tambah'}</button></div>
                    {showCustomAlertForm && (<div className="mb-2 p-2 bg-white rounded-lg border border-zinc-200 space-y-2"><input type="text" value={newAlertName} onChange={(e) => setNewAlertName(e.target.value)} placeholder="Nama alert..." className="w-full px-2 py-1 text-[10px] border border-zinc-200 rounded" /><div className="grid grid-cols-2 gap-2"><select value={newAlertType} onChange={(e) => setNewAlertType(e.target.value as typeof newAlertType)} className="px-2 py-1 text-[10px] border border-zinc-200 rounded"><option value="expense_limit">Batas Expense</option><option value="income_target">Target Income</option><option value="savings_goal">Target Saving</option></select><CurrencyInput value={newAlertThreshold} onChange={setNewAlertThreshold} placeholder="Threshold" className="px-2 py-1 text-[10px] border border-zinc-200 rounded" /></div><button onClick={addCustomAlert} disabled={!newAlertName || !newAlertThreshold || isSavingNotif} className="w-full py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700 disabled:opacity-50">Simpan</button></div>)}
                    {notifSettings.custom_alerts.length > 0 ? (<div className="space-y-2">{notifSettings.custom_alerts.map((alert) => (<div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-zinc-200"><div className="flex-1 min-w-0"><p className="text-[10px] font-medium text-zinc-900 truncate">{alert.name}</p><p className="text-[9px] text-zinc-500 truncate">{alertTypeLabel(alert.type)}: {fmt(alert.threshold)}</p></div><div className="flex items-center gap-1.5 ml-2"><button onClick={() => toggleCustomAlert(alert.id)} disabled={isSavingNotif} className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${alert.enabled ? 'bg-blue-600' : 'bg-zinc-200'}`}><span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${alert.enabled ? 'translate-x-3' : 'translate-x-0'}`} /></button><button onClick={() => deleteCustomAlert(alert.id)} className="p-0.5 text-zinc-400 hover:text-red-500"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></div>))}</div>) : !showCustomAlertForm && <p className="text-[10px] text-zinc-400 text-center py-2">Belum ada alert kustom</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-zinc-900 text-sm">SMTP Configuration</h3>{!showSmtpForm && <button onClick={() => setShowSmtpForm(true)} className="text-xs text-blue-600 hover:underline">{smtpSettings ? 'Edit' : 'Configure'}</button>}</div>
              <p className="text-xs text-zinc-500 mb-3">Configure SMTP for email notifications.</p>
              {smtpError && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{smtpError}</div>}
              {smtpSuccess && <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-600">{smtpSuccess}</div>}
              {showSmtpForm ? (
                <form onSubmit={handleSaveSmtp} className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><label className="block text-[10px] font-medium text-zinc-700 mb-1">Host</label><input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required placeholder="smtp.gmail.com" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs" /></div>
                    <div><label className="block text-[10px] font-medium text-zinc-700 mb-1">Port</label><input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} required placeholder="587" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs" /></div>
                    <div><label className="block text-[10px] font-medium text-zinc-700 mb-1">Username</label><input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} required placeholder="email@gmail.com" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs" /></div>
                    <div><label className="block text-[10px] font-medium text-zinc-700 mb-1">Password</label><input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} required placeholder="********" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs" /></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><label className="block text-[10px] font-medium text-zinc-700 mb-1">From Email</label><input type="email" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} required placeholder="noreply@domain.com" className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs" /></div>
                    <div className="flex items-end gap-2"><button type="button" onClick={handleTestSmtp} disabled={isTestingSmtp || !smtpHost || !smtpUser || !smtpPass} className="px-2 py-1.5 bg-zinc-100 text-zinc-700 font-medium rounded-lg text-[10px] hover:bg-zinc-200 disabled:opacity-50">{isTestingSmtp ? '...' : 'Test'}</button><button type="submit" disabled={isSavingSmtp} className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg text-[10px]">{isSavingSmtp ? '...' : 'Save'}</button><button type="button" onClick={() => { setShowSmtpForm(false); setSmtpPass(''); }} className="px-2 py-1.5 bg-zinc-100 text-zinc-700 font-medium rounded-lg text-[10px] hover:bg-zinc-200">Cancel</button></div>
                  </div>
                </form>
              ) : smtpSettings ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-zinc-50 rounded-lg p-2"><p className="text-[10px] text-zinc-500 mb-0.5">Host</p><p className="text-xs font-medium text-zinc-900 truncate">{smtpSettings.host}</p></div>
                  <div className="bg-zinc-50 rounded-lg p-2"><p className="text-[10px] text-zinc-500 mb-0.5">Port</p><p className="text-xs font-medium text-zinc-900">{smtpSettings.port}</p></div>
                  <div className="bg-zinc-50 rounded-lg p-2"><p className="text-[10px] text-zinc-500 mb-0.5">User</p><p className="text-xs font-medium text-zinc-900 truncate">{smtpSettings.user}</p></div>
                  <div className="bg-zinc-50 rounded-lg p-2"><p className="text-[10px] text-zinc-500 mb-0.5">Source</p><span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${smtpSettings.source === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-zinc-200 text-zinc-600'}`}>{smtpSettings.source === 'user' ? 'Custom' : 'Env'}</span>{smtpSettings.source === 'user' && <button onClick={handleResetSmtp} className="text-[10px] text-red-500 hover:underline ml-1">Reset</button>}</div>
                </div>
              ) : <p className="text-center py-3 text-zinc-500 text-xs">No SMTP configuration found.</p>}
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-red-200">
              <div className="flex items-center justify-between"><div><h3 className="font-semibold text-zinc-900 text-sm mb-1">Session</h3><p className="text-xs text-zinc-500">Sign out from your account.</p></div><button onClick={() => signOut({ callbackUrl: '/login' })} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs">Sign Out</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

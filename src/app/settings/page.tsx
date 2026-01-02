'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface UserSettings {
  ai_recommendation_enabled: boolean;
}

interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  pass_masked: string;
  from_email: string;
  source: 'user' | 'env' | 'none';
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [smtpError, setSmtpError] = useState('');
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchSmtpSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.responseDetails);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSmtpSettings() {
    try {
      const response = await fetch('/api/settings/smtp');
      if (response.ok) {
        const data = await response.json();
        setSmtpSettings(data.responseDetails);
        if (data.responseDetails) {
          setSmtpHost(data.responseDetails.host);
          setSmtpPort(data.responseDetails.port);
          setSmtpUser(data.responseDetails.user);
          setSmtpFromEmail(data.responseDetails.from_email);
        }
      }
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
    }
  }

  async function toggleAIRecommendation() {
    if (!settings) return;
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/ai-recommendation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !settings.ai_recommendation_enabled }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.responseMessage || 'Failed to update setting');
        return;
      }
      setSettings(data.responseDetails);
      setSuccess('Setting updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveSmtp(e: React.FormEvent) {
    e.preventDefault();
    setSmtpError('');
    setSmtpSuccess('');
    setIsSavingSmtp(true);
    try {
      const response = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from_email: smtpFromEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSmtpError(data.responseMessage || 'Failed to save SMTP settings');
        return;
      }
      setSmtpSettings(data.responseDetails);
      setSmtpSuccess('SMTP settings saved successfully');
      setShowSmtpForm(false);
      setSmtpPass('');
      setTimeout(() => setSmtpSuccess(''), 3000);
    } catch {
      setSmtpError('An unexpected error occurred');
    } finally {
      setIsSavingSmtp(false);
    }
  }

  async function handleTestSmtp() {
    setSmtpError('');
    setSmtpSuccess('');
    setIsTestingSmtp(true);
    try {
      const response = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, from_email: smtpFromEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSmtpError(data.responseMessage || 'SMTP connection test failed');
        return;
      }
      setSmtpSuccess('SMTP connection successful!');
      setTimeout(() => setSmtpSuccess(''), 3000);
    } catch {
      setSmtpError('Failed to test SMTP connection');
    } finally {
      setIsTestingSmtp(false);
    }
  }

  async function handleResetSmtp() {
    if (!confirm('Reset SMTP settings to environment variables?')) return;
    try {
      const response = await fetch('/api/settings/smtp', { method: 'DELETE' });
      const data = await response.json();
      if (response.ok) {
        setSmtpSettings(data.responseDetails);
        setSmtpSuccess('SMTP settings reset to environment variables');
        setTimeout(() => setSmtpSuccess(''), 3000);
      }
    } catch {
      setSmtpError('Failed to reset SMTP settings');
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <nav className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Finance Tracker</h1>
              <div className="hidden md:ml-8 md:flex md:space-x-4">
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Dashboard</Link>
                <Link href="/cashflow" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cashflow</Link>
                <Link href="/investments" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Investments</Link>
                <Link href="/analytics" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Analytics</Link>
                <Link href="/settings" className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Settings</Link>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-400">{session?.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Sign out</button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-600 dark:text-zinc-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-700 py-2">
            <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Dashboard</Link>
            <Link href="/cashflow" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cashflow</Link>
            <Link href="/investments" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Investments</Link>
            <Link href="/analytics" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Analytics</Link>
            <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Settings</Link>
          </div>
        )}
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Settings</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">Manage your preferences and account settings</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}
        {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"><p className="text-sm text-green-600 dark:text-green-400">{success}</p></div>}

        {isLoading ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading...</div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* AI Recommendation */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">AI Investment Recommendation</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Aktifkan fitur rekomendasi investasi berbasis AI.</p>
                </div>
                <button onClick={toggleAIRecommendation} disabled={isSaving} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings?.ai_recommendation_enabled ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-600'} ${isSaving ? 'opacity-50' : ''}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${settings?.ai_recommendation_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs sm:text-sm"><span className="text-zinc-500 dark:text-zinc-400">Status: </span><span className={`font-medium ${settings?.ai_recommendation_enabled ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'}`}>{settings?.ai_recommendation_enabled ? 'Aktif' : 'Nonaktif'}</span></p>
              </div>
            </div>

            {/* SMTP Settings */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">SMTP Configuration</h3>
                </div>
                {!showSmtpForm && <button onClick={() => setShowSmtpForm(true)} className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">{smtpSettings ? 'Edit' : 'Configure'}</button>}
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-4">Konfigurasi SMTP untuk email notifikasi.</p>

              {smtpError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-sm text-red-600 dark:text-red-400">{smtpError}</p></div>}
              {smtpSuccess && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"><p className="text-sm text-green-600 dark:text-green-400">{smtpSuccess}</p></div>}

              {showSmtpForm ? (
                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">SMTP Host</label>
                      <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} required placeholder="smtp.gmail.com" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Port</label>
                      <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} required placeholder="587" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Username/Email</label>
                    <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} required placeholder="your-email@gmail.com" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password/App Password</label>
                    <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} required placeholder="••••••••" className={inputClass} />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Untuk Gmail, gunakan App Password</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">From Email</label>
                    <input type="email" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} required placeholder="noreply@yourdomain.com" className={inputClass} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button type="button" onClick={handleTestSmtp} disabled={isTestingSmtp || !smtpHost || !smtpPort || !smtpUser || !smtpPass} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 text-sm">
                      {isTestingSmtp ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button type="submit" disabled={isSavingSmtp} className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm">
                      {isSavingSmtp ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={() => { setShowSmtpForm(false); setSmtpPass(''); }} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors hover:bg-zinc-300 dark:hover:bg-zinc-600 text-sm">Cancel</button>
                  </div>
                </form>
              ) : smtpSettings ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Host</span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">{smtpSettings.host}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Port</span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white">{smtpSettings.port}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">User</span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{smtpSettings.user}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700">
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">From</span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{smtpSettings.from_email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Source</span>
                    <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded ${smtpSettings.source === 'user' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}>
                      {smtpSettings.source === 'user' ? 'Custom' : 'Environment'}
                    </span>
                  </div>
                  {smtpSettings.source === 'user' && (
                    <button onClick={handleResetSmtp} className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 mt-2">Reset to Environment Variables</button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-zinc-500 dark:text-zinc-400 text-sm">
                  <p>No SMTP configuration found.</p>
                </div>
              )}
            </div>

            {/* Account Info */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center mb-4">
                <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Account Information</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-700">
                  <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Email</span>
                  <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none">{session?.user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">User ID</span>
                  <span className="text-xs sm:text-sm font-mono text-zinc-600 dark:text-zinc-400 truncate max-w-[100px] sm:max-w-none">{session?.user?.id}</span>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6 border border-red-200 dark:border-red-800">
              <div className="flex items-center mb-4">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Session</h3>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-4">Sign out from your account on this device.</p>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm">Sign Out</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

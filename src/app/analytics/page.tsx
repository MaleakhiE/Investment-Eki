'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface AllocationRecommendation {
  gold_percentage: number;
  mutual_fund_percentage: number;
  investable_amount: number;
  reasoning: string;
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  should_invest: boolean;
  warnings: string[];
}

interface UserSettings {
  ai_recommendation_enabled: boolean;
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [recommendation, setRecommendation] = useState<AllocationRecommendation | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData.responseDetails);
          if (settingsData.responseDetails?.ai_recommendation_enabled) {
            const recRes = await fetch('/api/analytics/recommendation');
            if (recRes.ok) {
              const recData = await recRes.json();
              setRecommendation(recData.responseDetails);
            } else {
              const recData = await recRes.json();
              setError(recData.responseMessage || 'Failed to load recommendation');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const getRiskProfileLabel = (profile: string) => {
    switch (profile) {
      case 'conservative': return 'Konservatif';
      case 'moderate': return 'Moderat';
      case 'aggressive': return 'Agresif';
      default: return profile;
    }
  };

  const getRiskProfileColor = (profile: string) => {
    switch (profile) {
      case 'conservative': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'moderate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'aggressive': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300';
    }
  };

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
                <Link href="/analytics" className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Analytics</Link>
                <Link href="/settings" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Settings</Link>
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
            <Link href="/analytics" className="block px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Analytics</Link>
            <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Settings</Link>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Analytics & AI Recommendation</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">Rekomendasi alokasi investasi berdasarkan analisis keuangan Anda</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-6">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        ) : !settings?.ai_recommendation_enabled ? (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2">AI Recommendation Disabled</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Fitur rekomendasi AI dinonaktifkan. Aktifkan di halaman pengaturan.</p>
            <Link href="/settings" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm">Buka Pengaturan</Link>
          </div>
        ) : recommendation ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Warnings */}
            {recommendation.warnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1 text-sm">Perhatian</h4>
                    <ul className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 space-y-1">
                      {recommendation.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Main Recommendation */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Rekomendasi Alokasi Investasi</h3>
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start ${getRiskProfileColor(recommendation.risk_profile)}`}>
                  Profil {getRiskProfileLabel(recommendation.risk_profile)}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Pie Chart */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40 sm:w-48 sm:h-48 mb-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#EAB308" strokeWidth="20" strokeDasharray={`${recommendation.gold_percentage * 2.51} 251`} strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3B82F6" strokeWidth="20" strokeDasharray={`${recommendation.mutual_fund_percentage * 2.51} 251`} strokeDashoffset={`${-recommendation.gold_percentage * 2.51}`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{recommendation.should_invest ? '100%' : '0%'}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{recommendation.should_invest ? 'Alokasi' : 'Investasi'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-yellow-500 mr-2"></div>
                      <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Emas {recommendation.gold_percentage}%</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-blue-500 mr-2"></div>
                      <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Reksa Dana {recommendation.mutual_fund_percentage}%</span>
                    </div>
                  </div>
                </div>

                {/* Allocation Details */}
                <div className="space-y-4">
                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                        <span className="font-medium text-zinc-900 dark:text-white text-sm">Emas (Gold)</span>
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{recommendation.gold_percentage}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-600 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${recommendation.gold_percentage}%` }}></div>
                    </div>
                    {recommendation.should_invest && recommendation.investable_amount > 0 && (
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">Saran: {formatCurrency(recommendation.investable_amount * recommendation.gold_percentage / 100)}</p>
                    )}
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span className="font-medium text-zinc-900 dark:text-white text-sm">Reksa Dana</span>
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{recommendation.mutual_fund_percentage}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-600 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${recommendation.mutual_fund_percentage}%` }}></div>
                    </div>
                    {recommendation.should_invest && recommendation.investable_amount > 0 && (
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2">Saran: {formatCurrency(recommendation.investable_amount * recommendation.mutual_fund_percentage / 100)}</p>
                    )}
                  </div>

                  {recommendation.should_invest && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 mb-1">Jumlah yang dapat diinvestasikan</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(recommendation.investable_amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reasoning */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-4">Penjelasan Rekomendasi</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">{recommendation.reasoning}</p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/investments" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm">Kelola Investasi</Link>
              <Link href="/cashflow" className="inline-flex items-center justify-center px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium rounded-lg transition-colors text-sm">Update Cashflow</Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 sm:p-8 text-center">
            <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2">Tidak ada data</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Tambahkan data cashflow dan investasi untuk mendapatkan rekomendasi.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link href="/cashflow" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm">Tambah Cashflow</Link>
              <Link href="/investments" className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium rounded-lg transition-colors text-sm">Tambah Investasi</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

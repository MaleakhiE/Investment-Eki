'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';

interface Recommendation {
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
  useSession();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
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
              setError(recData.responseMessage || 'Failed to load');
            }
          }
        }
      } catch { setError('Failed to load'); } finally { setIsLoading(false); }
    }
    fetchData();
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const getRiskLabel = (p: string) => ({ conservative: 'Konservatif', moderate: 'Moderat', aggressive: 'Agresif' }[p] || p);
  const getRiskColor = (p: string) => ({ conservative: 'bg-green-100 text-green-700', moderate: 'bg-blue-100 text-blue-700', aggressive: 'bg-orange-100 text-orange-700' }[p] || 'bg-zinc-100 text-zinc-700');

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Analytics</h2>
          <p className="text-sm text-zinc-500">AI-powered investment recommendations</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6"><p className="text-red-600 text-sm">{error}</p></div>
        ) : !settings?.ai_recommendation_enabled ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            </div>
            <h3 className="font-semibold text-zinc-900 mb-2">AI Recommendation Disabled</h3>
            <p className="text-zinc-500 text-sm mb-6">Enable AI recommendations in settings.</p>
            <Link href="/settings" className="inline-flex px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm">Open Settings</Link>
          </div>
        ) : recommendation ? (
          <div className="space-y-6">
            {/* Warnings */}
            {recommendation.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <div>
                    <h4 className="font-medium text-amber-800 text-sm mb-1">Attention</h4>
                    <ul className="text-sm text-amber-700 space-y-1">{recommendation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </div>
                </div>
              </div>
            )}

            {/* Row 1: Summary Cards - 3 equal columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-sm text-zinc-500 mb-1">Risk Profile</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(recommendation.risk_profile)}`}>{getRiskLabel(recommendation.risk_profile)}</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-sm text-zinc-500 mb-1">Should Invest</p>
                <p className={`text-2xl font-bold ${recommendation.should_invest ? 'text-green-600' : 'text-red-500'}`}>{recommendation.should_invest ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-sm text-zinc-500 mb-1">Investable Amount</p>
                <p className="text-2xl font-bold text-zinc-900">{formatCurrency(recommendation.investable_amount)}</p>
              </div>
            </div>

            {/* Row 2: Allocation - 2 equal columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-zinc-900 mb-4">Investment Allocation</h3>
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40 mb-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F59E0B" strokeWidth="20" strokeDasharray={`${recommendation.gold_percentage * 2.51} 251`} />
                      <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3B82F6" strokeWidth="20" strokeDasharray={`${recommendation.mutual_fund_percentage * 2.51} 251`} strokeDashoffset={`${-recommendation.gold_percentage * 2.51}`} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl font-bold text-zinc-900">100%</p>
                        <p className="text-xs text-zinc-500">Total</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400"></div><span className="text-sm text-zinc-600">Gold {recommendation.gold_percentage}%</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500"></div><span className="text-sm text-zinc-600">Mutual Fund {recommendation.mutual_fund_percentage}%</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-zinc-900 mb-4">Suggested Investment</h3>
                <div className="space-y-4">
                  <div className="bg-amber-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400"></div><span className="font-medium text-zinc-900 text-sm">Gold</span></div>
                      <span className="text-xl font-bold text-zinc-900">{recommendation.gold_percentage}%</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2 mb-2"><div className="bg-amber-400 h-2 rounded-full" style={{ width: `${recommendation.gold_percentage}%` }}></div></div>
                    <p className="text-sm text-amber-700">Suggested: {formatCurrency(recommendation.investable_amount * recommendation.gold_percentage / 100)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="font-medium text-zinc-900 text-sm">Mutual Fund</span></div>
                      <span className="text-xl font-bold text-zinc-900">{recommendation.mutual_fund_percentage}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${recommendation.mutual_fund_percentage}%` }}></div></div>
                    <p className="text-sm text-blue-700">Suggested: {formatCurrency(recommendation.investable_amount * recommendation.mutual_fund_percentage / 100)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Reasoning - Full width */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Explanation</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{recommendation.reasoning}</p>
            </div>

            {/* Row 4: Actions - 2 equal columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/investments" className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Manage Investments
              </Link>
              <Link href="/cashflow" className="flex items-center justify-center gap-2 p-4 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium rounded-xl text-sm transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Update Cashflow
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h3 className="font-semibold text-zinc-900 mb-2">No Data</h3>
            <p className="text-zinc-500 text-sm mb-6">Add cashflow and investment data to get recommendations.</p>
            <div className="flex justify-center gap-3">
              <Link href="/cashflow" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm">Add Cashflow</Link>
              <Link href="/investments" className="px-4 py-2 border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium rounded-xl text-sm">Add Investment</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

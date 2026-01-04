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

interface UserSettings { ai_recommendation_enabled: boolean; }
interface CashflowTrend { month: string; income: number; expense: number; net_cashflow: number; }
interface PortfolioSummary { total_invested: number; total_current_value: number; total_gain_loss: number; }
interface InvestmentComparison { gold: PortfolioSummary; mutual_fund: PortfolioSummary; }

export default function AnalyticsPage() {
  useSession();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [trend, setTrend] = useState<CashflowTrend[]>([]);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'investment'>('overview');

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, trendRes, compRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/analytics/cashflow-trend'),
          fetch('/api/analytics/comparison'),
        ]);
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData.responseDetails);
          if (settingsData.responseDetails?.ai_recommendation_enabled) {
            const recRes = await fetch('/api/analytics/recommendation');
            if (recRes.ok) { const recData = await recRes.json(); setRecommendation(recData.responseDetails); }
            else { const recData = await recRes.json(); setError(recData.responseMessage || 'Failed'); }
          }
        }
        if (trendRes.ok) { const d = await trendRes.json(); setTrend(d.responseDetails || []); }
        if (compRes.ok) { const d = await compRes.json(); setComparison(d.responseDetails); }
      } catch { setError('Failed to load'); } finally { setIsLoading(false); }
    }
    fetchData();
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const formatCompact = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const safe = (v: number | null | undefined) => (v === undefined || v === null || isNaN(v)) ? 0 : v;
  const getRiskLabel = (p: string) => ({ conservative: 'Konservatif', moderate: 'Moderat', aggressive: 'Agresif' }[p] || p);
  const getRiskColor = (p: string) => ({ conservative: 'bg-green-100 text-green-700', moderate: 'bg-blue-100 text-blue-700', aggressive: 'bg-orange-100 text-orange-700' }[p] || 'bg-zinc-100 text-zinc-700');

  // Calculations
  const totalIncome = trend.reduce((s, t) => s + safe(t.income), 0);
  const totalExpense = trend.reduce((s, t) => s + safe(t.expense), 0);
  const avgIncome = trend.length > 0 ? totalIncome / trend.length : 0;
  const avgExpense = trend.length > 0 ? totalExpense / trend.length : 0;
  const avgSavings = avgIncome - avgExpense;
  const avgSavingsRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;
  const trendMax = Math.max(...trend.map(t => Math.max(safe(t.income), safe(t.expense))), 1);
  const goldVal = safe(comparison?.gold?.total_current_value);
  const goldInvested = safe(comparison?.gold?.total_invested);
  const goldGain = safe(comparison?.gold?.total_gain_loss);
  const mfVal = safe(comparison?.mutual_fund?.total_current_value);
  const mfInvested = safe(comparison?.mutual_fund?.total_invested);
  const mfGain = safe(comparison?.mutual_fund?.total_gain_loss);
  const totalPortfolio = goldVal + mfVal;
  const totalInvested = goldInvested + mfInvested;
  const totalGain = goldGain + mfGain;
  const totalReturn = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Analytics</h2>
          <p className="text-sm text-zinc-600">Insights & AI recommendations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
          {(['overview', 'cashflow', 'investment'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
              {tab === 'overview' ? 'Overview' : tab === 'cashflow' ? 'Cashflow' : 'Investment'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div>
        ) : error && !recommendation ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6"><p className="text-red-600 text-sm">{error}</p></div>
        ) : (
          <div className="space-y-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Monthly Income</p>
                    <p className="text-xl font-bold text-green-600">{formatCompact(avgIncome)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Monthly Expense</p>
                    <p className="text-xl font-bold text-red-500">{formatCompact(avgExpense)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Savings Rate</p>
                    <p className={`text-xl font-bold ${avgSavingsRate >= 20 ? 'text-green-600' : avgSavingsRate > 0 ? 'text-amber-600' : 'text-red-500'}`}>{avgSavingsRate.toFixed(0)}%</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Portfolio Return</p>
                    <p className={`text-xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>{totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%</p>
                  </div>
                </div>

                {/* AI Recommendation */}
                {!settings?.ai_recommendation_enabled ? (
                  <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-zinc-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <h3 className="font-semibold text-zinc-900 mb-1 text-sm">AI Recommendation Disabled</h3>
                    <p className="text-zinc-600 text-xs mb-3">Enable for personalized investment advice</p>
                    <Link href="/settings" className="text-xs text-blue-600 hover:underline">Enable in Settings</Link>
                  </div>
                ) : recommendation ? (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-5 border border-blue-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">🤖 AI Recommendation</h3>
                        <p className="text-xs text-zinc-600 mt-0.5">Based on your financial data</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRiskColor(recommendation.risk_profile)}`}>{getRiskLabel(recommendation.risk_profile)}</span>
                    </div>
                    {recommendation.warnings.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                        <p className="text-xs text-amber-700">{recommendation.warnings[0]}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-zinc-600">Investable</p>
                        <p className="text-lg font-bold text-zinc-900">{formatCompact(recommendation.investable_amount)}</p>
                      </div>
                      <div className="bg-amber-100/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-amber-700">Gold</p>
                        <p className="text-lg font-bold text-amber-700">{recommendation.gold_percentage}%</p>
                      </div>
                      <div className="bg-blue-100/60 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-700">Mutual Fund</p>
                        <p className="text-lg font-bold text-blue-700">{recommendation.mutual_fund_percentage}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed">{recommendation.reasoning}</p>
                  </div>
                ) : null}
              </>
            )}

            {/* Cashflow Tab */}
            {activeTab === 'cashflow' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Trend Chart */}
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h3 className="font-semibold text-zinc-900 text-sm mb-4">Monthly Trend</h3>
                    {trend.length > 0 ? (
                      <>
                        <div className="flex items-end gap-1 h-40">
                          {trend.map((t, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <div className="w-full flex gap-0.5 items-end justify-center h-32">
                                <div className="w-3 bg-green-400 rounded-t transition-all" style={{ height: `${Math.max((safe(t.income) / trendMax) * 100, t.income > 0 ? 8 : 0)}%` }}></div>
                                <div className="w-3 bg-red-400 rounded-t transition-all" style={{ height: `${Math.max((safe(t.expense) / trendMax) * 100, t.expense > 0 ? 8 : 0)}%` }}></div>
                              </div>
                              <p className="text-[10px] text-zinc-600 mt-1">{new Date(t.month + '-01').toLocaleDateString('id-ID', { month: 'short' })}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-center gap-4 mt-3 text-xs">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400"></span>Income</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400"></span>Expense</span>
                        </div>
                      </>
                    ) : <p className="text-xs text-zinc-500 text-center py-8">No data</p>}
                  </div>

                  {/* Net Cashflow Trend */}
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h3 className="font-semibold text-zinc-900 text-sm mb-4">Net Cashflow Trend</h3>
                    {trend.length > 0 ? (
                      <div className="space-y-2">
                        {trend.slice(-6).map((t, i) => {
                          const netMax = Math.max(...trend.map(x => Math.abs(safe(x.net_cashflow))), 1);
                          const pct = (Math.abs(safe(t.net_cashflow)) / netMax) * 100;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-zinc-600 w-12">{new Date(t.month + '-01').toLocaleDateString('id-ID', { month: 'short' })}</span>
                              <div className="flex-1 h-4 bg-zinc-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${safe(t.net_cashflow) >= 0 ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className={`text-xs font-medium w-16 text-right ${safe(t.net_cashflow) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCompact(safe(t.net_cashflow))}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-xs text-zinc-500 text-center py-8">No data</p>}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Total Income ({trend.length}mo)</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Total Expense ({trend.length}mo)</p>
                    <p className="text-lg font-bold text-red-500">{formatCurrency(totalExpense)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Total Savings</p>
                    <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(totalIncome - totalExpense)}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Monthly Savings</p>
                    <p className={`text-lg font-bold ${avgSavings >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(avgSavings)}</p>
                  </div>
                </div>
              </>
            )}

            {/* Investment Tab */}
            {activeTab === 'investment' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Portfolio Summary */}
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h3 className="font-semibold text-zinc-900 text-sm mb-3">Portfolio Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-zinc-600">Total Value</p>
                        <p className="text-2xl font-bold text-zinc-900">{formatCurrency(totalPortfolio)}</p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-zinc-600">Invested</p>
                          <p className="text-sm font-semibold text-zinc-700">{formatCurrency(totalInvested)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600">Gain/Loss</p>
                          <p className={`text-sm font-semibold ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>{totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gold */}
                  <div className="bg-amber-50 rounded-xl shadow-sm p-5 border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🪙</span>
                      <h3 className="font-semibold text-amber-900 text-sm">Gold</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-amber-700">Current Value</p>
                        <p className="text-xl font-bold text-amber-900">{formatCurrency(goldVal)}</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div><span className="text-amber-700">Invested:</span> <span className="font-medium text-amber-900">{formatCompact(goldInvested)}</span></div>
                        <div><span className="text-amber-700">Return:</span> <span className={`font-medium ${goldGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>{goldInvested > 0 ? ((goldGain / goldInvested) * 100).toFixed(1) : 0}%</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Mutual Fund */}
                  <div className="bg-blue-50 rounded-xl shadow-sm p-5 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">📊</span>
                      <h3 className="font-semibold text-blue-900 text-sm">Mutual Fund</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-blue-700">Current Value</p>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(mfVal)}</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div><span className="text-blue-700">Invested:</span> <span className="font-medium text-blue-900">{formatCompact(mfInvested)}</span></div>
                        <div><span className="text-blue-700">Return:</span> <span className={`font-medium ${mfGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>{mfInvested > 0 ? ((mfGain / mfInvested) * 100).toFixed(1) : 0}%</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allocation Chart */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <h3 className="font-semibold text-zinc-900 text-sm mb-4">Asset Allocation</h3>
                  {totalPortfolio > 0 ? (
                    <div className="flex items-center gap-6">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F59E0B" strokeWidth="20" strokeDasharray={`${(goldVal / totalPortfolio) * 251} 251`} />
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3B82F6" strokeWidth="20" strokeDasharray={`${(mfVal / totalPortfolio) * 251} 251`} strokeDashoffset={`${-(goldVal / totalPortfolio) * 251}`} />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-zinc-700"><span className="w-3 h-3 rounded bg-amber-400"></span>Gold</span>
                          <span className="text-sm font-bold text-zinc-900">{((goldVal / totalPortfolio) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-zinc-700"><span className="w-3 h-3 rounded bg-blue-500"></span>Mutual Fund</span>
                          <span className="text-sm font-bold text-zinc-900">{((mfVal / totalPortfolio) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-xs text-zinc-500 text-center py-8">No investment data</p>}
                </div>
              </>
            )}

            {/* Actions */}
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
        )}
      </main>
    </div>
  );
}

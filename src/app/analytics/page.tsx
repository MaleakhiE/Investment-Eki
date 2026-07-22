'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { useFeedback } from '@/components/providers/FeedbackProvider';

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
  const { showFeedback } = useFeedback();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [trend, setTrend] = useState<CashflowTrend[]>([]);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRecommendation, setIsRefreshingRecommendation] = useState(false);
  const [error, setError] = useState('');
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

  async function refreshRecommendation() {
    setIsRefreshingRecommendation(true);
    try {
      const response = await fetch('/api/analytics/recommendation', { cache: 'no-store' });
      let body: { responseMessage?: string; responseDetails?: Recommendation | null } = {};
      try {
        body = await response.json();
      } catch { /* A malformed response is handled as an action failure below. */ }
      if (!response.ok || !body.responseDetails) {
        void showFeedback({
          tone: 'error',
          title: 'Recommendation not refreshed',
          message: body.responseMessage || 'The AI recommendation could not be generated. Please try again.',
        });
        return;
      }
      setRecommendation(body.responseDetails);
      setError('');
      void showFeedback({
        tone: 'success',
        title: 'Recommendation refreshed',
        message: 'Your recommendation has been recalculated using the latest financial data.',
      });
    } catch {
      void showFeedback({
        tone: 'error',
        title: 'Recommendation not refreshed',
        message: 'The AI recommendation could not be generated. Check your connection and try again.',
      });
    } finally {
      setIsRefreshingRecommendation(false);
    }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const formatCompact = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const safe = (v: number | null | undefined) => (v === undefined || v === null || isNaN(v)) ? 0 : v;
  const getRiskLabel = (p: string) => ({ conservative: 'Konservatif', moderate: 'Moderat', aggressive: 'Agresif' }[p] || p);
  const getRiskColor = (p: string) => ({ conservative: 'bg-green-500/20 text-green-400', moderate: 'bg-blue-500/20 text-blue-400', aggressive: 'bg-orange-500/20 text-orange-400' }[p] || 'bg-[#e9f5f2] text-zinc-300');

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
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page analytics-page lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#16332f]">Analytics</h2>
          <p className="text-sm text-zinc-600">Insights & AI recommendations</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
          {(['overview', 'cashflow', 'investment'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-[#00d4aa] text-[#16332f]' : 'text-zinc-600 hover:bg-[#e9f5f2]'}`}>
              {tab === 'overview' ? 'Overview' : tab === 'cashflow' ? 'Cashflow' : 'Investment'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div>
        ) : error && !recommendation ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-6">
            <p className="text-red-400 text-sm">{error}</p>
            {settings?.ai_recommendation_enabled && (
              <button type="button" onClick={() => { void refreshRecommendation(); }} disabled={isRefreshingRecommendation} className="mt-3 rounded-lg bg-[#16332f] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {isRefreshingRecommendation ? 'Refreshing...' : 'Retry recommendation'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Monthly Income</p>
                    <p className="text-xl font-bold text-green-400">{formatCompact(avgIncome)}</p>
                  </div>
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Monthly Expense</p>
                    <p className="text-xl font-bold text-red-400">{formatCompact(avgExpense)}</p>
                  </div>
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Savings Rate</p>
                    <p className={`text-xl font-bold ${avgSavingsRate >= 20 ? 'text-green-400' : avgSavingsRate > 0 ? 'text-amber-400' : 'text-red-400'}`}>{avgSavingsRate.toFixed(0)}%</p>
                  </div>
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Portfolio Return</p>
                    <p className={`text-xl font-bold ${totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%</p>
                  </div>
                </div>

                {/* AI Recommendation */}
                {!settings?.ai_recommendation_enabled ? (
                  <div className="card rounded-xl p-6 text-center">
                    <h3 className="font-semibold text-[#16332f] mb-1 text-sm">AI Recommendation Disabled</h3>
                    <p className="text-zinc-600 text-xs mb-3">Enable for personalized investment advice</p>
                    <Link href="/settings" className="text-xs text-[#00d4aa] hover:underline">Enable in Settings</Link>
                  </div>
                ) : recommendation ? (
                  <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl shadow-sm p-5 border border-blue-500/20">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-[#16332f] text-sm">AI Recommendation</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Based on your financial data</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => { void refreshRecommendation(); }} disabled={isRefreshingRecommendation} className="rounded-lg border border-blue-500/30 px-2 py-1 text-[10px] font-semibold text-blue-500 hover:bg-blue-500/10 disabled:opacity-50">
                          {isRefreshingRecommendation ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRiskColor(recommendation.risk_profile)}`}>{getRiskLabel(recommendation.risk_profile)}</span>
                      </div>
                    </div>
                    {recommendation.warnings.length > 0 && (
                      <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 mb-3">
                        <p className="text-xs text-amber-400">{recommendation.warnings[0]}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-[#f5fbf9] rounded-lg p-3 text-center">
                        <p className="text-xs text-zinc-500">Investable</p>
                        <p className="text-lg font-bold text-[#16332f]">{formatCompact(recommendation.investable_amount)}</p>
                      </div>
                      <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                        <p className="text-xs text-amber-400">Gold</p>
                        <p className="text-lg font-bold text-amber-400">{recommendation.gold_percentage}%</p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-400">Mutual Fund</p>
                        <p className="text-lg font-bold text-blue-400">{recommendation.mutual_fund_percentage}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{recommendation.reasoning}</p>
                  </div>
                ) : null}
              </>
            )}

            {/* Cashflow Tab */}
            {activeTab === 'cashflow' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Trend Chart */}
                  <div className="card rounded-xl p-5">
                    <h3 className="font-semibold text-[#16332f] text-sm mb-4">Monthly Trend</h3>
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
                  <div className="card rounded-xl p-5">
                    <h3 className="font-semibold text-[#16332f] text-sm mb-4">Net Cashflow Trend</h3>
                    {trend.length > 0 ? (
                      <div className="space-y-2">
                        {trend.slice(-6).map((t, i) => {
                          const netMax = Math.max(...trend.map(x => Math.abs(safe(x.net_cashflow))), 1);
                          const pct = (Math.abs(safe(t.net_cashflow)) / netMax) * 100;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-zinc-600 w-12">{new Date(t.month + '-01').toLocaleDateString('id-ID', { month: 'short' })}</span>
                              <div className="flex-1 h-4 bg-[#e9f5f2] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${safe(t.net_cashflow) >= 0 ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }}></div>
                              </div>
                              <span className={`text-xs font-medium w-16 text-right ${safe(t.net_cashflow) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCompact(safe(t.net_cashflow))}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-xs text-zinc-500 text-center py-8">No data</p>}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Total Income ({trend.length}mo)</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(totalIncome)}</p>
                  </div>
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Total Expense ({trend.length}mo)</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(totalExpense)}</p>
                  </div>
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Total Savings</p>
                    <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totalIncome - totalExpense)}</p>
                  </div>
                  <div className="card rounded-xl p-4">
                    <p className="text-xs text-zinc-600 mb-1">Avg Monthly Savings</p>
                    <p className={`text-lg font-bold ${avgSavings >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(avgSavings)}</p>
                  </div>
                </div>
              </>
            )}

            {/* Investment Tab */}
            {activeTab === 'investment' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Portfolio Summary */}
                  <div className="card rounded-xl p-5">
                    <h3 className="font-semibold text-[#16332f] text-sm mb-3">Portfolio Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-zinc-600">Total Value</p>
                        <p className="text-2xl font-bold text-[#16332f]">{formatCurrency(totalPortfolio)}</p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-xs text-zinc-600">Invested</p>
                          <p className="text-sm font-semibold text-zinc-300">{formatCurrency(totalInvested)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-600">Gain/Loss</p>
                          <p className={`text-sm font-semibold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gold */}
                  <div className="bg-amber-500/10 rounded-xl shadow-sm p-5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold text-amber-400 text-sm">Gold</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-amber-400/70">Current Value</p>
                        <p className="text-xl font-bold text-amber-400">{formatCurrency(goldVal)}</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div><span className="text-amber-400/70">Invested:</span> <span className="font-medium text-amber-400">{formatCompact(goldInvested)}</span></div>
                        <div><span className="text-amber-400/70">Return:</span> <span className={`font-medium ${goldGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{goldInvested > 0 ? ((goldGain / goldInvested) * 100).toFixed(1) : 0}%</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Mutual Fund */}
                  <div className="bg-blue-500/10 rounded-xl shadow-sm p-5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-semibold text-blue-400 text-sm">Mutual Fund</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-blue-400/70">Current Value</p>
                        <p className="text-xl font-bold text-blue-400">{formatCurrency(mfVal)}</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div><span className="text-blue-400/70">Invested:</span> <span className="font-medium text-blue-400">{formatCompact(mfInvested)}</span></div>
                        <div><span className="text-blue-400/70">Return:</span> <span className={`font-medium ${mfGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>{mfInvested > 0 ? ((mfGain / mfInvested) * 100).toFixed(1) : 0}%</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Allocation Chart */}
                <div className="card rounded-xl p-5">
                  <h3 className="font-semibold text-[#16332f] text-sm mb-4">Asset Allocation</h3>
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
                          <span className="flex items-center gap-2 text-sm text-zinc-300"><span className="w-3 h-3 rounded bg-amber-400"></span>Gold</span>
                          <span className="text-sm font-bold text-[#16332f]">{((goldVal / totalPortfolio) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm text-zinc-300"><span className="w-3 h-3 rounded bg-blue-500"></span>Mutual Fund</span>
                          <span className="text-sm font-bold text-[#16332f]">{((mfVal / totalPortfolio) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-xs text-zinc-500 text-center py-8">No investment data</p>}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/investments" className="flex items-center justify-center gap-2 p-4 bg-[#00d4aa] hover:bg-[#00a88a] text-[#16332f] font-medium rounded-xl text-sm transition-colors">
                Manage Investments
              </Link>
              <Link href="/cashflow" className="flex items-center justify-center gap-2 p-4 border border-[#dcece8] text-zinc-300 hover:bg-[#f5fbf9] font-medium rounded-xl text-sm transition-colors">
                Update Cashflow
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

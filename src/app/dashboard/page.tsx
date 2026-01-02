'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';

interface MonthlySummary {
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  expense_by_category: Record<string, number>;
}

interface PortfolioSummary {
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
}

interface InvestmentComparison {
  gold: PortfolioSummary;
  mutual_fund: PortfolioSummary;
}

interface InvestmentDetail {
  type: string;
  platform: string;
  product_name: string;
  invested_amount: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
}

interface InvestmentDetailFull extends InvestmentDetail {}

interface CashflowTrend {
  month: string;
  net_cashflow: number;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
}

export default function DashboardPage() {
  useSession();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [investments, setInvestments] = useState<InvestmentDetail[]>([]);
  const [trend, setTrend] = useState<CashflowTrend[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');

  const getSalaryPeriod = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    if (day < 25) {
      const sm = month === 0 ? 11 : month - 1;
      const sy = month === 0 ? year - 1 : year;
      return {
        startDate: `${sy}-${String(sm + 1).padStart(2, '0')}-25`,
        endDate: `${year}-${String(month + 1).padStart(2, '0')}-24`,
        label: new Date(sy, sm, 25).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + new Date(year, month, 24).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    } else {
      const em = month === 11 ? 0 : month + 1;
      const ey = month === 11 ? year + 1 : year;
      return {
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-25`,
        endDate: `${ey}-${String(em + 1).padStart(2, '0')}-24`,
        label: new Date(year, month, 25).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + new Date(ey, em, 24).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const period = getSalaryPeriod(new Date());
        setPeriodLabel(period.label);
        const [sumRes, portRes, compRes, trendRes, invRes, txRes] = await Promise.all([
          fetch(`/api/transactions/summary-range?startDate=${period.startDate}&endDate=${period.endDate}`),
          fetch('/api/analytics/portfolio'),
          fetch('/api/analytics/comparison'),
          fetch('/api/analytics/cashflow-trend'),
          fetch('/api/investments/details'),
          fetch('/api/transactions?limit=5'),
        ]);
        if (sumRes.ok) { const d = await sumRes.json(); setSummary(d.responseDetails); }
        if (portRes.ok) { 
          const d = await portRes.json(); 
          console.log('Portfolio API response:', d.responseDetails);
          setPortfolio(d.responseDetails?.summary || null); 
        }
        if (compRes.ok) { const d = await compRes.json(); setComparison(d.responseDetails); }
        if (trendRes.ok) { const d = await trendRes.json(); setTrend(d.responseDetails || []); }
        if (invRes.ok) { 
          const d = await invRes.json(); 
          console.log('Investment details:', d.responseDetails); 
          setInvestments(Array.isArray(d.responseDetails) ? d.responseDetails : []); 
        }
        if (txRes.ok) { const d = await txRes.json(); const txList = d.responseDetails?.transactions; setTransactions(Array.isArray(txList) ? txList : []); }
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }
    fetchData();
  }, []);

  const formatCurrency = (v: number | null | undefined) => (v === undefined || v === null || isNaN(v)) ? 'Rp 0' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const formatCompact = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const safe = (v: number | null | undefined) => (v === undefined || v === null || isNaN(v)) ? 0 : v;

  const income = safe(summary?.total_income);
  const expense = safe(summary?.total_expense);
  const net = safe(summary?.net_cashflow);
  
  // Calculate portfolio directly from investments details
  const calcInvested = investments.reduce((sum, inv) => sum + safe(inv.invested_amount), 0);
  const calcCurrentVal = investments.reduce((sum, inv) => sum + safe(inv.current_value), 0);
  // Calculate gain directly: current_value - invested_amount
  const calcGainLoss = calcCurrentVal - calcInvested;
  
  // Debug log
  console.log('Portfolio calc:', { calcInvested, calcCurrentVal, calcGainLoss, investments });
  
  // Use calculated values if available, fallback to portfolio API
  const invested = calcInvested > 0 ? calcInvested : safe(portfolio?.total_invested);
  const currentVal = calcCurrentVal > 0 ? calcCurrentVal : safe(portfolio?.total_current_value);
  const gainLoss = calcInvested > 0 ? calcGainLoss : (currentVal - invested);
  const returnPct = invested > 0 ? (gainLoss / invested) * 100 : 0;
  
  console.log('Final values:', { invested, currentVal, gainLoss, returnPct });
  
  // Calculate allocation from investments
  const goldInv = investments.find(inv => inv.type === 'GOLD');
  const mfInv = investments.find(inv => inv.type === 'MUTUAL_FUND');
  const goldVal = safe(goldInv?.current_value) || safe(comparison?.gold?.total_current_value);
  const mfVal = safe(mfInv?.current_value) || safe(comparison?.mutual_fund?.total_current_value);
  const goldPct = currentVal > 0 ? (goldVal / currentVal) * 100 : 0;
  const mfPct = currentVal > 0 ? (mfVal / currentVal) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
          <p className="text-sm text-zinc-500">{periodLabel}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Row 1: Summary Cards - 3 equal columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-sm text-zinc-500 mb-1">Net Cashflow</p>
                <p className="text-3xl font-bold text-zinc-900">{formatCurrency(net)}</p>
                <div className="flex gap-6 mt-4">
                  <div><p className="text-xs text-zinc-400">Income</p><p className="text-sm font-semibold text-green-600">{formatCurrency(income)}</p></div>
                  <div><p className="text-xs text-zinc-400">Expenses</p><p className="text-sm font-semibold text-red-500">{formatCurrency(expense)}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-sm text-zinc-500 mb-1">Portfolio Value</p>
                <p className="text-3xl font-bold text-zinc-900">{formatCurrency(currentVal)}</p>
                <div className="flex gap-6 mt-4">
                  <div><p className="text-xs text-zinc-400">Invested</p><p className="text-sm font-semibold text-zinc-700">{formatCurrency(invested)}</p></div>
                  <div>
                    <p className="text-xs text-zinc-400">Gain/Loss</p>
                    <p className={`text-sm font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <p className="text-sm text-zinc-500 mb-3">Investment Allocation</p>
                {currentVal > 0 ? (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden mb-3">
                      <div className="bg-amber-400" style={{ width: `${goldPct}%` }}></div>
                      <div className="bg-blue-500" style={{ width: `${mfPct}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1 text-zinc-700"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Gold {goldPct.toFixed(0)}%</span>
                      <span className="flex items-center gap-1 text-zinc-700"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Mutual Fund {mfPct.toFixed(0)}%</span>
                    </div>
                  </>
                ) : <p className="text-xs text-zinc-400">No investment data</p>}
              </div>
            </div>

            {/* Row 2: Transactions & Chart - 2 equal columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-zinc-900">Recent Transactions</h3>
                  <Link href="/cashflow" className="text-xs text-blue-600 hover:underline">View all</Link>
                </div>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <svg className={`w-4 h-4 ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === 'INCOME' ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{tx.category}</p>
                            <p className="text-xs text-zinc-400">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : '-'}{formatCompact(tx.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-zinc-400 text-center py-4">No transactions yet</p>}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-zinc-900 mb-4">Income vs Expense</h3>
                {(income > 0 || expense > 0) ? (
                  <div className="flex items-center gap-6">
                    {/* Larger Pie Chart */}
                    <div className="relative flex-shrink-0">
                      <div 
                        className="w-32 h-32 rounded-full"
                        style={{
                          background: income + expense > 0 
                            ? `conic-gradient(
                                #22c55e 0deg ${(income / (income + expense)) * 360}deg,
                                #ef4444 ${(income / (income + expense)) * 360}deg 360deg
                              )`
                            : '#e4e4e7'
                        }}
                      >
                        <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-[10px] text-zinc-400">Net</p>
                            <p className={`text-sm font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {net >= 0 ? '+' : ''}{formatCompact(net)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2 text-sm text-zinc-700">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>Income
                          </span>
                          <span className="text-sm font-bold text-zinc-900">{formatCompact(income)}</span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${income + expense > 0 ? (income / (income + expense)) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2 text-sm text-zinc-700">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span>Expense
                          </span>
                          <span className="text-sm font-bold text-zinc-900">{formatCompact(expense)}</span>
                        </div>
                        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${income + expense > 0 ? (expense / (income + expense)) * 100 : 0}%` }}></div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-sm text-zinc-500">Savings Rate</span>
                        <span className={`text-sm font-bold ${income > 0 && net > 0 ? 'text-green-600' : 'text-zinc-400'}`}>
                          {income > 0 ? ((net / income) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : <p className="text-sm text-zinc-400 text-center py-4">No cashflow data</p>}
              </div>
            </div>

            {/* Row 3: Investments & Expenses - 2 equal columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-zinc-900">My Investments</h3>
                  <Link href="/investments" className="text-xs text-blue-600 hover:underline">Manage</Link>
                </div>
                {investments.length > 0 ? (
                  <div className="space-y-3">
                    {investments.map((inv, i) => {
                      // Calculate gain directly from current_value - invested_amount
                      const invGain = inv.current_value - inv.invested_amount;
                      const invGainPct = inv.invested_amount > 0 ? (invGain / inv.invested_amount) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${inv.type === 'GOLD' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                              {inv.type === 'GOLD' ? <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg> : <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">{inv.platform}</p>
                              <p className="text-xs text-zinc-500">{inv.product_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-zinc-900">{formatCurrency(inv.current_value)}</p>
                            <p className={`text-xs ${invGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {invGain >= 0 ? '+' : ''}{formatCurrency(invGain)} ({invGainPct >= 0 ? '+' : ''}{invGainPct.toFixed(2)}%)
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-zinc-400 mb-3">No investments yet</p>
                    <Link href="/investments" className="text-sm text-blue-600 hover:underline">+ Add Investment</Link>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-zinc-900 mb-4">Top Expenses</h3>
                {summary?.expense_by_category && Object.keys(summary.expense_by_category).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(summary.expense_by_category).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-zinc-700">{cat}</span>
                            <span className="text-sm font-medium text-zinc-900">{formatCurrency(amt)}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${(amt / expense) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-zinc-400 text-center py-4">No expense data</p>}
              </div>
            </div>

            {/* Row 4: Quick Actions - 4 equal columns */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/cashflow" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
                <span className="text-sm font-medium text-zinc-700">Add Transaction</span>
              </Link>
              <Link href="/investments" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
                <span className="text-sm font-medium text-zinc-700">Update Investment</span>
              </Link>
              <Link href="/analytics" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
                <span className="text-sm font-medium text-zinc-700">View Analytics</span>
              </Link>
              <Link href="/settings" className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center"><svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                <span className="text-sm font-medium text-zinc-700">Settings</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

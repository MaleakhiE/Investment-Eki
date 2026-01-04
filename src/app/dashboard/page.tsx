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

interface PortfolioSummary { total_invested: number; total_current_value: number; total_gain_loss: number; }
interface InvestmentComparison { gold: PortfolioSummary; mutual_fund: PortfolioSummary; }
interface InvestmentDetail { type: string; platform: string; product_name: string; invested_amount: number; current_value: number; gain_loss: number; }
interface CashflowTrend { month: string; income: number; expense: number; net_cashflow: number; }
interface Transaction { id: string; date: string; type: string; category: string; amount: number; }
interface BudgetAlert { id: string; category: string; amount: number; spent: number; percentage: number; isOverBudget: boolean; }
interface GoalProgress { id: string; name: string; target_amount: number; current_amount: number; percentage: number; category: string; days_left: number | null; is_completed: boolean; }

export default function DashboardPage() {
  useSession();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [investments, setInvestments] = useState<InvestmentDetail[]>([]);
  const [trend, setTrend] = useState<CashflowTrend[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
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
        const [sumRes, compRes, trendRes, invRes, txRes, budgetRes, goalsRes] = await Promise.all([
          fetch(`/api/transactions/summary-range?startDate=${period.startDate}&endDate=${period.endDate}`),
          fetch('/api/analytics/comparison'),
          fetch('/api/analytics/cashflow-trend'),
          fetch('/api/investments/details'),
          fetch('/api/transactions?limit=5'),
          fetch('/api/budgets?alerts=true'),
          fetch('/api/goals'),
        ]);
        if (sumRes.ok) { const d = await sumRes.json(); setSummary(d.responseDetails); }
        if (compRes.ok) { const d = await compRes.json(); setComparison(d.responseDetails); }
        if (trendRes.ok) { const d = await trendRes.json(); setTrend(d.responseDetails || []); }
        if (invRes.ok) { const d = await invRes.json(); setInvestments(Array.isArray(d.responseDetails) ? d.responseDetails : []); }
        if (txRes.ok) { const d = await txRes.json(); const txList = d.responseDetails?.transactions; setTransactions(Array.isArray(txList) ? txList : []); }
        if (budgetRes.ok) { const d = await budgetRes.json(); setBudgetAlerts(Array.isArray(d.responseDetails) ? d.responseDetails : []); }
        if (goalsRes.ok) { const d = await goalsRes.json(); setGoals(Array.isArray(d.responseDetails) ? d.responseDetails.filter((g: GoalProgress) => !g.is_completed).slice(0, 3) : []); }
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
  const calcInvested = investments.reduce((sum, inv) => sum + safe(inv.invested_amount), 0);
  const calcCurrentVal = investments.reduce((sum, inv) => sum + safe(inv.current_value), 0);
  const calcGainLoss = calcCurrentVal - calcInvested;
  const invested = calcInvested > 0 ? calcInvested : 0;
  const currentVal = calcCurrentVal > 0 ? calcCurrentVal : 0;
  const gainLoss = calcGainLoss;
  const returnPct = invested > 0 ? (gainLoss / invested) * 100 : 0;
  const goldVal = safe(comparison?.gold?.total_current_value);
  const mfVal = safe(comparison?.mutual_fund?.total_current_value);
  const goldPct = currentVal > 0 ? (goldVal / currentVal) * 100 : 0;
  const mfPct = currentVal > 0 ? (mfVal / currentVal) * 100 : 0;

  // Financial Health Score (0-100)
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const hasEmergencyFund = net > expense * 3; // 3 months expenses
  const hasDiversifiedInvestment = goldVal > 0 && mfVal > 0;
  const healthScore = Math.min(100, Math.max(0,
    (savingsRate > 20 ? 30 : savingsRate > 10 ? 20 : savingsRate > 0 ? 10 : 0) +
    (hasEmergencyFund ? 25 : net > expense ? 15 : 0) +
    (hasDiversifiedInvestment ? 25 : currentVal > 0 ? 15 : 0) +
    (expense > 0 && income > expense ? 20 : 0)
  ));
  const healthLabel = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Needs Work';
  const healthColor = healthScore >= 80 ? 'text-green-600' : healthScore >= 60 ? 'text-blue-600' : healthScore >= 40 ? 'text-amber-600' : 'text-red-500';

  // Insights
  const insights: { icon: string; text: string; type: 'success' | 'warning' | 'info' }[] = [];
  if (savingsRate >= 20) insights.push({ icon: '🎯', text: `Great! Saving ${savingsRate.toFixed(0)}% of income`, type: 'success' });
  else if (savingsRate > 0) insights.push({ icon: '💡', text: `Saving ${savingsRate.toFixed(0)}% - aim for 20%+`, type: 'info' });
  else if (income > 0) insights.push({ icon: '⚠️', text: 'Expenses exceed income this period', type: 'warning' });
  if (currentVal > invested && invested > 0) insights.push({ icon: '📈', text: `Investments up ${returnPct.toFixed(1)}%`, type: 'success' });
  if (!hasDiversifiedInvestment && currentVal > 0) insights.push({ icon: '💡', text: 'Consider diversifying investments', type: 'info' });
  const topExpense = summary?.expense_by_category ? Object.entries(summary.expense_by_category).sort((a, b) => b[1] - a[1])[0] : null;
  if (topExpense && expense > 0) {
    const pct = (topExpense[1] / expense) * 100;
    if (pct > 40) insights.push({ icon: '📊', text: `${topExpense[0]} is ${pct.toFixed(0)}% of expenses`, type: 'info' });
  }

  // Trend chart data
  const trendMax = Math.max(...trend.map(t => Math.max(t.income || 0, t.expense || 0)), 1);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
          <p className="text-sm text-zinc-600">{periodLabel}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Row 1: Health Score + Net Cashflow + Portfolio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-zinc-600">Financial Health</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${healthScore >= 80 ? 'bg-green-100 text-green-700' : healthScore >= 60 ? 'bg-blue-100 text-blue-700' : healthScore >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{healthLabel}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={healthScore >= 80 ? '#22c55e' : healthScore >= 60 ? '#3b82f6' : healthScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${healthScore}, 100`} />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${healthColor}`}>{healthScore}</span>
                  </div>
                  <div className="flex-1 text-xs text-zinc-600 space-y-1">
                    <p>✓ Savings: {savingsRate.toFixed(0)}%</p>
                    <p>{hasEmergencyFund ? '✓' : '○'} Emergency fund</p>
                    <p>{hasDiversifiedInvestment ? '✓' : '○'} Diversified</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm text-zinc-600 mb-1">Net Cashflow</p>
                <p className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(net)}</p>
                <div className="flex gap-4 mt-3 text-xs">
                  <div><span className="text-zinc-500">In</span> <span className="font-semibold text-green-600">{formatCompact(income)}</span></div>
                  <div><span className="text-zinc-500">Out</span> <span className="font-semibold text-red-500">{formatCompact(expense)}</span></div>
                  <div><span className="text-zinc-500">Save</span> <span className="font-semibold text-zinc-700">{savingsRate.toFixed(0)}%</span></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-sm text-zinc-600 mb-1">Portfolio</p>
                <p className="text-2xl font-bold text-zinc-900">{formatCurrency(currentVal)}</p>
                <div className="flex gap-4 mt-3 text-xs">
                  <div><span className="text-zinc-500">Invested</span> <span className="font-semibold text-zinc-700">{formatCompact(invested)}</span></div>
                  <div><span className="text-zinc-500">Return</span> <span className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>{gainLoss >= 0 ? '+' : ''}{returnPct.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* Row 2: Insights + Allocation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-zinc-900 mb-3 text-sm">Quick Insights</h3>
                {insights.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {insights.slice(0, 4).map((ins, i) => (
                      <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${ins.type === 'success' ? 'bg-green-50 text-green-700' : ins.type === 'warning' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        <span>{ins.icon}</span><span>{ins.text}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500">Add transactions to see insights</p>}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-zinc-900 mb-3 text-sm">Allocation</h3>
                {currentVal > 0 ? (
                  <>
                    <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
                      <div className="bg-amber-400" style={{ width: `${goldPct}%` }}></div>
                      <div className="bg-blue-500" style={{ width: `${mfPct}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1 text-zinc-700"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Gold {goldPct.toFixed(0)}%</span>
                      <span className="flex items-center gap-1 text-zinc-700"><span className="w-2 h-2 rounded-full bg-blue-500"></span>RD {mfPct.toFixed(0)}%</span>
                    </div>
                  </>
                ) : <p className="text-xs text-zinc-500">No investments</p>}
              </div>
            </div>

            {/* Row 3: Trend Chart + Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-zinc-900 mb-3 text-sm">6-Month Trend</h3>
                {trend.length > 0 ? (
                  <div className="flex items-end gap-1 h-32">
                    {trend.slice(-6).map((t, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex gap-0.5 items-end justify-center h-24">
                          <div className="w-2.5 bg-green-400 rounded-t transition-all" style={{ height: `${Math.max((safe(t.income) / trendMax) * 100, t.income > 0 ? 8 : 0)}%` }} title={`Income: ${formatCompact(safe(t.income))}`}></div>
                          <div className="w-2.5 bg-red-400 rounded-t transition-all" style={{ height: `${Math.max((safe(t.expense) / trendMax) * 100, t.expense > 0 ? 8 : 0)}%` }} title={`Expense: ${formatCompact(safe(t.expense))}`}></div>
                        </div>
                        <p className="text-[9px] text-zinc-600 mt-1">{new Date(t.month + '-01').toLocaleDateString('id-ID', { month: 'short' })}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-8">No trend data</p>}
                <div className="flex justify-center gap-4 mt-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400"></span>Income</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400"></span>Expense</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zinc-900 text-sm">Recent Transactions</h3>
                  <Link href="/cashflow" className="text-xs text-blue-600 hover:underline">View all</Link>
                </div>
                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <svg className={`w-3.5 h-3.5 ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === 'INCOME' ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} /></svg>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-zinc-900">{tx.category}</p>
                            <p className="text-[10px] text-zinc-500">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : '-'}{formatCompact(tx.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-6">No transactions</p>}
              </div>
            </div>

            {/* Row 4: Investments + Top Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zinc-900 text-sm">Investments</h3>
                  <Link href="/investments" className="text-xs text-blue-600 hover:underline">Manage</Link>
                </div>
                {investments.length > 0 ? (
                  <div className="space-y-2">
                    {investments.map((inv, i) => {
                      const invGain = inv.current_value - inv.invested_amount;
                      const invGainPct = inv.invested_amount > 0 ? (invGain / inv.invested_amount) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.type === 'GOLD' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                              {inv.type === 'GOLD' ? <span className="text-sm">🪙</span> : <span className="text-sm">📊</span>}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-900">{inv.platform}</p>
                              <p className="text-[10px] text-zinc-600">{inv.product_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-zinc-900">{formatCompact(inv.current_value)}</p>
                            <p className={`text-[10px] ${invGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>{invGain >= 0 ? '+' : ''}{invGainPct.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-zinc-500 mb-2">No investments</p>
                    <Link href="/investments" className="text-xs text-blue-600 hover:underline">+ Add</Link>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-zinc-900 mb-3 text-sm">Top Expenses</h3>
                {summary?.expense_by_category && Object.keys(summary.expense_by_category).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(summary.expense_by_category).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs text-zinc-700">{cat}</span>
                            <span className="text-xs font-medium text-zinc-900">{formatCompact(amt)}</span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${(amt / expense) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-zinc-500 text-center py-4">No expenses</p>}
              </div>
            </div>

            {/* Row 5: Budget Alerts & Goals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Budget Alerts */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zinc-900 text-sm">Budget Alerts</h3>
                  <Link href="/budget" className="text-xs text-blue-600 hover:underline">Manage</Link>
                </div>
                {budgetAlerts.length > 0 ? (
                  <div className="space-y-2">
                    {budgetAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className={`p-3 rounded-xl ${alert.isOverBudget ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-900">{alert.category}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${alert.isOverBudget ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                            {alert.isOverBudget ? 'Over!' : `${alert.percentage.toFixed(0)}%`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${alert.isOverBudget ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, alert.percentage)}%` }}></div>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">{formatCompact(alert.spent)} / {formatCompact(alert.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-zinc-500 mb-2">No budget alerts</p>
                    <Link href="/budget" className="text-xs text-blue-600 hover:underline">+ Set Budget</Link>
                  </div>
                )}
              </div>

              {/* Goals Progress */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zinc-900 text-sm">Goals Progress</h3>
                  <Link href="/goals" className="text-xs text-blue-600 hover:underline">View All</Link>
                </div>
                {goals.length > 0 ? (
                  <div className="space-y-2">
                    {goals.map((goal) => (
                      <div key={goal.id} className="p-3 bg-zinc-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-zinc-900">{goal.name}</span>
                          <span className="text-xs font-bold text-blue-600">{goal.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, goal.percentage)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-600">
                          <span>{formatCompact(goal.current_amount)} / {formatCompact(goal.target_amount)}</span>
                          {goal.days_left !== null && <span>{goal.days_left} days left</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-zinc-500 mb-2">No active goals</p>
                    <Link href="/goals" className="text-xs text-blue-600 hover:underline">+ Create Goal</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Row 6: Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <Link href="/cashflow" className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg></div>
                <span className="text-xs font-medium text-zinc-700">Transaction</span>
              </Link>
              <Link href="/budget" className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center"><svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                <span className="text-xs font-medium text-zinc-700">Budget</span>
              </Link>
              <Link href="/goals" className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center"><svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg></div>
                <span className="text-xs font-medium text-zinc-700">Goals</span>
              </Link>
              <Link href="/investments" className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"><svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>
                <span className="text-xs font-medium text-zinc-700">Investment</span>
              </Link>
              <Link href="/analytics" className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center"><svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
                <span className="text-xs font-medium text-zinc-700">Analytics</span>
              </Link>
              <Link href="/settings" className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center"><svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                <span className="text-xs font-medium text-zinc-700">Settings</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import { AccountCard, type AccountSummary } from '@/components/accounts/AccountCard';
import { DecisionContext } from '@/components/finance/DecisionContext';

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
interface Transaction { id: string; date: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; category: string; amount: number; description?: string; source_account_name?: string | null; destination_account_name?: string | null; }
interface GoalProgress { id: string; name: string; target_amount: number; current_amount: number; percentage: number; category: string; days_left: number | null; is_completed: boolean; }
interface SavingsSuggestion { category: string; current_amount?: number; historical_average?: number; potential_saving?: number; message?: string; }
interface UpcomingTransaction { id: string; category: string; description: string; amount: number; type: 'INCOME' | 'EXPENSE'; is_active: boolean; next_run: string | null; }
interface BudgetSummary { id: string; category: string; amount: number; spent: number; remaining: number; percentage: number; isOverBudget: boolean; }
type ResourceStatus = 'loading' | 'ready' | 'error';

const isInvestmentDetail = (value: unknown): value is InvestmentDetail => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<InvestmentDetail>;
  return ['type', 'platform', 'product_name'].every((key) => typeof item[key as keyof InvestmentDetail] === 'string')
    && ['invested_amount', 'current_value', 'gain_loss'].every((key) => Number.isFinite(item[key as keyof InvestmentDetail]));
};

export default function DashboardPage() {
  useSession();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [investments, setInvestments] = useState<InvestmentDetail[]>([]);
  const [trend, setTrend] = useState<CashflowTrend[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [suggestions, setSuggestions] = useState<SavingsSuggestion[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingTransaction[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [summaryStatus, setSummaryStatus] = useState<ResourceStatus>('loading');
  const [accountsStatus, setAccountsStatus] = useState<ResourceStatus>('loading');
  const [transactionsStatus, setTransactionsStatus] = useState<ResourceStatus>('loading');
  const [investmentsStatus, setInvestmentsStatus] = useState<ResourceStatus>('loading');
  const [isLoading, setIsLoading] = useState(true);
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
        label: new Date(sy, sm, 25).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + new Date(year, month, 24).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      };
    } else {
      const em = month === 11 ? 0 : month + 1;
      const ey = month === 11 ? year + 1 : year;
      return {
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-25`,
        endDate: `${ey}-${String(em + 1).padStart(2, '0')}-24`,
        label: new Date(year, month, 25).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + new Date(ey, em, 24).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      };
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const period = getSalaryPeriod(new Date());
        setPeriodLabel(period.label);
        const [sumRes, compRes, trendRes, invRes, txRes, goalsRes, suggestionsRes, recurringRes, accountsRes, budgetsRes] = await Promise.all([
          fetch(`/api/transactions/summary-range?startDate=${period.startDate}&endDate=${period.endDate}`),
          fetch('/api/analytics/comparison'),
          fetch('/api/analytics/cashflow-trend'),
          fetch('/api/investments/details'),
          fetch('/api/transactions?limit=5'),
          fetch('/api/goals'),
          fetch('/api/analytics/savings-suggestions'),
          fetch('/api/recurring'),
          fetch('/api/accounts'),
          fetch('/api/budgets'),
        ].map(async (request) => { try { return await request; } catch { return null; } }));
        if (!sumRes) setSummaryStatus('error');
        if (!accountsRes) setAccountsStatus('error');
        if (!txRes) setTransactionsStatus('error');
        if (sumRes?.ok) {
          const d = await sumRes.json();
          const details = d.responseDetails;
          if (d.responseStatus === 'SUCCESS' && details && typeof details === 'object' && ['total_income', 'total_expense', 'net_cashflow'].every((key) => Number.isFinite(details[key]))) { setSummary(details); setSummaryStatus('ready'); } else setSummaryStatus('error');
        } else setSummaryStatus('error');
        if (compRes?.ok) { const d = await compRes.json(); setComparison(d.responseDetails); }
        if (trendRes?.ok) { const d = await trendRes.json(); setTrend(d.responseDetails || []); }
        if (invRes?.ok) {
          const d = await invRes.json();
          if (Array.isArray(d.responseDetails) && d.responseDetails.every(isInvestmentDetail)) {
            setInvestments(d.responseDetails);
            setInvestmentsStatus('ready');
          } else setInvestmentsStatus('error');
        } else setInvestmentsStatus('error');
        if (txRes?.ok) { const d = await txRes.json(); const txList = d.responseDetails?.transactions; if (d.responseStatus === 'SUCCESS' && Array.isArray(txList)) { setTransactions(txList); setTransactionsStatus('ready'); } else setTransactionsStatus('error'); } else setTransactionsStatus('error');
        if (goalsRes?.ok) { const d = await goalsRes.json(); setGoals(Array.isArray(d.responseDetails) ? d.responseDetails.filter((g: GoalProgress) => !g.is_completed).slice(0, 3) : []); }
        if (suggestionsRes?.ok) { const d = await suggestionsRes.json(); const list = d.responseDetails?.suggestions ?? d.responseDetails; setSuggestions(Array.isArray(list) ? list : []); }
        if (recurringRes?.ok) { const d = await recurringRes.json(); const list = Array.isArray(d.responseDetails) ? d.responseDetails : []; setUpcoming(list.filter((item: UpcomingTransaction) => item.is_active && item.next_run).sort((a: UpcomingTransaction, b: UpcomingTransaction) => a.next_run!.localeCompare(b.next_run!)).slice(0, 5)); }
        if (accountsRes?.ok) { const d = await accountsRes.json(); if (d.responseStatus === 'SUCCESS' && Array.isArray(d.responseDetails)) { setAccounts(d.responseDetails); setAccountsStatus('ready'); } else setAccountsStatus('error'); } else setAccountsStatus('error');
        if (budgetsRes?.ok) {
          const d = await budgetsRes.json();
          setBudgets(Array.isArray(d.responseDetails) ? d.responseDetails : []);
          setBudgetStatus('ready');
        } else {
          setBudgetStatus('error');
        }
      } catch { console.error('dashboard_data_fetch_failed'); setBudgetStatus('error'); setSummaryStatus('error'); setAccountsStatus('error'); setTransactionsStatus('error'); } finally { setIsLoading(false); }
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
  const invested = calcInvested > 0 ? calcInvested : 0;
  const currentVal = calcCurrentVal > 0 ? calcCurrentVal : 0;
  const gainLoss = currentVal - invested;
  const returnPct = invested > 0 ? (gainLoss / invested) * 100 : 0;
  const goldVal = safe(comparison?.gold?.total_current_value);
  const mfVal = safe(comparison?.mutual_fund?.total_current_value);
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const trendMax = Math.max(...trend.map(t => Math.max(t.income || 0, t.expense || 0)), 1);
  const totalBudget = budgets.reduce((sum, budget) => sum + safe(budget.amount), 0);
  const totalBudgetSpent = budgets.reduce((sum, budget) => sum + safe(budget.spent), 0);
  const budgetPercent = totalBudget > 0 ? Math.min(100, (totalBudgetSpent / totalBudget) * 100) : 0;
  const overBudgetCount = budgets.filter((budget) => budget.isOverBudget).length;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f3faf8]">
        <Sidebar />
        <main className="app-page dashboard-page lg:ml-64 p-4 lg:p-6">
          <div className="space-y-4">
            <div className="skeleton h-48 rounded-3xl"></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl"></div>)}
            </div>
            <div className="skeleton h-64 rounded-3xl"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page dashboard-page lg:ml-64 p-4 lg:p-6">
        {/* Greeting */}
        <div className="mb-6 animate-fade-in">
          <p className="text-zinc-500 text-sm">{periodLabel}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#16332f] mt-1">
            Selamat datang
          </h1>
        </div>

        <div className="space-y-5">
          {/* Hero Balance Card */}
          <div className="card-elevated rounded-3xl p-6 animate-fade-in relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4aa]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00d4aa]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-zinc-400 text-sm">Cashflow periode ini</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d4aa]/10 text-[#087f6b] text-xs font-medium">Net balance</span>
              </div>
              {summaryStatus === 'error' ? (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-medium">Monthly summary unavailable</p>
                  <p className="mt-1">Your dashboard could not verify this period&apos;s totals. Refresh to try again.</p>
                </div>
              ) : <>
              <p className={`text-4xl lg:text-5xl font-bold mb-1 ${net >= 0 ? 'gradient-text' : 'text-[#b84c49]'}`}>
                {formatCurrency(net)}
              </p>
              <p className="text-xs text-zinc-500 mb-6">{periodLabel || 'Periode gajian aktif'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f5fbf9] rounded-2xl p-4 border border-[#dcece8]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-zinc-400 text-xs">Income</span>
                  </div>
                  <p className="text-xl font-bold text-[#16332f]">{formatCompact(income)}</p>
                </div>
                <div className="bg-[#f5fbf9] rounded-2xl p-4 border border-[#dcece8]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-zinc-400 text-xs">Expenses</span>
                  </div>
                  <p className="text-xl font-bold text-[#16332f]">{formatCompact(expense)}</p>
                </div>
              </div></>}
              
              {/* Savings Progress */}
              {income > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-400">Tingkat Tabungan</span>
                    <span className={savingsRate >= 20 ? 'text-[#00d4aa]' : savingsRate >= 0 ? 'text-amber-700' : 'text-[#b84c49]'}>{savingsRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-[#e9f5f2] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${savingsRate >= 20 ? 'bg-[#00d4aa]' : savingsRate >= 0 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Individual account balances */}
          <section className="min-w-0 animate-fade-in" aria-labelledby="account-balances-title">
            <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0"><h2 id="account-balances-title" className="truncate font-semibold text-[#16332f]">Accounts and wallets</h2><p className="text-xs text-zinc-500">Individual available balances</p></div>
              <Link href="/accounts" className="shrink-0 text-xs font-semibold text-[#008f78]">Manage</Link>
            </div>
            {accountsStatus === 'error' ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-medium">Account data is unavailable</p><Link href="/accounts" className="mt-2 inline-block font-semibold underline">Retry in Accounts</Link></div> : accounts.length > 0 ? <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">{accounts.map((account) => <div key={account.id} className="w-[min(82vw,280px)] shrink-0 snap-start"><AccountCard account={account} /></div>)}</div> : <Link href="/accounts" className="card block min-w-0 rounded-3xl p-5 text-sm text-zinc-500"><span className="break-words">Create your first bank account, wallet, or cash balance.</span></Link>}
          </section>

          {/* Quick Actions */}
          <div className="grid min-w-0 grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {[
              { href: '/cashflow', label: 'Activity' },
              { href: '/investments', label: 'Investments' },
              { href: '/budget', label: 'Budget' },
              { href: '/goals', label: 'Goals' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="card hover-scale min-w-0 p-3 text-center stat-card sm:p-4">
                <span className="block min-w-0 break-words text-xs font-semibold leading-4 text-zinc-600">{item.label}</span>
              </Link>
            ))}
          </div>

          <section className="card min-w-0 rounded-3xl p-5 animate-fade-in" aria-labelledby="budget-overview-title">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="budget-overview-title" className="font-semibold text-[#16332f]">Budget overview</h2>
                <p className="mt-1 text-xs text-zinc-500">Spending compared with your active limits</p>
              </div>
              <Link href="/budget" className="shrink-0 text-xs font-semibold text-[#008f78] hover:underline">Open budgets</Link>
            </div>
            {budgetStatus === 'error' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-medium">Budget data is unavailable.</p>
                <Link href="/budget" className="mt-2 inline-block font-semibold underline underline-offset-2">Retry in Budgets</Link>
              </div>
            ) : budgets.length === 0 && budgetStatus === 'ready' ? (
              <div className="rounded-2xl border border-dashed border-[#dcece8] bg-[#f5fbf9] p-6 text-center" role="status" aria-live="polite">
                <div aria-hidden="true" className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#dff5ef] text-xl">🎯</div>
                <h3 className="font-semibold text-[#16332f]">Belum ada anggaran aktif</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">Buat batas pengeluaran untuk menjaga keuangan Anda tetap terkendali.</p>
                <Link href="/budget" className="mt-3 inline-block font-semibold text-[#008f78] underline underline-offset-2">Set up your first budget</Link>
              </div>
            ) : (
              <div className="space-y-3" aria-live="polite">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-2xl font-bold text-[#16332f]">{formatCurrency(totalBudgetSpent)}</p>
                  <p className="text-sm text-zinc-500">of {formatCurrency(totalBudget)}</p>
                </div>
                <div
                  className="h-3 overflow-hidden rounded-full bg-[#e9f5f2]"
                  role="progressbar"
                  aria-label="Total budget usage"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(budgetPercent)}
                >
                  <div className={`h-full rounded-full transition-all ${overBudgetCount > 0 ? 'bg-red-400' : budgetPercent >= 80 ? 'bg-amber-400' : 'bg-[#00d4aa]'}`} style={{ width: `${budgetPercent}%` }} />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-zinc-500">
                  <span>{budgetPercent.toFixed(0)}% used</span>
                  <span className={overBudgetCount > 0 ? 'font-semibold text-red-600' : 'text-[#087f6b]'}>
                    {overBudgetCount > 0 ? `${overBudgetCount} over budget` : `${formatCurrency(Math.max(0, totalBudget - totalBudgetSpent))} remaining`}
                  </span>
                </div>
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="card rounded-3xl p-5">
              <div className="mb-4"><h2 className="font-semibold text-[#16332f]">Savings opportunities</h2></div>
              {suggestions.length > 0 ? <div className="space-y-3">{suggestions.slice(0, 3).map((item) => {
                const saving = item.potential_saving ?? 0;
                return <div key={item.category} className="min-w-0 rounded-2xl bg-[#00d4aa]/10 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-[#16332f]">{item.category}</p><p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">{item.message ?? `Return to your three-month average to save ${formatCurrency(saving)}.`}</p></div><span className="shrink-0 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#008f78]">{formatCompact(saving)}</span></div></div>;
              })}</div> : <p className="text-sm text-zinc-500">No overspending patterns need attention right now.</p>}
            </section>

            <section className="card rounded-3xl p-5">
              <div className="mb-4"><h2 className="font-semibold text-[#16332f]">Upcoming transactions</h2></div>
              <DecisionContext
                title="Recurring plan readiness"
                state={upcoming.length > 0 ? 'verified' : 'manual'}
                source="Saved recurring rules"
                description="This is a planning view only. It does not place investment orders or connect to a provider."
              />
              {upcoming.length > 0 ? <div className="space-y-2">{upcoming.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#f5fbf9] p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#16332f]">{item.description || item.category}</p><p className="text-xs text-zinc-500">{item.type === 'INCOME' ? 'Income' : 'Expenses'} · {new Date(`${item.next_run}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p></div><p className={`text-sm font-bold ${item.type === 'INCOME' ? 'text-[#00a88a]' : 'text-red-500'}`}>{formatCompact(item.amount)}</p></div>)}</div> : <p className="text-sm text-zinc-500">No active recurring transactions.</p>}
            </section>
          </div>

          {/* Portfolio Card */}
          {investmentsStatus === 'error' ? (
            <div role="alert" className="card rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              <p className="font-medium">Investment data is unavailable</p>
              <p className="mt-1">The dashboard could not verify portfolio values. Open Investments to retry.</p>
              <Link href="/investments" className="mt-2 inline-block font-semibold underline">Open Investments</Link>
            </div>
          ) : currentVal > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in stat-card" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#16332f]">Portfolio</h3>
                </div>
                <Link href="/investments" className="text-xs text-[#00d4aa] hover:underline">View details</Link>
              </div>
              
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-[#16332f]">{formatCurrency(currentVal)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-medium ${gainLoss >= 0 ? 'text-[#00d4aa]' : 'text-[#b84c49]'}`}>
                      {gainLoss >= 0 ? 'Untung' : 'Rugi'} {formatCurrency(Math.abs(gainLoss))}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gainLoss >= 0 ? 'bg-[#00d4aa]/10 text-[#00d4aa]' : 'bg-red-500/10 text-red-400'}`}>
                      {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Allocation */}
              <div className="space-y-3">
                <div className="flex h-3 rounded-full overflow-hidden bg-[#f5fbf9]">
                  {goldVal > 0 && <div className="bg-gradient-to-r from-amber-400 to-amber-500 transition-all" style={{ width: `${(goldVal / currentVal) * 100}%` }}></div>}
                  {mfVal > 0 && <div className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all" style={{ width: `${(mfVal / currentVal) * 100}%` }}></div>}
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"></div>
                    <span className="text-xs text-zinc-400">Gold</span>
                    <span className="text-xs font-medium text-[#16332f]">{formatCompact(goldVal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
                    <span className="text-xs text-zinc-400">Reksa Dana</span>
                    <span className="text-xs font-medium text-[#16332f]">{formatCompact(mfVal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#16332f]">Recent transactions</h3>
              </div>
              <Link href="/cashflow" className="text-xs text-[#00d4aa] hover:underline">View all</Link>
            </div>
            
            {transactionsStatus === 'error' ? (
              <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-medium">Recent transactions are unavailable</p><Link href="/cashflow" className="mt-2 inline-block font-semibold underline">Retry in Activity</Link></div>
            ) : transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx, i) => (
                  <div key={tx.id} className="flex items-center gap-4 p-3 rounded-2xl bg-[#f5fbf9] hover:bg-[#e9f5f2] transition-colors" style={{ animationDelay: `${0.1 * i}s` }}>
                    <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-[#00d4aa]/10' : tx.type === 'TRANSFER' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                      <span className={`text-[9px] font-semibold ${tx.type === 'INCOME' ? 'text-[#00a88a]' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? 'IN' : tx.type === 'TRANSFER' ? 'MOVE' : 'OUT'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#16332f] truncate">{tx.category}</p>
                      <p className="text-xs text-zinc-500">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${tx.type === 'INCOME' ? 'text-[#00a88a]' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'}`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '' : '-'}{formatCompact(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#dcece8] bg-[#f5fbf9] p-6 text-center" role="status" aria-live="polite">
                <div aria-hidden="true" className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#dff5ef] text-xl">💸</div>
                <h3 className="font-semibold text-[#16332f]">Belum ada transaksi</h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">Catat transaksi pertama Anda untuk mulai melihat ringkasan keuangan.</p>
                <Link href="/cashflow" className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00d4aa]/10 text-[#00d4aa] text-sm font-medium hover:bg-[#00d4aa]/20 transition-colors">
                  Add transaction
                </Link>
              </div>
            )}
          </div>

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-[#16332f]">Six-month trend</h3>
              </div>
              
              <div className="flex items-end gap-2 h-32">
                {trend.slice(-6).map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex gap-1 items-end justify-center h-24">
                      <div className="w-3 lg:w-4 bg-gradient-to-t from-[#00d4aa] to-[#00ffcc] rounded-t-lg transition-all hover:opacity-80" style={{ height: `${Math.max((safe(t.income) / trendMax) * 100, t.income > 0 ? 10 : 0)}%` }}></div>
                      <div className="w-3 lg:w-4 bg-gradient-to-t from-red-500 to-red-400 rounded-t-lg transition-all hover:opacity-80" style={{ height: `${Math.max((safe(t.expense) / trendMax) * 100, t.expense > 0 ? 10 : 0)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2">{new Date(t.month + '-01').toLocaleDateString('id-ID', { month: 'short' })}</p>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#00d4aa] to-[#00ffcc]"></div>
                  <span className="text-xs text-zinc-400">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-400"></div>
                  <span className="text-xs text-zinc-400">Expenses</span>
                </div>
              </div>
            </div>
          )}

          {/* Goals Progress */}
          {goals.length > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#16332f]">Active goals</h3>
                </div>
                <Link href="/goals" className="text-xs text-[#00d4aa] hover:underline">View all</Link>
              </div>
              
              <div className="space-y-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 rounded-2xl bg-[#f5fbf9] border border-[#dcece8]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#16332f]">{goal.name}</span>
                      <span className="text-sm font-bold text-[#00d4aa]">{goal.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-[#e9f5f2] rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-[#00d4aa] to-[#00ffcc] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, goal.percentage)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{formatCompact(goal.current_amount)} / {formatCompact(goal.target_amount)}</span>
                      {goal.days_left !== null && <span>{goal.days_left} days remaining</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Expenses */}
          {summary?.expense_by_category && Object.keys(summary.expense_by_category).length > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold text-[#16332f]">Expenses Terbesar</h3>
              </div>
              
              <div className="space-y-4">
                {Object.entries(summary.expense_by_category).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, amt], i) => {
                  const pct = (amt / expense) * 100;
                  const colors = ['from-red-500 to-red-400', 'from-orange-500 to-orange-400', 'from-amber-500 to-amber-400', 'from-yellow-500 to-yellow-400'];
                  return (
                    <div key={cat}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-zinc-300">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#16332f]">{formatCompact(amt)}</span>
                          <span className="text-xs text-zinc-500">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#e9f5f2] rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${colors[i] || colors[3]} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state for new users */}
          {!isLoading && transactions.length === 0 && currentVal === 0 && (
            <div className="card rounded-3xl p-8 text-center animate-fade-in">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-[#00d4aa]/10 border border-[#00d4aa]/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#00a88a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#16332f] mb-2">Mulai Perjalanan Finansialmu!</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">Add your first transaction and start managing your money with clarity</p>
              <Link href="/cashflow" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl gradient-accent text-[#16332f] font-semibold text-sm hover:opacity-90 transition-opacity shadow-md shadow-[#00d4aa]/20">
                Add your first transaction
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
interface Transaction { id: string; date: string; type: string; category: string; amount: number; description?: string; }
interface GoalProgress { id: string; name: string; target_amount: number; current_amount: number; percentage: number; category: string; days_left: number | null; is_completed: boolean; }

export default function DashboardPage() {
  useSession();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [investments, setInvestments] = useState<InvestmentDetail[]>([]);
  const [trend, setTrend] = useState<CashflowTrend[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
        const [sumRes, compRes, trendRes, invRes, txRes, goalsRes] = await Promise.all([
          fetch(`/api/transactions/summary-range?startDate=${period.startDate}&endDate=${period.endDate}`),
          fetch('/api/analytics/comparison'),
          fetch('/api/analytics/cashflow-trend'),
          fetch('/api/investments/details'),
          fetch('/api/transactions?limit=5'),
          fetch('/api/goals'),
        ]);
        if (sumRes.ok) { const d = await sumRes.json(); setSummary(d.responseDetails); }
        if (compRes.ok) { const d = await compRes.json(); setComparison(d.responseDetails); }
        if (trendRes.ok) { const d = await trendRes.json(); setTrend(d.responseDetails || []); }
        if (invRes.ok) { const d = await invRes.json(); setInvestments(Array.isArray(d.responseDetails) ? d.responseDetails : []); }
        if (txRes.ok) { const d = await txRes.json(); const txList = d.responseDetails?.transactions; setTransactions(Array.isArray(txList) ? txList : []); }
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
  const invested = calcInvested > 0 ? calcInvested : 0;
  const currentVal = calcCurrentVal > 0 ? calcCurrentVal : 0;
  const gainLoss = currentVal - invested;
  const returnPct = invested > 0 ? (gainLoss / invested) * 100 : 0;
  const goldVal = safe(comparison?.gold?.total_current_value);
  const mfVal = safe(comparison?.mutual_fund?.total_current_value);
  const savingsRate = income > 0 ? (net / income) * 100 : 0;
  const trendMax = Math.max(...trend.map(t => Math.max(t.income || 0, t.expense || 0)), 1);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f]">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
        <main className="lg:ml-64 p-4 lg:p-6">
          <div className="space-y-4">
            <div className="skeleton h-48 rounded-3xl"></div>
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-2xl"></div>)}
            </div>
            <div className="skeleton h-64 rounded-3xl"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-6">
        {/* Greeting */}
        <div className="mb-6 animate-fade-in">
          <p className="text-zinc-500 text-sm">{periodLabel}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mt-1">
            Selamat datang! <span className="inline-block animate-bounce">👋</span>
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
                <span className="text-zinc-400 text-sm">Sisa Uang</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00d4aa]/10 text-[#00d4aa] text-xs font-medium">Bulan Ini</span>
              </div>
              <p className={`text-4xl lg:text-5xl font-bold mb-6 ${net >= 0 ? 'gradient-text' : 'text-red-400'}`}>
                {formatCurrency(net)}
              </p>
              
              {/* Income/Expense Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#00d4aa]/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                    </div>
                    <span className="text-zinc-400 text-xs">Pemasukan</span>
                  </div>
                  <p className="text-xl font-bold text-white">{formatCompact(income)}</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                    </div>
                    <span className="text-zinc-400 text-xs">Pengeluaran</span>
                  </div>
                  <p className="text-xl font-bold text-white">{formatCompact(expense)}</p>
                </div>
              </div>
              
              {/* Savings Progress */}
              {income > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-400">Tingkat Tabungan</span>
                    <span className={savingsRate >= 20 ? 'text-[#00d4aa]' : savingsRate >= 0 ? 'text-amber-400' : 'text-red-400'}>{savingsRate.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${savingsRate >= 20 ? 'bg-[#00d4aa]' : savingsRate >= 0 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {[
              { href: '/cashflow', emoji: '💳', label: 'Transaksi', color: 'from-blue-500/20 to-blue-600/20' },
              { href: '/investments', emoji: '📈', label: 'Investasi', color: 'from-amber-500/20 to-amber-600/20' },
              { href: '/budget', emoji: '💰', label: 'Budget', color: 'from-green-500/20 to-green-600/20' },
              { href: '/goals', emoji: '🎯', label: 'Goals', color: 'from-purple-500/20 to-purple-600/20' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="card hover-scale p-4 flex flex-col items-center gap-2 stat-card">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <span className="text-[10px] lg:text-xs font-medium text-zinc-400">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Portfolio Card */}
          {currentVal > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in stat-card" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💎</span>
                  <h3 className="font-semibold text-white">Portfolio</h3>
                </div>
                <Link href="/investments" className="text-xs text-[#00d4aa] hover:underline">Lihat Detail →</Link>
              </div>
              
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold text-white">{formatCurrency(currentVal)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-medium ${gainLoss >= 0 ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                      {gainLoss >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(gainLoss))}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${gainLoss >= 0 ? 'bg-[#00d4aa]/10 text-[#00d4aa]' : 'bg-red-500/10 text-red-400'}`}>
                      {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Allocation */}
              <div className="space-y-3">
                <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                  {goldVal > 0 && <div className="bg-gradient-to-r from-amber-400 to-amber-500 transition-all" style={{ width: `${(goldVal / currentVal) * 100}%` }}></div>}
                  {mfVal > 0 && <div className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all" style={{ width: `${(mfVal / currentVal) * 100}%` }}></div>}
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500"></div>
                    <span className="text-xs text-zinc-400">Gold</span>
                    <span className="text-xs font-medium text-white">{formatCompact(goldVal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
                    <span className="text-xs text-zinc-400">Reksa Dana</span>
                    <span className="text-xs font-medium text-white">{formatCompact(mfVal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-semibold text-white">Transaksi Terakhir</h3>
              </div>
              <Link href="/cashflow" className="text-xs text-[#00d4aa] hover:underline">Semua →</Link>
            </div>
            
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx, i) => (
                  <div key={tx.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors" style={{ animationDelay: `${0.1 * i}s` }}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-[#00d4aa]/10' : 'bg-red-500/10'}`}>
                      {tx.type === 'INCOME' ? (
                        <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{tx.category}</p>
                      <p className="text-xs text-zinc-500">{new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <p className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-[#00d4aa]' : 'text-red-400'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatCompact(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">📝</span>
                </div>
                <p className="text-zinc-500 text-sm mb-3">Belum ada transaksi</p>
                <Link href="/cashflow" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00d4aa]/10 text-[#00d4aa] text-sm font-medium hover:bg-[#00d4aa]/20 transition-colors">
                  <span>+</span> Tambah Transaksi
                </Link>
              </div>
            )}
          </div>

          {/* Trend Chart */}
          {trend.length > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📊</span>
                <h3 className="font-semibold text-white">Tren 6 Bulan</h3>
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
                  <span className="text-xs text-zinc-400">Pemasukan</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-red-400"></div>
                  <span className="text-xs text-zinc-400">Pengeluaran</span>
                </div>
              </div>
            </div>
          )}

          {/* Goals Progress */}
          {goals.length > 0 && (
            <div className="card rounded-3xl p-5 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h3 className="font-semibold text-white">Goals Aktif</h3>
                </div>
                <Link href="/goals" className="text-xs text-[#00d4aa] hover:underline">Semua →</Link>
              </div>
              
              <div className="space-y-3">
                {goals.map((goal) => (
                  <div key={goal.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">{goal.name}</span>
                      <span className="text-sm font-bold text-[#00d4aa]">{goal.percentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-[#00d4aa] to-[#00ffcc] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, goal.percentage)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{formatCompact(goal.current_amount)} / {formatCompact(goal.target_amount)}</span>
                      {goal.days_left !== null && <span>{goal.days_left} hari lagi</span>}
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
                <span className="text-xl">🔥</span>
                <h3 className="font-semibold text-white">Pengeluaran Terbesar</h3>
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
                          <span className="text-sm font-medium text-white">{formatCompact(amt)}</span>
                          <span className="text-xs text-zinc-500">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
              <div className="w-20 h-20 rounded-full bg-[#00d4aa]/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Mulai Perjalanan Finansialmu!</h3>
              <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">Catat transaksi pertamamu dan mulai kelola keuangan dengan lebih baik</p>
              <Link href="/cashflow" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl gradient-accent text-black font-semibold hover:opacity-90 transition-opacity">
                <span>+</span> Tambah Transaksi Pertama
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

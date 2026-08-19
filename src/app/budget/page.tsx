'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';
import AccessibleDialog from '@/components/ui/AccessibleDialog';
import { useFeedback } from '@/components/providers/FeedbackProvider';

interface BudgetWithSpent {
  id: string;
  category: string;
  amount: number;
  period: string;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

const EXPENSE_CATEGORIES = ['Rent', 'Living', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Investment', 'Other'];

function isBudgetWithSpent(value: unknown): value is BudgetWithSpent {
  if (typeof value !== 'object' || value === null) return false;
  const budget = value as Partial<BudgetWithSpent>;
  return typeof budget.id === 'string'
    && typeof budget.category === 'string'
    && typeof budget.period === 'string'
    && typeof budget.isOverBudget === 'boolean'
    && [budget.amount, budget.spent, budget.remaining, budget.percentage].every(Number.isFinite);
}

export default function BudgetPage() {
  useSession();
  const { showFeedback, confirmAction } = useFeedback();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');

  useEffect(() => { fetchBudgets(); }, []);

  async function fetchBudgets() {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/budgets');
      if (!res.ok) throw new Error('Budgets unavailable');
      const data = await res.json() as { responseStatus?: unknown; responseDetails?: unknown };
      if (data.responseStatus !== 'SUCCESS' || !Array.isArray(data.responseDetails) || !data.responseDetails.every(isBudgetWithSpent)) {
        throw new Error('Budgets unavailable');
      }
      setBudgets(data.responseDetails);
    } catch { setError('Budget data is unavailable.'); } finally { setIsLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setIsSaving(true);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, amount: parseFloat(amount) || 0, period }),
      });
      const data = await res.json();
      if (!res.ok) {
        void showFeedback({ tone: 'error', title: 'Budget tidak tersimpan', message: data.responseMessage || 'Periksa data budget lalu coba kembali.' });
        return;
      }
      setShowForm(false);
      setAmount('');
      await fetchBudgets();
      void showFeedback({ tone: 'success', title: 'Budget berhasil disimpan', message: `Budget ${category} telah diperbarui untuk periode ${getPeriodLabel(period).toLowerCase()}.` });
    } catch {
      void showFeedback({ tone: 'error', title: 'Budget tidak tersimpan', message: 'Terjadi gangguan saat menyimpan budget. Silakan coba kembali.' });
    } finally { setIsSaving(false); }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmAction({
      title: 'Hapus budget?',
      message: 'Budget ini akan dihapus secara permanen. Transaksi yang sudah tercatat tidak ikut dihapus.',
      confirmLabel: 'Hapus budget',
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        void showFeedback({ tone: 'error', title: 'Budget tidak terhapus', message: data?.responseMessage || 'Budget tidak dapat dihapus. Silakan coba kembali.' });
        return;
      }
      await fetchBudgets();
      void showFeedback({ tone: 'success', title: 'Budget berhasil dihapus', message: 'Budget telah dihapus dari daftar.' });
    } catch {
      void showFeedback({ tone: 'error', title: 'Budget tidak terhapus', message: 'Terjadi gangguan saat menghapus budget. Silakan coba kembali.' });
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const fmtC = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const getPeriodLabel = (p: string) => p === 'WEEKLY' ? 'Weekly' : p === 'YEARLY' ? 'Yearly' : 'Monthly';

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overBudgetCount = budgets.filter(b => b.isOverBudget).length;
  const warningCount = budgets.filter(b => b.percentage >= 80 && !b.isOverBudget).length;

  // Categories without budget
  const budgetedCategories = budgets.map(b => b.category);
  const unbugdetedCategories = EXPENSE_CATEGORIES.filter(c => !budgetedCategories.includes(c));

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page budgets-page lg:ml-64 p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#16332f]">Budget</h2>
            <p className="text-sm text-zinc-600">Set spending limits per category</p>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-[#00d4aa] text-[#16332f] rounded-xl text-sm font-medium hover:bg-[#00a88a]">Create budget</button>
        </div>

        {error ? (
          <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-700">
            <p className="font-semibold">Budget data is unavailable</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => { void fetchBudgets(); }}
              className="mt-4 rounded-lg bg-[#16332f] px-4 py-2 font-medium text-white hover:bg-[#24544c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f6b] focus-visible:ring-offset-2"
            >
              Retry loading budgets
            </button>
          </div>
        ) : isLoading ? <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div> : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card rounded-xl p-4">
                <p className="text-xs text-zinc-600 mb-1">Total Budget</p>
                <p className="text-2xl font-bold text-[#16332f]">{fmtC(totalBudget)}</p>
                <p className="text-xs text-zinc-500">{budgets.length} categories</p>
              </div>
              <div className="card rounded-xl p-4">
                <p className="text-xs text-zinc-600 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-red-400">{fmtC(totalSpent)}</p>
                <p className="text-xs text-zinc-500">{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% of budget</p>
              </div>
              <div className="card rounded-xl p-4">
                <p className="text-xs text-zinc-600 mb-1">Remaining</p>
                <p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtC(Math.max(0, totalBudget - totalSpent))}</p>
              </div>
              <div className="card rounded-xl p-4">
                <p className="text-xs text-zinc-600 mb-1">Alerts</p>
                <div className="flex items-center gap-2">
                  {overBudgetCount > 0 && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">{overBudgetCount} over</span>}
                  {warningCount > 0 && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">{warningCount} warning</span>}
                  {overBudgetCount === 0 && warningCount === 0 && <span className="text-green-400 text-sm">All good</span>}
                </div>
              </div>
            </div>

            {/* Form Modal */}
            <AccessibleDialog open={showForm} labelledBy="budget-dialog-title" onClose={() => setShowForm(false)}>
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                  <h3 id="budget-dialog-title" className="font-semibold text-[#16332f] text-lg mb-4">Create budget</h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="budget-category" className="block text-xs text-zinc-400 mb-1">Category</label>
                      <select id="budget-category" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="budget-amount" className="block text-xs text-zinc-400 mb-1">Budget amount</label>
                      <CurrencyInput id="budget-amount" value={amount} onChange={setAmount} required className="w-full py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]" />
                    </div>
                    <div>
                      <label htmlFor="budget-period" className="block text-xs text-zinc-400 mb-1">Period</label>
                      <select id="budget-period" value={period} onChange={e => setPeriod(e.target.value as typeof period)} className="w-full px-3 py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]">
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-[#00d4aa] text-[#16332f] rounded-lg text-sm font-medium hover:bg-[#00a88a] disabled:opacity-50">{isSaving ? '...' : 'Save'}</button>
                      <button type="button" data-dialog-initial-focus onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#e9f5f2] text-zinc-400 rounded-lg text-sm">Cancel</button>
                    </div>
                  </form>
                </div>
            </AccessibleDialog>

            {/* Budget List */}
            <div className="card rounded-xl p-5">
              <h3 className="font-semibold text-[#16332f] mb-4">Budgets by category</h3>
              {budgets.length === 0 ? (
                <div className="text-center py-10" role="status" aria-live="polite">
                  <div className="mx-auto mb-4 w-20 h-20 rounded-3xl bg-[#00d4aa]/10 border border-[#00d4aa]/30 flex items-center justify-center">
                    <svg className="w-10 h-10 text-[#00a88a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[#16332f] mb-2">No budgets set</h3>
                  <p className="text-sm text-zinc-500 mb-4 max-w-sm mx-auto leading-relaxed">Create spending limits to keep your finances on track. Budgets help you stay within your planned categories.</p>
                  <button onClick={() => setShowForm(true)} data-dialog-initial-focus className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl gradient-accent text-[#16332f] font-semibold text-sm hover:opacity-90 transition-opacity shadow-md shadow-[#00d4aa]/20">
                    Create your first budget
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.sort((a, b) => b.percentage - a.percentage).map(budget => (
                    <div key={budget.id} className={`p-4 rounded-xl ${budget.isOverBudget ? 'bg-red-500/10 border border-red-500/30' : budget.percentage >= 80 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-[#f5fbf9]'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#16332f]">{budget.category}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-[#e9f5f2] text-zinc-400 rounded-full">{getPeriodLabel(budget.period)}</span>
                          {budget.isOverBudget && <span className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded-full">Over Budget!</span>}
                          {!budget.isOverBudget && budget.percentage >= 80 && <span className="text-[10px] px-2 py-0.5 bg-amber-500 text-[#16332f] rounded-full">Warning</span>}
                        </div>
                        <button onClick={() => handleDelete(budget.id)} className="p-1 text-zinc-500 hover:text-red-400">
                          Delete
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-3 bg-[#e9f5f2] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${budget.isOverBudget ? 'bg-red-500' : budget.percentage >= 80 ? 'bg-amber-500' : budget.percentage >= 50 ? 'bg-blue-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, budget.percentage)}%` }}></div>
                        </div>
                        <span className={`text-sm font-bold w-14 text-right ${budget.isOverBudget ? 'text-red-400' : 'text-zinc-300'}`}>{budget.percentage.toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Spent: {fmt(budget.spent)}</span>
                        <span>Budget: {fmt(budget.amount)}</span>
                        <span className={budget.remaining > 0 ? 'text-green-400' : 'text-red-400'}>
                          {budget.remaining > 0 ? `Remaining: ${fmtC(budget.remaining)}` : `Over: ${fmtC(Math.abs(budget.remaining))}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unbudgeted Categories */}
            {unbugdetedCategories.length > 0 && (
              <div className="card rounded-xl p-5">
                <h3 className="font-semibold text-[#16332f] mb-3">Categories without budgets</h3>
                <div className="flex flex-wrap gap-2">
                  {unbugdetedCategories.map(cat => (
                    <button key={cat} onClick={() => { setCategory(cat); setShowForm(true); }} className="px-3 py-1.5 bg-[#e9f5f2] text-zinc-400 text-xs rounded-lg hover:bg-white/20">
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

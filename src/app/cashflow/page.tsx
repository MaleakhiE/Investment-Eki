'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: number;
}

interface MonthlySummary {
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  expense_by_category: Record<string, number>;
}

const EXPENSE_CATEGORIES = ['Rent', 'Living', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Investment', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Bonus', 'Investment', 'Freelance', 'Gift', 'Other'];
const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

export default function CashflowPage() {
  useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  // New: Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');

  const fetchTransactions = useCallback(async () => {
    try {
      const [year, month] = filterMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        const txList = data.responseDetails?.transactions;
        setTransactions(Array.isArray(txList) ? txList : []);
      }
    } catch (err) { console.error(err); }
  }, [filterMonth]);

  const fetchSummary = useCallback(async () => {
    try {
      const [year, month] = filterMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const response = await fetch(`/api/transactions/summary-range?startDate=${startDate}&endDate=${endDate}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.responseDetails);
      }
    } catch (err) { console.error(err); }
  }, [filterMonth]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchTransactions(), fetchSummary()]).finally(() => setIsLoading(false));
  }, [fetchTransactions, fetchSummary]);

  const resetForm = () => { setEditingId(null); setDate(new Date().toISOString().split('T')[0]); setType('EXPENSE'); setCategory('Food'); setDescription(''); setAmount(''); setError(''); setSuccess(''); };
  const loadTransaction = (tx: Transaction) => { setEditingId(tx.id); setDate(tx.date.split('T')[0]); setType(tx.type); setCategory(tx.category); setDescription(tx.description || ''); setAmount(tx.amount.toString()); setError(''); setSuccess(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setIsSaving(true);
    const numAmount = parseFloat(amount.replace(/[^\d]/g, ''));
    if (!numAmount || numAmount <= 0) { setError('Amount harus lebih dari 0'); setIsSaving(false); return; }
    try {
      const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
      const response = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, type, category, description, amount: numAmount }) });
      const data = await response.json();
      if (response.ok) { setSuccess(editingId ? 'Updated!' : 'Added!'); resetForm(); await Promise.all([fetchTransactions(), fetchSummary()]); }
      else { setError(data.responseMessage || 'Failed'); }
    } catch { setError('Failed'); } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try { const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' }); if (response.ok) { await Promise.all([fetchTransactions(), fetchSummary()]); } } catch (err) { console.error(err); }
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const fmtC = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const fmtD = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const cats = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const income = summary?.total_income || 0;
  const expense = summary?.total_expense || 0;
  const net = summary?.net_cashflow || 0;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(0) : '0';

  // Filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === '' || 
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
    const matchesType = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getWeeks = () => {
    const [year, month] = filterMonth.split('-').map(Number);
    const weeks: { label: string; income: number; expense: number }[] = [];
    const lastDay = new Date(year, month, 0).getDate();
    let ws = 1, wn = 1;
    while (ws <= lastDay) {
      const we = Math.min(ws + 6, lastDay);
      const ss = `${year}-${String(month).padStart(2, '0')}-${String(ws).padStart(2, '0')}`;
      const es = `${year}-${String(month).padStart(2, '0')}-${String(we).padStart(2, '0')}`;
      const wtx = transactions.filter(tx => { const d = tx.date.split('T')[0]; return d >= ss && d <= es; });
      weeks.push({ label: `W${wn}`, income: wtx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0), expense: wtx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0) });
      ws = we + 1; wn++;
    }
    return weeks;
  };
  const weeks = getWeeks();
  const maxW = Math.max(...weeks.map(w => Math.max(w.income, w.expense)), 1);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-3 sm:p-4 lg:p-6">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900">Transactions</h2>
          <p className="text-xs sm:text-sm text-zinc-600">Kelola pemasukan dan pengeluaran</p>
        </div>
        {isLoading ? <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div> : (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5">
                <p className="text-[10px] sm:text-sm text-zinc-600">Net Cashflow</p>
                <p className={`text-base sm:text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtC(net)}</p>
                <p className="text-[9px] sm:text-xs text-zinc-500 mt-1">Save rate: {savingsRate}%</p>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5">
                <p className="text-[10px] sm:text-sm text-zinc-600">Income</p>
                <p className="text-base sm:text-2xl font-bold text-green-600">{fmtC(income)}</p>
                <p className="text-[9px] sm:text-xs text-zinc-500 mt-1">{transactions.filter(t => t.type === 'INCOME').length} transaksi</p>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5">
                <p className="text-[10px] sm:text-sm text-zinc-600">Expense</p>
                <p className="text-base sm:text-2xl font-bold text-red-500">{fmtC(expense)}</p>
                <p className="text-[9px] sm:text-xs text-zinc-500 mt-1">{transactions.filter(t => t.type === 'EXPENSE').length} transaksi</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Filter</p>
                    <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="text-sm sm:text-lg font-semibold text-zinc-900 border-0 bg-transparent focus:outline-none cursor-pointer" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-zinc-500">Total</p>
                    <p className="text-lg sm:text-xl font-bold text-zinc-900">{transactions.length}</p>
                  </div>
                </div>
                <div className="border-t border-zinc-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] sm:text-xs text-zinc-600">Trend Mingguan</p>
                    <div className="flex gap-2 text-[8px] sm:text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-400"></span><span className="text-zinc-600">In</span></span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400"></span><span className="text-zinc-600">Out</span></span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-24 sm:h-28">
                    {weeks.map((w, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full flex gap-0.5 items-end justify-center h-16 sm:h-20">
                          <div className="w-2.5 sm:w-3 bg-green-400 rounded-t transition-all" style={{ height: `${Math.max((w.income / maxW) * 100, w.income > 0 ? 8 : 0)}%` }}></div>
                          <div className="w-2.5 sm:w-3 bg-red-400 rounded-t transition-all" style={{ height: `${Math.max((w.expense / maxW) * 100, w.expense > 0 ? 8 : 0)}%` }}></div>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-zinc-600 mt-1 font-medium">{w.label}</p>
                        <p className="text-[7px] sm:text-[8px] text-zinc-500 leading-tight">{w.income > 0 || w.expense > 0 ? fmtC(w.expense) : '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <h3 className="font-semibold text-zinc-900 text-sm sm:text-base mb-3">{editingId ? 'Edit' : 'Tambah'} Transaksi</h3>
                {error && <div className="mb-2 p-2 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>}
                {success && <div className="mb-2 p-2 bg-green-50 text-green-600 text-xs rounded-lg">{success}</div>}
                <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm" required /></div>
                    <div><label className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Tipe</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { setType('EXPENSE'); setCategory('Food'); }} className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium ${type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Expense</button>
                        <button type="button" onClick={() => { setType('INCOME'); setCategory('Salary'); }} className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium ${type === 'INCOME' ? 'bg-green-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>Income</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Kategori</label><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm">{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Jumlah</label><CurrencyInput value={amount} onChange={setAmount} placeholder="0" className="w-full py-1.5 sm:py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm" /></div>
                  </div>
                  <div><label className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Keterangan</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opsional..." className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm" /></div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{isSaving ? '...' : editingId ? 'Update' : 'Tambah'}</button>
                    {editingId && <button type="button" onClick={resetForm} className="px-3 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs sm:text-sm">Batal</button>}
                  </div>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-zinc-900 text-sm sm:text-base">Riwayat Transaksi</h3>
                  {transactions.length > 5 && <button onClick={() => setShowAllModal(true)} className="text-[10px] sm:text-xs text-blue-600 hover:underline">Lihat Semua</button>}
                </div>
                {/* Search and Filter */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="flex-1 min-w-[120px]">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari..." className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg" />
                  </div>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} className="px-2 py-1.5 text-xs border border-zinc-200 rounded-lg">
                    <option value="all">Semua Tipe</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-2 py-1.5 text-xs border border-zinc-200 rounded-lg">
                    <option value="all">Semua Kategori</option>
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {filteredTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTransactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 bg-zinc-50 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                            <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === 'INCOME' ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} /></svg>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-zinc-900">{tx.category}</p>
                            <p className="text-[10px] sm:text-xs text-zinc-500">{fmtD(tx.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <p className={`text-xs sm:text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : '-'}{fmtC(tx.amount)}</p>
                          <button onClick={() => loadTransaction(tx)} className="p-1 text-zinc-500 hover:text-blue-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          <button onClick={() => handleDelete(tx.id)} className="p-1 text-zinc-500 hover:text-red-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs sm:text-sm text-zinc-500 text-center py-6">{searchQuery || filterCategory !== 'all' || filterType !== 'all' ? 'Tidak ada hasil' : 'Belum ada transaksi'}</p>}
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <h3 className="font-semibold text-zinc-900 text-sm sm:text-base mb-3">Pengeluaran per Kategori</h3>
                {summary?.expense_by_category && Object.keys(summary.expense_by_category).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(summary.expense_by_category).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs sm:text-sm text-zinc-700">{cat}</span>
                            <span className="text-xs sm:text-sm font-medium text-zinc-900">{fmt(amt)}</span>
                          </div>
                          <div className="h-1 sm:h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${expense > 0 ? (amt / expense) * 100 : 0}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs sm:text-sm text-zinc-500 text-center py-6">Belum ada data</p>}
              </div>
            </div>
          </div>
        )}

        {showAllModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAllModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                <h3 className="font-semibold text-zinc-900">Semua Transaksi</h3>
                <button onClick={() => setShowAllModal(false)} className="p-1 text-zinc-500 hover:text-zinc-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <svg className={`w-4 h-4 ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tx.type === 'INCOME' ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{tx.category}</p>
                        <p className="text-xs text-zinc-500">{fmtD(tx.date)}{tx.description && ` • ${tx.description}`}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-zinc-100 flex justify-between text-sm">
                <span className="text-zinc-600">{transactions.length} transaksi</span>
                <span className={`font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>Net: {fmt(net)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

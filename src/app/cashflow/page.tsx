'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';
import AccessibleDialog from '@/components/ui/AccessibleDialog';
import { AccountTransferLabel, type AccountSummary } from '@/components/accounts/AccountCard';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { getOcrProgressMessage, OCR_REQUEST_TIMEOUT_MS, prepareReceiptForOcr } from '@/lib/receipt-image-client';
import { formatCurrency, formatDate } from '@/lib/format';
import TransactionImportPreview from '@/components/transactions/TransactionImportPreview';

interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  description: string;
  amount: number;
  account?: string | null;
  account_id?: string | null;
  destination_account_id?: string | null;
  source_account_name?: string | null;
  destination_account_name?: string | null;
  receipt_image?: string | null;
  has_receipt?: boolean;
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
  const { showFeedback, confirmAction } = useFeedback();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [accountsError, setAccountsError] = useState(false);
  const [transactionsError, setTransactionsError] = useState(false);
  const [summaryError, setSummaryError] = useState(false);
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
  const [accountChoice, setAccountChoice] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptTouched, setReceiptTouched] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanElapsed, setScanElapsed] = useState(0);
  // New: Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('all');
  const closeAllTransactions = useCallback(() => setShowAllModal(false), []);

  const fetchAccounts = useCallback(async () => {
    setAccountsError(false);
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Accounts unavailable');
      const data = await response.json();
      const list = Array.isArray(data.responseDetails) ? data.responseDetails : [];
      setAccounts(list);
      setAccountChoice((current) => current || list[0]?.id || '');
    } catch { setAccounts([]); setAccountsError(true); }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTransactionsError(false);
    try {
      const [year, month] = filterMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const response = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Transactions unavailable');
      const data = await response.json();
      const txList = data.responseDetails?.transactions;
      setTransactions(Array.isArray(txList) ? txList : []);
    } catch { console.error('cashflow_transactions_fetch_failed'); setTransactions([]); setTransactionsError(true); }
  }, [filterMonth]);

  const fetchSummary = useCallback(async () => {
    setSummaryError(false);
    try {
      const [year, month] = filterMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const response = await fetch(`/api/transactions/summary-range?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) throw new Error('Summary unavailable');
      const data = await response.json();
      setSummary(data.responseDetails);
    } catch { console.error('cashflow_summary_fetch_failed'); setSummary(null); setSummaryError(true); }
  }, [filterMonth]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchTransactions(), fetchSummary(), fetchAccounts()]).finally(() => setIsLoading(false));
  }, [fetchTransactions, fetchSummary, fetchAccounts]);

  useEffect(() => {
    if (!isScanning) { setScanElapsed(0); return; }
    const startedAt = Date.now();
    const interval = window.setInterval(() => setScanElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [isScanning]);

  const resetForm = () => { setEditingId(null); setDate(new Date().toISOString().split('T')[0]); setType('EXPENSE'); setCategory('Food'); setDescription(''); setAmount(''); setAccountChoice(accounts[0]?.id || ''); setReceiptImage(null); setReceiptTouched(false); setError(''); };
  const loadTransaction = (tx: Transaction) => { if (tx.type === 'TRANSFER') return; setEditingId(tx.id); setDate(tx.date.split('T')[0]); setType(tx.type); setCategory(tx.category); setDescription(tx.description || ''); setAmount(tx.amount.toString()); setAccountChoice(tx.account_id || accounts.find((account) => account.name === tx.account)?.id || accounts[0]?.id || ''); setReceiptImage(null); setReceiptTouched(false); setError(''); };

  const handleReceiptScan = async (file: File | undefined) => {
    if (!file) return;
    setError(''); setIsScanning(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), OCR_REQUEST_TIMEOUT_MS);
    try {
      const optimizedFile = await prepareReceiptForOcr(file);
      const formData = new FormData();
      formData.append('image', optimizedFile);
      const response = await fetch('/api/transactions/ocr-scan', { method: 'POST', body: formData, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.responseMessage || 'Unable to scan receipt');
      const scan = data.responseDetails || {};
      if (scan.amount) setAmount(String(scan.amount));
      if (scan.date) setDate(scan.date);
      if (scan.merchant) setDescription(scan.merchant);
      if (scan.categoryGuess && EXPENSE_CATEGORIES.includes(scan.categoryGuess)) setCategory(scan.categoryGuess);
      setType('EXPENSE');
      setReceiptImage(scan.receipt_image || null);
      setReceiptTouched(true);
      void showFeedback({
        tone: 'success',
        title: 'Receipt scanned',
        message: 'The receipt details were added to the form. Review them before saving the transaction.',
        primaryLabel: 'Review details',
      });
    } catch (scanError) {
      const message = scanError instanceof DOMException && scanError.name === 'AbortError'
        ? 'Receipt scan timed out. Try a clearer photo with the receipt filling the frame.'
        : scanError instanceof Error ? scanError.message : 'Unable to scan receipt';
      void showFeedback({ tone: 'error', title: 'Receipt scan failed', message });
    } finally { window.clearTimeout(timeout); setIsScanning(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsSaving(true);
    const numAmount = parseFloat(amount.replace(/[^\d]/g, ''));
    if (!numAmount || numAmount <= 0) { setError('Amount must be greater than zero'); setIsSaving(false); return; }
    try {
      const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';
      if (!accountChoice) throw new Error('Create an account before adding a transaction');
      const payload = { date, type, category, description, amount: numAmount, account_id: accountChoice, ...(!editingId || receiptTouched ? { receipt_image: receiptImage } : {}) };
      const response = await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.responseDetails?.errors?.[0] || data.responseMessage || 'Unable to save transaction');

      const wasEditing = Boolean(editingId);
      resetForm();
      await Promise.all([fetchTransactions(), fetchSummary(), fetchAccounts()]);
      void showFeedback({
        tone: 'success',
        title: wasEditing ? 'Transaction updated' : 'Transaction added',
        message: wasEditing
          ? 'Your transaction changes have been saved.'
          : 'The transaction has been added to your cashflow.',
      });
    } catch (submitError) {
      void showFeedback({
        tone: 'error',
        title: editingId ? 'Unable to update transaction' : 'Unable to add transaction',
        message: submitError instanceof Error ? submitError.message : 'Unable to save transaction',
      });
    } finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: 'Delete transaction?',
      message: 'This transaction will be permanently removed and the related account balance will be recalculated.',
      tone: 'error',
      confirmLabel: 'Delete transaction',
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.responseDetails?.errors?.[0] || data?.responseMessage || 'Unable to delete transaction');
      await Promise.all([fetchTransactions(), fetchSummary(), fetchAccounts()]);
      void showFeedback({
        tone: 'success',
        title: 'Transaction deleted',
        message: 'The transaction was removed and your account balances were refreshed.',
      });
    } catch (deleteError) {
      void showFeedback({
        tone: 'error',
        title: 'Unable to delete transaction',
        message: deleteError instanceof Error ? deleteError.message : 'Please try again.',
      });
    }
  };

  const fmt = (v: number) => formatCurrency(v, 'IDR');
  const fmtC = (v: number) => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const fmtD = formatDate;
  const cats = type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const income = summary?.total_income || 0;
  const expense = summary?.total_expense || 0;
  const net = summary?.net_cashflow || 0;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(0) : '0';

  // Filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchQuery === '' || 
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.account && tx.account.toLowerCase().includes(searchQuery.toLowerCase()));
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
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page activity-page lg:ml-64 p-3 sm:p-4 lg:p-6">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#16332f]">Transactions</h2>
          <p className="text-xs sm:text-sm text-zinc-600">Track income and expenses</p>
        </div>
        <div className="mb-4"><TransactionImportPreview /></div>
        {isLoading ? <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div> : (
          <div className="space-y-3 sm:space-y-4">
            {accountsError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Account data is unavailable.{' '}<button type="button" onClick={() => { setIsLoading(true); void fetchAccounts().finally(() => setIsLoading(false)); }} className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">Retry loading accounts</button></p>}
            {(transactionsError || summaryError) && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">Cashflow data is unavailable.{' '}<button type="button" onClick={() => { setIsLoading(true); void Promise.all([fetchTransactions(), fetchSummary()]).finally(() => setIsLoading(false)); }} className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">Retry loading cashflow</button></p>}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5">
                <p className="text-[10px] sm:text-sm text-zinc-600">Net Cashflow</p>
                <p className={`text-base sm:text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtC(net)}</p>
                <p className="text-[9px] sm:text-xs text-zinc-500 mt-1">Save rate: {savingsRate}%</p>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5">
                <p className="text-[10px] sm:text-sm text-zinc-600">Income</p>
                <p className="text-base sm:text-2xl font-bold text-green-600">{fmtC(income)}</p>
                <p className="text-[9px] sm:text-xs text-zinc-500 mt-1">{transactions.filter(t => t.type === 'INCOME').length} transactions</p>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-5">
                <p className="text-[10px] sm:text-sm text-zinc-600">Expense</p>
                <p className="text-base sm:text-2xl font-bold text-red-500">{fmtC(expense)}</p>
                <p className="text-[9px] sm:text-xs text-zinc-500 mt-1">{transactions.filter(t => t.type === 'EXPENSE').length} transactions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Filter</p>
                    <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="text-sm sm:text-lg font-semibold text-[#16332f] border-0 bg-transparent focus:outline-none cursor-pointer" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-zinc-500">Total</p>
                    <p className="text-lg sm:text-xl font-bold text-[#16332f]">{transactions.length}</p>
                  </div>
                </div>
                <div className="border-t border-[#dcece8] pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] sm:text-xs text-zinc-600">Weekly trend</p>
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
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-[#16332f] text-sm sm:text-base">{editingId ? 'Edit' : 'Add'} Activity</h3>
                  <label className="cursor-pointer rounded-lg border border-[#00d4aa]/30 bg-[#00d4aa]/10 px-3 py-2 text-[10px] font-semibold text-[#00a88a] hover:bg-[#00d4aa]/20 sm:text-xs">
                    {isScanning ? `Scanning ${scanElapsed}s` : 'Scan receipt'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={isScanning} onChange={(event) => { void handleReceiptScan(event.target.files?.[0]); event.target.value = ''; }} className="sr-only" />
                  </label>
                </div>
                {isScanning && <div role="status" className="mb-3 rounded-xl border border-[#bce9de] bg-[#eaf8f4] px-3 py-2 text-xs text-[#087f6b]">{getOcrProgressMessage(scanElapsed)}</div>}
                {error && <div className="mb-2 p-2 bg-red-500/20 text-red-400 text-xs rounded-lg">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label htmlFor="transaction-date" className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Date</label><input id="transaction-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-[#dcece8] rounded-lg text-xs sm:text-sm" required /></div>
                    <div><label className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Type</label>
                      <div className="flex gap-1">
                        <button type="button" aria-pressed={type === 'EXPENSE'} onClick={() => { setType('EXPENSE'); setCategory('Food'); }} className={`min-h-11 flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium ${type === 'EXPENSE' ? 'bg-red-500 text-white' : 'bg-[#e9f5f2] text-zinc-600'}`}>Expense</button>
                        <button type="button" aria-pressed={type === 'INCOME'} onClick={() => { setType('INCOME'); setCategory('Salary'); }} className={`min-h-11 flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium ${type === 'INCOME' ? 'bg-green-500 text-white' : 'bg-[#e9f5f2] text-zinc-600'}`}>Income</button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label htmlFor="transaction-category" className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Category</label><select id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-[#dcece8] rounded-lg text-xs sm:text-sm">{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label htmlFor="transaction-amount" className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Amount</label><CurrencyInput id="transaction-amount" value={amount} onChange={setAmount} placeholder="0" className="w-full py-1.5 sm:py-2 border border-[#dcece8] rounded-lg text-xs sm:text-sm" /></div>
                  </div>
                  <div><label htmlFor="transaction-description" className="block text-[10px] sm:text-xs text-zinc-600 mb-1">Description</label><input id="transaction-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..." className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-[#dcece8] rounded-lg text-xs sm:text-sm" /></div>
                  <div><div className="mb-1 flex items-center justify-between gap-2"><label htmlFor="transaction-account" className="block text-[10px] sm:text-xs text-zinc-600">Account or wallet</label><a href="/accounts" className="text-[10px] font-semibold text-[#00a88a] sm:text-xs">Manage accounts</a></div><select id="transaction-account" required value={accountChoice} onChange={(e) => setAccountChoice(e.target.value)} className="w-full min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 border border-[#dcece8] rounded-lg text-xs sm:text-sm"><option value="" disabled>Select an account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {fmt(account.balance)}</option>)}</select>{accounts.length === 0 && <p className="mt-1 text-[10px] text-red-600">Create an account before adding activity.</p>}</div>
                  {receiptImage && <div className="flex items-center justify-between rounded-lg bg-[#00d4aa]/10 px-3 py-2 text-[10px] text-[#007f6d] sm:text-xs"><span>Receipt image will be saved</span><button type="button" onClick={() => { setReceiptImage(null); setReceiptTouched(true); }} className="font-semibold hover:underline">Delete</button></div>}
                  {editingId && !receiptImage && !receiptTouched && transactions.find((tx) => tx.id === editingId)?.has_receipt && <div className="flex items-center justify-between rounded-lg bg-[#00d4aa]/10 px-3 py-2 text-[10px] text-[#007f6d] sm:text-xs"><span>Receipt saved</span><button type="button" onClick={() => { setReceiptImage(null); setReceiptTouched(true); }} className="font-semibold hover:underline">Delete</button></div>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-[#00d4aa] text-[#16332f] rounded-lg text-xs sm:text-sm font-medium hover:bg-[#00a88a] disabled:opacity-50">{isSaving ? '...' : editingId ? 'Update' : 'Add'}</button>
                    {editingId && <button type="button" onClick={resetForm} className="px-3 py-2 bg-[#e9f5f2] text-zinc-600 rounded-lg text-xs sm:text-sm">Cancel</button>}
                  </div>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#16332f] text-sm sm:text-base">Transaction history</h3>
                  {transactions.length > 5 && <button onClick={() => setShowAllModal(true)} className="text-[10px] sm:text-xs text-[#00d4aa] hover:underline">View all</button>}
                </div>
                {/* Search and Filter */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <div className="flex-1 min-w-[120px]">
                    <input aria-label="Search transactions" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari..." className="min-h-11 w-full px-2 py-1.5 text-xs border border-[#dcece8] rounded-lg" />
                  </div>
                  <select aria-label="Filter by transaction type" value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)} className="min-h-11 px-2 py-1.5 text-xs border border-[#dcece8] rounded-lg">
                    <option value="all">All types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                  <select aria-label="Filter by category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="min-h-11 px-2 py-1.5 text-xs border border-[#dcece8] rounded-lg">
                    <option value="all">All categories</option>
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {filteredTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTransactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 sm:p-3 bg-[#f5fbf9] rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-500/20' : tx.type === 'TRANSFER' ? 'bg-blue-500/15' : 'bg-red-500/20'}`}>
                            <span className={`text-[8px] font-semibold sm:text-[9px] ${tx.type === 'INCOME' ? 'text-green-500' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? 'IN' : tx.type === 'TRANSFER' ? 'MOVE' : 'OUT'}</span>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-[#16332f]">{tx.category}</p>
                            <p className="text-[10px] sm:text-xs text-zinc-500">{fmtD(tx.date)}{tx.type === 'TRANSFER' ? <span className="ml-1"><AccountTransferLabel source={tx.source_account_name || tx.account || 'Account'} destination={tx.destination_account_name || 'Account'} /></span> : tx.account && <span className="ml-1 rounded-full bg-[#00d4aa]/10 px-1.5 py-0.5 text-[#00a88a]">{tx.account}</span>}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <p className={`text-xs sm:text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '' : '-'}{fmtC(tx.amount)}</p>
                          {tx.type !== 'TRANSFER' && <button onClick={() => loadTransaction(tx)} className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-[#00d4aa]">Edit</button>}
                          <button onClick={() => handleDelete(tx.id)} className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-red-600">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs sm:text-sm text-zinc-500 text-center py-6">{searchQuery || filterCategory !== 'all' || filterType !== 'all' ? 'No results' : 'No transactions yet'}</p>}
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
                <h3 className="font-semibold text-[#16332f] text-sm sm:text-base mb-3">Expenses per Category</h3>
                {summary?.expense_by_category && Object.keys(summary.expense_by_category).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(summary.expense_by_category).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amt]) => (
                      <div key={cat} className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-red-500 sm:text-[10px]">KELUAR</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-xs sm:text-sm text-zinc-300">{cat}</span>
                            <span className="text-xs sm:text-sm font-medium text-[#16332f]">{fmt(amt)}</span>
                          </div>
                          <div className="h-1 sm:h-1.5 bg-[#e9f5f2] rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${expense > 0 ? (amt / expense) * 100 : 0}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="rounded-xl border border-dashed border-[#dcece8] bg-[#f5fbf9] p-8 text-center" role="status" aria-live="polite"><div aria-hidden="true" className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#dff5ef] text-xl">📊</div><h3 className="font-semibold text-[#16332f]">Belum ada data pengeluaran</h3><p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500">Catat transaksi pengeluaran Anda untuk melihat pembagian per kategori.</p></div>}
              </div>
            </div>
          </div>
        )}

        <AccessibleDialog
          open={showAllModal}
          labelledBy="all-transactions-title"
          onClose={closeAllTransactions}
        >
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#dcece8]">
                <h3 id="all-transactions-title" className="font-semibold text-[#16332f]">All transactions</h3>
                <button type="button" data-dialog-initial-focus onClick={closeAllTransactions} className="min-h-11 px-2 py-1 text-sm font-medium text-zinc-500 hover:text-zinc-700">Tutup</button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${tx.type === 'INCOME' ? 'bg-green-500/20' : tx.type === 'TRANSFER' ? 'bg-blue-500/15' : 'bg-red-500/20'}`}>
                        <span className={`text-[9px] font-semibold ${tx.type === 'INCOME' ? 'text-green-500' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? 'IN' : tx.type === 'TRANSFER' ? 'MOVE' : 'OUT'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#16332f]">{tx.category}</p>
                        <p className="text-xs text-zinc-500">{fmtD(tx.date)}{tx.description && ` • ${tx.description}`}{tx.account && <span className="ml-1 rounded-full bg-[#00d4aa]/10 px-1.5 py-0.5 text-[#00a88a]">{tx.account}</span>}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : tx.type === 'TRANSFER' ? 'text-blue-600' : 'text-red-500'}`}>{tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '' : '-'}{fmt(tx.amount)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-[#dcece8] flex justify-between text-sm">
                <span className="text-zinc-400">{transactions.length} transactions</span>
                <span className={`font-semibold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>Net: {fmt(net)}</span>
              </div>
            </div>
        </AccessibleDialog>
      </main>
    </div>
  );
}

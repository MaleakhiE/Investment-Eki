'use client';

/**
 * Cashflow Management Page
 * 
 * Provides functionality to:
 * - Add/update monthly cashflow data
 * - View cashflow history
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface CashflowRecord {
  id: string;
  month: string;
  income: number;
  expense_rent: number;
  expense_living: number;
  expense_other: number;
  total_expense: number;
  net_cashflow: number;
  created_at: string;
}

export default function CashflowPage() {
  const { data: session } = useSession();
  const [cashflows, setCashflows] = useState<CashflowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [income, setIncome] = useState('');
  const [expenseRent, setExpenseRent] = useState('');
  const [expenseLiving, setExpenseLiving] = useState('');
  const [expenseOther, setExpenseOther] = useState('');

  useEffect(() => {
    fetchCashflows();
  }, []);

  async function fetchCashflows() {
    try {
      const response = await fetch('/api/cashflow');
      if (response.ok) {
        const data = await response.json();
        setCashflows(data.responseDetails || []);
      }
    } catch (error) {
      console.error('Error fetching cashflows:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          income: parseFloat(income) || 0,
          expense_rent: parseFloat(expenseRent) || 0,
          expense_living: parseFloat(expenseLiving) || 0,
          expense_other: parseFloat(expenseOther) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.responseMessage || 'Failed to save cashflow');
        return;
      }

      setSuccess('Cashflow saved successfully');
      // Reset form
      setIncome('');
      setExpenseRent('');
      setExpenseLiving('');
      setExpenseOther('');
      // Refresh list
      fetchCashflows();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  function loadCashflow(record: CashflowRecord) {
    setMonth(record.month);
    setIncome(record.income.toString());
    setExpenseRent(record.expense_rent.toString());
    setExpenseLiving(record.expense_living.toString());
    setExpenseOther(record.expense_other.toString());
    setError('');
    setSuccess('');
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  // Calculate preview
  const previewTotalExpense =
    (parseFloat(expenseRent) || 0) +
    (parseFloat(expenseLiving) || 0) +
    (parseFloat(expenseOther) || 0);
  const previewNetCashflow = (parseFloat(income) || 0) - previewTotalExpense;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Finance Tracker
              </h1>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                <Link
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/cashflow"
                  className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400"
                >
                  Cashflow
                </Link>
                <Link
                  href="/investments"
                  className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Investments
                </Link>
                <Link
                  href="/analytics"
                  className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Analytics
                </Link>
                <Link
                  href="/settings"
                  className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {session?.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Cashflow Management
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Track your monthly income and expenses
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                Add/Update Cashflow
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Month
                  </label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Income
                  </label>
                  <input
                    type="number"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Rent Expense
                  </label>
                  <input
                    type="number"
                    value={expenseRent}
                    onChange={(e) => setExpenseRent(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Living Expense
                  </label>
                  <input
                    type="number"
                    value={expenseLiving}
                    onChange={(e) => setExpenseLiving(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Other Expense
                  </label>
                  <input
                    type="number"
                    value={expenseOther}
                    onChange={(e) => setExpenseOther(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Preview */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Total Expense</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {formatCurrency(previewTotalExpense)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Net Cashflow</span>
                    <span
                      className={`font-medium ${
                        previewNetCashflow >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(previewNetCashflow)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Cashflow'}
                </button>
              </form>
            </div>
          </div>

          {/* History Table */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">
                Cashflow History
              </h3>

              {isLoading ? (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  Loading...
                </div>
              ) : cashflows.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  No cashflow records yet. Add your first entry!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left py-3 px-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          Month
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          Income
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          Total Expense
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          Net Cashflow
                        </th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflows.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-zinc-100 dark:border-zinc-700/50"
                        >
                          <td className="py-3 px-2 text-sm text-zinc-900 dark:text-white">
                            {formatMonth(record.month)}
                          </td>
                          <td className="py-3 px-2 text-sm text-right text-zinc-900 dark:text-white">
                            {formatCurrency(record.income)}
                          </td>
                          <td className="py-3 px-2 text-sm text-right text-zinc-900 dark:text-white">
                            {formatCurrency(record.total_expense)}
                          </td>
                          <td
                            className={`py-3 px-2 text-sm text-right font-medium ${
                              record.net_cashflow >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatCurrency(record.net_cashflow)}
                          </td>
                          <td className="py-3 px-2 text-sm text-right">
                            <button
                              onClick={() => loadCashflow(record)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

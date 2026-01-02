'use client';

/**
 * Dashboard Page
 * 
 * Main dashboard displaying financial summary widgets
 */

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface CashflowTrend {
  month: string;
  net_cashflow: number;
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [cashflowTrend, setCashflowTrend] = useState<CashflowTrend[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [comparison, setComparison] = useState<InvestmentComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [trendRes, portfolioRes, comparisonRes] = await Promise.all([
          fetch('/api/analytics/cashflow-trend'),
          fetch('/api/analytics/portfolio'),
          fetch('/api/analytics/comparison'),
        ]);

        if (trendRes.ok) {
          const trendData = await trendRes.json();
          setCashflowTrend(trendData.responseDetails || []);
        }

        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          setPortfolio(portfolioData.responseDetails);
        }

        if (comparisonRes.ok) {
          const comparisonData = await comparisonRes.json();
          setComparison(comparisonData.responseDetails);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) return 'Rp 0';
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
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  const safeNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return value;
  };

  const latestCashflow = cashflowTrend.length > 0 ? cashflowTrend[cashflowTrend.length - 1] : null;

  const totalInvested = safeNumber(portfolio?.total_invested);
  const totalCurrentValue = safeNumber(portfolio?.total_current_value);
  const totalGainLoss = safeNumber(portfolio?.total_gain_loss);
  const returnPercent = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Finance Tracker</h1>
              <div className="hidden md:ml-8 md:flex md:space-x-4">
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Dashboard</Link>
                <Link href="/cashflow" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cashflow</Link>
                <Link href="/investments" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Investments</Link>
                <Link href="/analytics" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Analytics</Link>
                <Link href="/settings" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Settings</Link>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-sm text-zinc-600 dark:text-zinc-400">{session?.user?.email}</span>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Sign out</button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-600 dark:text-zinc-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-700 py-2">
            <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Dashboard</Link>
            <Link href="/cashflow" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cashflow</Link>
            <Link href="/investments" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Investments</Link>
            <Link href="/analytics" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Analytics</Link>
            <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Settings</Link>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Welcome back!</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm sm:text-base">Here&apos;s your financial overview</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64"><div className="text-zinc-500 dark:text-zinc-400">Loading...</div></div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Net Cashflow Card */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Latest Net Cashflow</h3>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{latestCashflow ? formatMonth(latestCashflow.month) : 'No data'}</span>
                </div>
                <p className={`text-xl sm:text-2xl font-bold ${latestCashflow && latestCashflow.net_cashflow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {latestCashflow ? formatCurrency(latestCashflow.net_cashflow) : '-'}
                </p>
                <Link href="/cashflow" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-3 sm:mt-4 inline-block">View details →</Link>
              </div>

              {/* Portfolio Value Card */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 sm:mb-4">Portfolio Value</h3>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(totalCurrentValue)}</p>
                <p className={`text-xs sm:text-sm mt-1 ${totalGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)} gain/loss
                </p>
                <Link href="/investments" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-3 sm:mt-4 inline-block">View details →</Link>
              </div>

              {/* Total Invested Card */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
                <h3 className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 sm:mb-4">Total Invested</h3>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{formatCurrency(totalInvested)}</p>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">{returnPercent}% return</p>
              </div>
            </div>

            {/* Investment Breakdown */}
            {comparison && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Gold */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Gold (Emas)</h3>
                  </div>
                  <div className="space-y-2 sm:space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Invested</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(safeNumber(comparison.gold?.total_invested))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Current Value</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(safeNumber(comparison.gold?.total_current_value))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Gain/Loss</span>
                      <span className={`font-medium ${safeNumber(comparison.gold?.total_gain_loss) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {safeNumber(comparison.gold?.total_gain_loss) >= 0 ? '+' : ''}{formatCurrency(safeNumber(comparison.gold?.total_gain_loss))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mutual Fund */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
                  <div className="flex items-center mb-3 sm:mb-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Mutual Fund (Reksa Dana)</h3>
                  </div>
                  <div className="space-y-2 sm:space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Invested</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(safeNumber(comparison.mutual_fund?.total_invested))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Current Value</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{formatCurrency(safeNumber(comparison.mutual_fund?.total_current_value))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">Gain/Loss</span>
                      <span className={`font-medium ${safeNumber(comparison.mutual_fund?.total_gain_loss) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {safeNumber(comparison.mutual_fund?.total_gain_loss) >= 0 ? '+' : ''}{formatCurrency(safeNumber(comparison.mutual_fund?.total_gain_loss))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cashflow Trend */}
            {cashflowTrend.length > 0 && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-3 sm:mb-4">Cashflow Trend</h3>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[300px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left py-2 sm:py-3 px-4 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Month</th>
                        <th className="text-right py-2 sm:py-3 px-4 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Net Cashflow</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflowTrend.slice(-6).reverse().map((item) => (
                        <tr key={item.month} className="border-b border-zinc-100 dark:border-zinc-700/50">
                          <td className="py-2 sm:py-3 px-4 text-xs sm:text-sm text-zinc-900 dark:text-white">{formatMonth(item.month)}</td>
                          <td className={`py-2 sm:py-3 px-4 text-xs sm:text-sm text-right font-medium ${item.net_cashflow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {formatCurrency(item.net_cashflow)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!latestCashflow && !portfolio && (
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-8 sm:p-12 text-center">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-2">No data yet</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Start by adding your monthly cashflow or investment data</p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <Link href="/cashflow" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm">Add Cashflow</Link>
                  <Link href="/investments" className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium rounded-lg transition-colors text-sm">Add Investment</Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import CurrencyInput, { formatNumber } from '@/components/ui/CurrencyInput';

interface InvestmentSnapshot {
  id: string;
  month: string;
  invested_amount: number;
  current_value: number;
  gain_loss: number;
  platform?: string;
  product_name?: string;
  units?: string;
  nav_per_unit?: string;
  created_at: string;
}

interface GoldPrice {
  sell_price: number;
  buy_price: number;
  source: string;
  updated_at: string;
}

type InvestmentType = 'GOLD' | 'MUTUAL_FUND';

const MUTUAL_FUND_PLATFORMS = [
  { value: 'bibit', label: 'Bibit' },
  { value: 'bareksa', label: 'Bareksa' },
  { value: 'ajaib', label: 'Ajaib' },
  { value: 'ipot', label: 'IPOT (Indo Premier)' },
  { value: 'tanamduit', label: 'Tanamduit' },
  { value: 'pluang', label: 'Pluang' },
  { value: 'other', label: 'Lainnya' },
];

export default function InvestmentsPage() {
  const { data: session } = useSession();
  const [goldSnapshots, setGoldSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [mutualFundSnapshots, setMutualFundSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState<InvestmentType>('GOLD');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  // Gold-specific fields
  const [goldGrams, setGoldGrams] = useState('');
  const [goldPricePerGram, setGoldPricePerGram] = useState('');
  const [useGoldCalculator, setUseGoldCalculator] = useState(true);
  const [goldPriceData, setGoldPriceData] = useState<GoldPrice | null>(null);
  const [isLoadingGoldPrice, setIsLoadingGoldPrice] = useState(false);
  const [goldPriceError, setGoldPriceError] = useState('');

  // Mutual Fund specific fields
  const [mfPlatform, setMfPlatform] = useState('bibit');
  const [mfProductName, setMfProductName] = useState('');
  const [mfUnits, setMfUnits] = useState('');
  const [mfNavPerUnit, setMfNavPerUnit] = useState('');
  const [useMfCalculator, setUseMfCalculator] = useState(true);

  const fetchGoldPrice = useCallback(async () => {
    setIsLoadingGoldPrice(true);
    setGoldPriceError('');
    try {
      const response = await fetch('/api/gold-price');
      if (response.ok) {
        const data = await response.json();
        if (data.responseDetails) {
          setGoldPriceData(data.responseDetails);
          setGoldPricePerGram(data.responseDetails.sell_price.toString());
        }
      } else {
        setGoldPriceError('Gagal mengambil harga emas');
      }
    } catch (err) {
      console.error('Error fetching gold price:', err);
      setGoldPriceError('Gagal mengambil harga emas');
      setGoldPricePerGram('1450000');
    } finally {
      setIsLoadingGoldPrice(false);
    }
  }, []);

  useEffect(() => { fetchGoldPrice(); }, [fetchGoldPrice]);

  // Auto-calculate current value for gold
  useEffect(() => {
    if (selectedType === 'GOLD' && useGoldCalculator) {
      const grams = parseFloat(goldGrams) || 0;
      const pricePerGram = parseFloat(goldPricePerGram) || 0;
      const calculatedValue = grams * pricePerGram;
      setCurrentValue(calculatedValue > 0 ? Math.round(calculatedValue).toString() : '');
    }
  }, [goldGrams, goldPricePerGram, selectedType, useGoldCalculator]);

  // Auto-calculate current value for mutual fund
  useEffect(() => {
    if (selectedType === 'MUTUAL_FUND' && useMfCalculator) {
      const units = parseFloat(mfUnits) || 0;
      const nav = parseFloat(mfNavPerUnit) || 0;
      const calculatedValue = units * nav;
      setCurrentValue(calculatedValue > 0 ? Math.round(calculatedValue).toString() : '');
    }
  }, [mfUnits, mfNavPerUnit, selectedType, useMfCalculator]);

  const calculateGramsFromInvestment = () => {
    const invested = parseFloat(investedAmount) || 0;
    const buyPrice = parseFloat(goldPricePerGram) || 0;
    if (invested > 0 && buyPrice > 0) {
      setGoldGrams((invested / buyPrice).toFixed(4));
    }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  async function fetchSnapshots() {
    try {
      const [goldRes, mutualFundRes] = await Promise.all([
        fetch('/api/investments/GOLD/history'),
        fetch('/api/investments/MUTUAL_FUND/history'),
      ]);
      if (goldRes.ok) {
        const goldData = await goldRes.json();
        setGoldSnapshots(goldData.responseDetails || []);
      }
      if (mutualFundRes.ok) {
        const mutualFundData = await mutualFundRes.json();
        setMutualFundSnapshots(mutualFundData.responseDetails || []);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
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
      const payload: Record<string, unknown> = {
        type: selectedType,
        month,
        invested_amount: parseFloat(investedAmount) || 0,
        current_value: parseFloat(currentValue) || 0,
      };

      if (selectedType === 'MUTUAL_FUND') {
        payload.platform = mfPlatform;
        payload.product_name = mfProductName;
        payload.units = mfUnits;
        payload.nav_per_unit = mfNavPerUnit;
      }

      const response = await fetch('/api/investments/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.responseMessage || 'Failed to save snapshot');
        return;
      }

      setSuccess('Investment snapshot saved successfully');
      resetForm();
      fetchSnapshots();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setInvestedAmount('');
    setCurrentValue('');
    setGoldGrams('');
    setMfUnits('');
    setMfNavPerUnit('');
    setMfProductName('');
  }

  function loadSnapshot(snapshot: InvestmentSnapshot, type: InvestmentType) {
    setSelectedType(type);
    setMonth(snapshot.month);
    setInvestedAmount(snapshot.invested_amount.toString());
    setCurrentValue(snapshot.current_value.toString());
    if (type === 'GOLD') {
      setUseGoldCalculator(false);
    } else {
      setUseMfCalculator(false);
      setMfPlatform(snapshot.platform || 'bibit');
      setMfProductName(snapshot.product_name || '');
      setMfUnits(snapshot.units || '');
      setMfNavPerUnit(snapshot.nav_per_unit || '');
    }
    setError('');
    setSuccess('');
  }

  useEffect(() => {
    if (selectedType === 'MUTUAL_FUND') {
      setGoldGrams('');
      setUseGoldCalculator(true);
    } else {
      setMfUnits('');
      setMfNavPerUnit('');
      setUseMfCalculator(true);
    }
  }, [selectedType]);

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  const previewGainLoss = (parseFloat(currentValue) || 0) - (parseFloat(investedAmount) || 0);
  const previewReturn = parseFloat(investedAmount) > 0 ? ((previewGainLoss / parseFloat(investedAmount)) * 100).toFixed(2) : '0';

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Finance Tracker</h1>
              <div className="hidden md:ml-8 md:flex md:space-x-4">
                <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Dashboard</Link>
                <Link href="/cashflow" className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cashflow</Link>
                <Link href="/investments" className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Investments</Link>
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
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-700 py-2">
            <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Dashboard</Link>
            <Link href="/cashflow" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Cashflow</Link>
            <Link href="/investments" className="block px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400">Investments</Link>
            <Link href="/analytics" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Analytics</Link>
            <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Settings</Link>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">Investment Management</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">Track your Gold and Mutual Fund investments</p>
        </div>

        {/* Input Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-4 sm:mb-6">Add/Update Investment Snapshot</h3>

          {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}
          {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"><p className="text-sm text-green-600 dark:text-green-400">{success}</p></div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as InvestmentType)} className={inputClass}>
                  <option value="GOLD">Gold (Emas)</option>
                  <option value="MUTUAL_FUND">Mutual Fund (Reksa Dana)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Month</label>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Invested Amount (Jumlah Investasi)</label>
              <CurrencyInput value={investedAmount} onChange={setInvestedAmount} required className={inputClass} />
            </div>

            {/* Gold Calculator Section */}
            {selectedType === 'GOLD' && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300 flex items-center"><span className="mr-2">🪙</span>Kalkulator Emas</h4>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={fetchGoldPrice} disabled={isLoadingGoldPrice} className="text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors disabled:opacity-50">
                      {isLoadingGoldPrice ? '⏳' : '🔄'} Refresh
                    </button>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={useGoldCalculator} onChange={(e) => setUseGoldCalculator(e.target.checked)} className="mr-2" />
                      <span className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-400">Gunakan kalkulator</span>
                    </label>
                  </div>
                </div>

                {goldPriceData && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">💰 Harga Emas Real-time</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-500">Sumber: {goldPriceData.source}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-base sm:text-lg font-bold text-yellow-800 dark:text-yellow-300">Rp {formatNumber(goldPriceData.sell_price)}/gram</p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-500">Update: {new Date(goldPriceData.updated_at).toLocaleTimeString('id-ID')}</p>
                    </div>
                  </div>
                )}

                {goldPriceError && <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-2 text-sm text-red-600 dark:text-red-400">⚠️ {goldPriceError}</div>}

                {useGoldCalculator && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Harga per Gram (Rp)</label>
                        <CurrencyInput value={goldPricePerGram} onChange={setGoldPricePerGram} className={`${inputClass} border-yellow-300 dark:border-yellow-700`} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">Jumlah Gram</label>
                        <div className="flex gap-2">
                          <input type="number" value={goldGrams} onChange={(e) => setGoldGrams(e.target.value)} min="0" step="0.0001" placeholder="0.0000" className={`flex-1 ${inputClass} border-yellow-300 dark:border-yellow-700`} />
                          <button type="button" onClick={calculateGramsFromInvestment} className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap">Hitung</button>
                        </div>
                      </div>
                    </div>
                    {goldGrams && goldPricePerGram && (
                      <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          <span className="font-medium">{parseFloat(goldGrams).toFixed(4)} gram</span> × Rp {formatNumber(goldPricePerGram)} = <span className="font-bold">Rp {formatNumber(Math.round(parseFloat(goldGrams) * parseFloat(goldPricePerGram)))}</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Mutual Fund Calculator Section */}
            {selectedType === 'MUTUAL_FUND' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center"><span className="mr-2">📊</span>Detail Reksa Dana</h4>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={useMfCalculator} onChange={(e) => setUseMfCalculator(e.target.checked)} className="mr-2" />
                    <span className="text-xs sm:text-sm text-blue-700 dark:text-blue-400">Hitung otomatis dari NAV</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Platform</label>
                    <select value={mfPlatform} onChange={(e) => setMfPlatform(e.target.value)} className={`${inputClass} border-blue-300 dark:border-blue-700`}>
                      {MUTUAL_FUND_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Nama Produk</label>
                    <input type="text" value={mfProductName} onChange={(e) => setMfProductName(e.target.value)} placeholder="Contoh: Sucorinvest Equity Fund" className={`${inputClass} border-blue-300 dark:border-blue-700`} />
                  </div>
                </div>

                {useMfCalculator && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Jumlah Unit</label>
                        <input type="number" value={mfUnits} onChange={(e) => setMfUnits(e.target.value)} min="0" step="0.0001" placeholder="0.0000" className={`${inputClass} border-blue-300 dark:border-blue-700`} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">NAV per Unit (Rp)</label>
                        <CurrencyInput value={mfNavPerUnit} onChange={setMfNavPerUnit} className={`${inputClass} border-blue-300 dark:border-blue-700`} />
                      </div>
                    </div>
                    {mfUnits && mfNavPerUnit && (
                      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <span className="font-medium">{parseFloat(mfUnits).toFixed(4)} unit</span> × Rp {formatNumber(mfNavPerUnit)} = <span className="font-bold">Rp {formatNumber(Math.round(parseFloat(mfUnits) * parseFloat(mfNavPerUnit)))}</span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Current Value (Nilai Saat Ini)</label>
              <CurrencyInput value={currentValue} onChange={setCurrentValue} required disabled={(selectedType === 'GOLD' && useGoldCalculator) || (selectedType === 'MUTUAL_FUND' && useMfCalculator)} className={`${inputClass} ${((selectedType === 'GOLD' && useGoldCalculator) || (selectedType === 'MUTUAL_FUND' && useMfCalculator)) ? 'bg-zinc-100 dark:bg-zinc-600 cursor-not-allowed' : ''}`} />
              {((selectedType === 'GOLD' && useGoldCalculator) || (selectedType === 'MUTUAL_FUND' && useMfCalculator)) && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Dihitung otomatis dari kalkulator</p>
              )}
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Gain/Loss</span>
                <span className={`font-medium ${previewGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {previewGainLoss >= 0 ? '+' : ''}Rp {formatNumber(Math.abs(previewGainLoss))}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-zinc-500 dark:text-zinc-400">Return</span>
                <span className={`font-medium ${previewGainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{previewReturn}%</span>
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm sm:text-base">
              {isSaving ? 'Saving...' : 'Save Snapshot'}
            </button>
          </form>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Gold Section */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-4 h-4 rounded-full bg-yellow-500 mr-3"></div>
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Gold (Emas Digital)</h3>
              </div>

              {goldSnapshots.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">No Gold investment records yet</div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Month</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Invested</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Current</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">G/L</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {goldSnapshots.map((snapshot) => (
                        <tr key={snapshot.id} className="border-b border-zinc-100 dark:border-zinc-700/50">
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-zinc-900 dark:text-white">{formatMonth(snapshot.month)}</td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right text-zinc-900 dark:text-white">{formatCurrency(snapshot.invested_amount)}</td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right text-zinc-900 dark:text-white">{formatCurrency(snapshot.current_value)}</td>
                          <td className={`py-2 sm:py-3 px-2 text-xs sm:text-sm text-right font-medium ${snapshot.gain_loss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {snapshot.gain_loss >= 0 ? '+' : ''}{formatCurrency(snapshot.gain_loss)}
                          </td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right">
                            <button onClick={() => loadSnapshot(snapshot, 'GOLD')} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Mutual Fund Section */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center mb-4 sm:mb-6">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-3"></div>
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">Mutual Fund (Reksa Dana)</h3>
              </div>

              {mutualFundSnapshots.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">No Mutual Fund investment records yet</div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Month</th>
                        <th className="text-left py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Product</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Invested</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">Current</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">G/L</th>
                        <th className="text-right py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mutualFundSnapshots.map((snapshot) => (
                        <tr key={snapshot.id} className="border-b border-zinc-100 dark:border-zinc-700/50">
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-zinc-900 dark:text-white">{formatMonth(snapshot.month)}</td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-zinc-900 dark:text-white">
                            <div className="truncate max-w-[100px]" title={snapshot.product_name || '-'}>{snapshot.product_name || '-'}</div>
                            <div className="text-xs text-zinc-500">{snapshot.platform || '-'}</div>
                          </td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right text-zinc-900 dark:text-white">{formatCurrency(snapshot.invested_amount)}</td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right text-zinc-900 dark:text-white">{formatCurrency(snapshot.current_value)}</td>
                          <td className={`py-2 sm:py-3 px-2 text-xs sm:text-sm text-right font-medium ${snapshot.gain_loss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {snapshot.gain_loss >= 0 ? '+' : ''}{formatCurrency(snapshot.gain_loss)}
                          </td>
                          <td className="py-2 sm:py-3 px-2 text-xs sm:text-sm text-right">
                            <button onClick={() => loadSnapshot(snapshot, 'MUTUAL_FUND')} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

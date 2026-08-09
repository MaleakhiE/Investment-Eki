'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput, { formatNumber } from '@/components/ui/CurrencyInput';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import { useFeedback } from '@/components/providers/FeedbackProvider';
import { parseInvestmentHistories } from './investment-history';

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
}

interface GoldPrice {
  sell_price: number;
  source: string;
  updated_at: string;
}

type InvestmentType = 'GOLD' | 'MUTUAL_FUND';

const PLATFORMS = [
  { value: 'bibit', label: 'Bibit' },
  { value: 'bareksa', label: 'Bareksa' },
  { value: 'ajaib', label: 'Ajaib' },
  { value: 'ipot', label: 'IPOT' },
  { value: 'pluang', label: 'Pluang' },
  { value: 'tokopedia', label: 'Tokopedia' },
  { value: 'other', label: 'Other' },
];

export default function InvestmentsPage() {
  useSession();
  const { showFeedback, confirmAction } = useFeedback();
  const [goldSnapshots, setGoldSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [mfSnapshots, setMfSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [snapshotStatus, setSnapshotStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<InvestmentType>('GOLD');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [goldGrams, setGoldGrams] = useState('');
  const [goldPrice, setGoldPrice] = useState('');
  const [useGoldCalc, setUseGoldCalc] = useState(true);
  const [goldPriceData, setGoldPriceData] = useState<GoldPrice | null>(null);
  const [goldPriceLoading, setGoldPriceLoading] = useState(false);
  const [mfPlatform, setMfPlatform] = useState('bibit');
  const [mfProduct, setMfProduct] = useState('');
  const [mfUnits, setMfUnits] = useState('');
  const [mfNav, setMfNav] = useState('');
  const [useMfCalc, setUseMfCalc] = useState(true);

  const fetchGoldPrice = useCallback(async () => {
    setGoldPriceLoading(true);
    try {
      const res = await fetch('/api/gold-price', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.responseDetails) {
          setGoldPriceData(data.responseDetails);
          setGoldPrice(data.responseDetails.sell_price.toString());
        }
      }
    } catch {
      setGoldPrice('1450000');
    } finally {
      setGoldPriceLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoldPrice(); }, [fetchGoldPrice]);

  useEffect(() => {
    const interval = setInterval(fetchGoldPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  useEffect(() => {
    if (selectedType === 'GOLD' && useGoldCalc) {
      const invested = parseFloat(investedAmount) || 0;
      const p = parseFloat(goldPrice) || 0;
      if (invested > 0 && p > 0) {
        const grams = invested / p;
        setGoldGrams(grams.toFixed(4));
      }
    }
  }, [investedAmount, goldPrice, selectedType, useGoldCalc]);

  useEffect(() => {
    if (selectedType === 'GOLD' && useGoldCalc) {
      const g = parseFloat(goldGrams) || 0;
      const p = parseFloat(goldPrice) || 0;
      setCurrentValue(g * p > 0 ? Math.round(g * p).toString() : '');
    }
  }, [goldGrams, goldPrice, selectedType, useGoldCalc]);

  useEffect(() => {
    if (selectedType === 'MUTUAL_FUND' && useMfCalc) {
      const invested = parseFloat(investedAmount) || 0;
      const n = parseFloat(mfNav) || 0;
      if (invested > 0 && n > 0) {
        const units = invested / n;
        setMfUnits(units.toFixed(4));
      }
    }
  }, [investedAmount, mfNav, selectedType, useMfCalc]);

  useEffect(() => {
    if (selectedType === 'MUTUAL_FUND' && useMfCalc) {
      const u = parseFloat(mfUnits) || 0;
      const n = parseFloat(mfNav) || 0;
      setCurrentValue(u * n > 0 ? Math.round(u * n).toString() : '');
    }
  }, [mfUnits, mfNav, selectedType, useMfCalc]);

  useEffect(() => { fetchSnapshots(); }, []);

  async function fetchSnapshots() {
    setSnapshotStatus('loading');
    try {
      const [goldRes, mfRes] = await Promise.all([
        fetch('/api/investments/GOLD/history'),
        fetch('/api/investments/MUTUAL_FUND/history')
      ]);
      if (!goldRes.ok || !mfRes.ok) throw new Error('Investment history request failed');
      const [goldData, mfData] = await Promise.all([goldRes.json(), mfRes.json()]);
      const histories = parseInvestmentHistories(goldData, mfData);
      if (!histories) throw new Error('Investment history response is invalid');
      setGoldSnapshots(histories.gold as InvestmentSnapshot[]);
      setMfSnapshots(histories.mutualFund as InvestmentSnapshot[]);
      setSnapshotStatus('ready');
    } catch {
      setSnapshotStatus('error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: selectedType,
        month,
        invested_amount: parseFloat(investedAmount) || 0,
        current_value: parseFloat(currentValue) || 0
      };
      if (selectedType === 'MUTUAL_FUND') {
        payload.platform = mfPlatform;
        payload.product_name = mfProduct;
        payload.units = mfUnits;
        payload.nav_per_unit = mfNav;
      }
      const res = await fetch('/api/investments/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        void showFeedback({ tone: 'error', title: 'Snapshot tidak tersimpan', message: data.responseMessage || 'Periksa data investasi lalu coba kembali.' });
        return;
      }
      resetForm();
      await fetchSnapshots();
      void showFeedback({ tone: 'success', title: 'Snapshot berhasil disimpan', message: `Snapshot ${selectedType === 'GOLD' ? 'emas' : 'reksa dana'} untuk ${formatMonth(month)} telah diperbarui.` });
    } catch {
      void showFeedback({ tone: 'error', title: 'Snapshot tidak tersimpan', message: 'Terjadi gangguan saat menyimpan snapshot investasi. Silakan coba kembali.' });
    } finally { setIsSaving(false); }
  }

  async function handleDelete(id: string, type: InvestmentType) {
    const confirmed = await confirmAction({
      title: 'Hapus snapshot investasi?',
      message: 'Catatan investasi ini akan dihapus secara permanen dan tidak dapat dipulihkan.',
      confirmLabel: 'Hapus snapshot',
    });
    if (!confirmed) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/investments/snapshot/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (type === 'GOLD') {
          setGoldSnapshots(prev => prev.filter(s => s.id !== id));
        } else {
          setMfSnapshots(prev => prev.filter(s => s.id !== id));
        }
        void showFeedback({ tone: 'success', title: 'Snapshot berhasil dihapus', message: 'Catatan investasi telah dihapus dari riwayat.' });
      } else {
        const data = await res.json().catch(() => null);
        void showFeedback({ tone: 'error', title: 'Snapshot tidak terhapus', message: data?.responseMessage || 'Catatan investasi tidak dapat dihapus.' });
      }
    } catch {
      void showFeedback({ tone: 'error', title: 'Snapshot tidak terhapus', message: 'Terjadi gangguan saat menghapus catatan investasi.' });
    } finally { setIsDeleting(null); }
  }

  function resetForm() {
    setInvestedAmount(''); setCurrentValue(''); setGoldGrams('');
    setMfUnits(''); setMfNav(''); setMfProduct('');
  }

  function loadSnapshot(s: InvestmentSnapshot, type: InvestmentType) {
    setSelectedType(type); setMonth(s.month);
    setInvestedAmount(s.invested_amount.toString());
    setCurrentValue(s.current_value.toString());
    if (type === 'GOLD') {
      setUseGoldCalc(false);
    } else {
      setUseMfCalc(false);
      setMfPlatform(s.platform || 'bibit');
      setMfProduct(s.product_name || '');
      setMfUnits(s.units || '');
      setMfNav(s.nav_per_unit || '');
    }
  }

  const formatCurrency = (v: number) => isNaN(v) ? 'Rp 0' : new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(v);
  
  const formatMonth = (m: string) => {
    const [y, mn] = m.split('-');
    return new Date(parseInt(y), parseInt(mn) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
  };

  const formatSourceTimestamp = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 'Timestamp unavailable' : parsed.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const previewGL = (parseFloat(currentValue) || 0) - (parseFloat(investedAmount) || 0);
  const previewReturn = parseFloat(investedAmount) > 0 ? ((previewGL / parseFloat(investedAmount)) * 100).toFixed(1) : '0';
  const inputClass = "w-full py-2 rounded-xl border border-[#dcece8] bg-white text-[#16332f] focus:outline-none focus:ring-2 focus:ring-[#00d4aa] text-sm";
  const inputClassWithPadding = "w-full px-3 py-2 rounded-xl border border-[#dcece8] bg-white text-[#16332f] focus:outline-none focus:ring-2 focus:ring-[#00d4aa] text-sm";

  const goldTotal = goldSnapshots.reduce((sum, s) => sum + s.current_value, 0);
  const mfTotal = mfSnapshots.reduce((sum, s) => sum + s.current_value, 0);
  const goldGainLoss = goldSnapshots.reduce((sum, s) => sum + s.gain_loss, 0);
  const mfGainLoss = mfSnapshots.reduce((sum, s) => sum + s.gain_loss, 0);
  const goldInvested = goldSnapshots.reduce((sum, s) => sum + s.invested_amount, 0);
  const mfInvested = mfSnapshots.reduce((sum, s) => sum + s.invested_amount, 0);
  const goldReturnPct = goldInvested > 0 ? ((goldGainLoss / goldInvested) * 100).toFixed(1) : '0';
  const mfReturnPct = mfInvested > 0 ? ((mfGainLoss / mfInvested) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page investments-page lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#16332f]">Investments</h2>
          <p className="text-sm text-zinc-600">Track your Gold and Mutual Fund investments</p>
        </div>

        <section className="investment-provenance" aria-labelledby="investment-provenance-title">
          <div>
            <p className="app-eyebrow">Data provenance</p>
            <h3 id="investment-provenance-title">Know what each number represents.</h3>
            <p>Snapshots stay user-entered. Live market context is shown with its provider and update time so stale data is visible.</p>
          </div>
          <dl>
            <div><dt>Gold price</dt><dd>{goldPriceData ? `${goldPriceData.source} · ${formatSourceTimestamp(goldPriceData.updated_at)}` : 'Unavailable until refreshed'}</dd></div>
            <div><dt>Mutual funds</dt><dd>{mfSnapshots.length > 0 ? 'Manual snapshot · provider recorded per entry' : 'No snapshots recorded'}</dd></div>
          </dl>
        </section>

        {snapshotStatus === 'loading' ? (
          <div role="status" className="flex h-64 items-center justify-center text-zinc-600">Loading investment data...</div>
        ) : snapshotStatus === 'error' ? (
          <section role="alert" className="card mx-auto max-w-xl rounded-2xl border border-red-200 p-6 text-center">
            <h3 className="font-semibold text-[#16332f]">Investment data is unavailable</h3>
            <p className="mt-2 text-sm text-zinc-600">We could not load your complete investment history. Your saved records have not been changed.</p>
            <button type="button" onClick={() => void fetchSnapshots()} className="mt-4 min-h-11 rounded-xl bg-[#00d4aa] px-5 py-2 text-sm font-semibold text-[#16332f] hover:bg-[#00a88a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f78] focus-visible:ring-offset-2">Try again</button>
          </section>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div>
                    <p className="text-sm text-zinc-600">Gold (Emas)</p>
                    <p className="text-2xl font-bold text-[#16332f]">{formatCurrency(goldTotal)}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Invested: {formatCurrency(goldInvested)}</span>
                  <span className={goldGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {goldGainLoss >= 0 ? '+' : ''}{formatCurrency(goldGainLoss)} ({goldReturnPct}%)
                  </span>
                </div>
              </div>
              <div className="card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div>
                    <p className="text-sm text-zinc-600">Mutual Fund (Reksa Dana)</p>
                    <p className="text-2xl font-bold text-[#16332f]">{formatCurrency(mfTotal)}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Invested: {formatCurrency(mfInvested)}</span>
                  <span className={mfGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {mfGainLoss >= 0 ? '+' : ''}{formatCurrency(mfGainLoss)} ({mfReturnPct}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="card rounded-2xl p-6">
              <h3 id="investment-snapshot-form-title" tabIndex={-1} className="font-semibold text-[#16332f] mb-4">Add/Update Snapshot</h3>
              <form id="investment-snapshot-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Type</label>
                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as InvestmentType)} className={inputClassWithPadding}>
                      <option value="GOLD">Gold (Emas)</option>
                      <option value="MUTUAL_FUND">Mutual Fund (Reksa Dana)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Month</label>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required className={inputClassWithPadding} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Invested Amount</label>
                    <CurrencyInput value={investedAmount} onChange={setInvestedAmount} required className={inputClass} />
                  </div>
                </div>

                {/* Gold Calculator */}
                {selectedType === 'GOLD' && (
                  <div className="rounded-2xl border border-[#e3cc8c] bg-[#fffaf0] p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-[#5e4712]">Gold Calculator</h4>
                        <p className="mt-0.5 text-xs text-[#806c3c]">Estimate the current value from live price and weight.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={fetchGoldPrice} disabled={goldPriceLoading} className="min-h-11 rounded-full px-2 text-xs font-semibold text-[#9a6d08] hover:bg-[#fff2c8] hover:text-[#704e05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b98512] disabled:cursor-not-allowed disabled:opacity-50">
                          {goldPriceLoading ? 'Loading...' : 'Refresh'}
                        </button>
                        <ToggleSwitch tone="gold" checked={useGoldCalc} onChange={setUseGoldCalc} label="Use gold calculator" />
                      </div>
                    </div>
                    {goldPriceData && (
                      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[#ead9a8] bg-[#fff2c8] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[#6c551d]">Live price</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${goldPriceData.source.includes('offline') ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#dcfce7] text-[#166534]'}`}>{goldPriceData.source}</span>
                        </div>
                        <span className="font-bold tabular-nums text-[#9a6d08]">Rp {formatNumber(goldPriceData.sell_price)}/gram</span>
                      </div>
                    )}
                    {useGoldCalc && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#5e4712]">Price/gram</label>
                          <CurrencyInput value={goldPrice} onChange={setGoldPrice} className={`${inputClass} border-[#dfcf9f] bg-white focus:ring-[#c69218]`} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[#5e4712]">Grams</label>
                          <input type="number" value={goldGrams} onChange={(e) => setGoldGrams(e.target.value)} step="0.0001" placeholder="0.0000" className={`${inputClassWithPadding} border-[#dfcf9f] bg-white focus:ring-[#c69218]`} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mutual Fund */}
                {selectedType === 'MUTUAL_FUND' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-400">Mutual Fund Details</h4>
                      <label className="flex items-center text-sm text-blue-400 cursor-pointer">
                        <input type="checkbox" checked={useMfCalc} onChange={(e) => setUseMfCalc(e.target.checked)} className="mr-2" />Auto calculate
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-blue-400 mb-1">Platform</label>
                        <select value={mfPlatform} onChange={(e) => setMfPlatform(e.target.value)} className={`${inputClassWithPadding} border-blue-500/30`}>
                          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs text-blue-400 mb-1">Product Name</label>
                        <input type="text" value={mfProduct} onChange={(e) => setMfProduct(e.target.value)} placeholder="Mutual fund name" className={`${inputClassWithPadding} border-blue-500/30`} />
                      </div>
                      {useMfCalc && (
                        <>
                          <div>
                            <label className="block text-xs text-blue-400 mb-1">Units</label>
                            <input type="number" value={mfUnits} onChange={(e) => setMfUnits(e.target.value)} step="0.0001" placeholder="0.0000" className={`${inputClassWithPadding} border-blue-500/30`} />
                          </div>
                          <div>
                            <label className="block text-xs text-blue-400 mb-1">NAV/Unit</label>
                            <CurrencyInput value={mfNav} onChange={setMfNav} className={`${inputClass} border-blue-500/30`} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Current Value</label>
                    <CurrencyInput value={currentValue} onChange={setCurrentValue} required disabled={(selectedType === 'GOLD' && useGoldCalc) || (selectedType === 'MUTUAL_FUND' && useMfCalc)} className={`${inputClass} ${((selectedType === 'GOLD' && useGoldCalc) || (selectedType === 'MUTUAL_FUND' && useMfCalc)) ? 'bg-[#e9f5f2]' : ''}`} />
                  </div>
                  <div className="bg-[#f5fbf9] rounded-xl p-3">
                    <p className="text-xs text-zinc-600 mb-1">Gain/Loss Preview</p>
                    <p className={`text-lg font-bold ${previewGL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{previewGL >= 0 ? '+' : ''}Rp {formatNumber(Math.abs(previewGL))} ({previewReturn}%)</p>
                  </div>
                  <button type="submit" disabled={isSaving} className="py-3 px-4 bg-[#00d4aa] hover:bg-[#00a88a] disabled:bg-blue-400 text-[#16332f] font-medium rounded-xl transition-colors text-sm">{isSaving ? 'Saving...' : 'Save Snapshot'}</button>
                </div>
              </form>
            </div>

            {/* History Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gold History */}
              <div className="card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full bg-amber-400"></div>
                  <h3 className="font-semibold text-[#16332f]">Gold (Emas)</h3>
                </div>
                {goldSnapshots.length === 0 ? (
                  <div role="status" className="rounded-2xl border border-dashed border-[#b9ddd4] bg-[#f5fbf9] p-5 text-center">
                    <h4 className="font-semibold text-[#16332f]">No gold snapshots yet</h4>
                    <p className="mt-1 text-sm text-zinc-600">Add a monthly record to start tracking your gold progress.</p>
                    <button type="button" onClick={() => { setSelectedType('GOLD'); document.getElementById('investment-snapshot-form')?.scrollIntoView({ block: 'start' }); document.getElementById('investment-snapshot-form-title')?.focus({ preventScroll: true }); }} className="mt-4 min-h-11 rounded-xl bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-[#16332f] hover:bg-[#00a88a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f78] focus-visible:ring-offset-2">Add your first gold snapshot</button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {goldSnapshots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-[#16332f]">{formatMonth(s.month)}</p>
                          <p className="text-xs text-zinc-600">Invested: {formatCurrency(s.invested_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#16332f]">{formatCurrency(s.current_value)}</p>
                          <p className={`text-xs ${s.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {s.gain_loss >= 0 ? '+' : ''}{formatCurrency(s.gain_loss)}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button onClick={() => loadSnapshot(s, 'GOLD')} className="text-xs text-[#00d4aa] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(s.id, 'GOLD')} disabled={isDeleting === s.id} className="text-xs text-red-400 hover:underline disabled:opacity-50">
                            {isDeleting === s.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mutual Fund History */}
              <div className="card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <h3 className="font-semibold text-[#16332f]">Mutual Fund (Reksa Dana)</h3>
                </div>
                {mfSnapshots.length === 0 ? (
                  <div role="status" className="rounded-2xl border border-dashed border-[#b9ddd4] bg-[#f5fbf9] p-5 text-center">
                    <h4 className="font-semibold text-[#16332f]">No mutual fund snapshots yet</h4>
                    <p className="mt-1 text-sm text-zinc-600">Add a monthly record to start tracking your mutual fund progress.</p>
                    <button type="button" onClick={() => { setSelectedType('MUTUAL_FUND'); document.getElementById('investment-snapshot-form')?.scrollIntoView({ block: 'start' }); document.getElementById('investment-snapshot-form-title')?.focus({ preventScroll: true }); }} className="mt-4 min-h-11 rounded-xl bg-[#00d4aa] px-4 py-2 text-sm font-semibold text-[#16332f] hover:bg-[#00a88a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f78] focus-visible:ring-offset-2">Add your first mutual fund snapshot</button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {mfSnapshots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-[#f5fbf9] rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-[#16332f]">{s.product_name || formatMonth(s.month)}</p>
                          <p className="text-xs text-zinc-600">{s.platform} • {formatMonth(s.month)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#16332f]">{formatCurrency(s.current_value)}</p>
                          <p className={`text-xs ${s.gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {s.gain_loss >= 0 ? '+' : ''}{formatCurrency(s.gain_loss)}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button onClick={() => loadSnapshot(s, 'MUTUAL_FUND')} className="text-xs text-[#00d4aa] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(s.id, 'MUTUAL_FUND')} disabled={isDeleting === s.id} className="text-xs text-red-400 hover:underline disabled:opacity-50">
                            {isDeleting === s.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

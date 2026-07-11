'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
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
  const [goldSnapshots, setGoldSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [mfSnapshots, setMfSnapshots] = useState<InvestmentSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    try {
      const [goldRes, mfRes] = await Promise.all([
        fetch('/api/investments/GOLD/history'),
        fetch('/api/investments/MUTUAL_FUND/history')
      ]);
      if (goldRes.ok) { const d = await goldRes.json(); setGoldSnapshots(d.responseDetails || []); }
      if (mfRes.ok) { const d = await mfRes.json(); setMfSnapshots(d.responseDetails || []); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setIsSaving(true);
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
      if (!res.ok) { setError(data.responseMessage || 'Failed'); return; }
      setSuccess('Saved!'); resetForm(); fetchSnapshots();
    } catch { setError('Error occurred'); } finally { setIsSaving(false); }
  }

  async function handleDelete(id: string, type: InvestmentType) {
    if (!confirm('Hapus data investasi ini?')) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/investments/snapshot/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Data berhasil dihapus');
        if (type === 'GOLD') {
          setGoldSnapshots(prev => prev.filter(s => s.id !== id));
        } else {
          setMfSnapshots(prev => prev.filter(s => s.id !== id));
        }
      } else {
        setError('Gagal menghapus data');
      }
    } catch { setError('Error occurred'); } finally { setIsDeleting(null); }
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
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#16332f]">Investments</h2>
          <p className="text-sm text-zinc-600">Track your Gold and Mutual Fund investments</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </div>
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
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
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
              <h3 className="font-semibold text-[#16332f] mb-4">Add/Update Snapshot</h3>
              {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-sm text-green-400">{success}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-amber-400 flex items-center gap-2">🪙 Gold Calculator</h4>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={fetchGoldPrice} disabled={goldPriceLoading} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                          <svg className={`w-3 h-3 ${goldPriceLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Refresh
                        </button>
                        <label className="flex items-center text-sm text-amber-400 cursor-pointer">
                          <input type="checkbox" checked={useGoldCalc} onChange={(e) => setUseGoldCalc(e.target.checked)} className="mr-2" />Use calculator
                        </label>
                      </div>
                    </div>
                    {goldPriceData && (
                      <div className="bg-amber-500/20 rounded-lg p-3 flex justify-between items-center mb-3">
                        <div>
                          <span className="text-sm text-amber-300">Live Price</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${goldPriceData.source.includes('offline') ? 'bg-red-500/30 text-red-400' : 'bg-green-500/30 text-green-400'}`}>{goldPriceData.source}</span>
                        </div>
                        <span className="font-bold text-amber-300">Rp {formatNumber(goldPriceData.sell_price)}/gram</span>
                      </div>
                    )}
                    {useGoldCalc && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-amber-400 mb-1">Price/gram</label>
                          <CurrencyInput value={goldPrice} onChange={setGoldPrice} className={`${inputClass} border-amber-500/30`} />
                        </div>
                        <div>
                          <label className="block text-xs text-amber-400 mb-1">Grams</label>
                          <input type="number" value={goldGrams} onChange={(e) => setGoldGrams(e.target.value)} step="0.0001" placeholder="0.0000" className={`${inputClassWithPadding} border-amber-500/30`} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mutual Fund */}
                {selectedType === 'MUTUAL_FUND' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-400 flex items-center gap-2">📊 Mutual Fund Details</h4>
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
                        <input type="text" value={mfProduct} onChange={(e) => setMfProduct(e.target.value)} placeholder="Nama reksa dana" className={`${inputClassWithPadding} border-blue-500/30`} />
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
                  <p className="text-center py-6 text-zinc-600 text-sm">No records yet</p>
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
                            {isDeleting === s.id ? '...' : 'Hapus'}
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
                  <p className="text-center py-6 text-zinc-600 text-sm">No records yet</p>
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
                            {isDeleting === s.id ? '...' : 'Hapus'}
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

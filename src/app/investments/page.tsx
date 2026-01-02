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

  // Auto-refresh gold price every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchGoldPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // Auto-calculate grams from invested amount when price changes
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

  // Auto-calculate current value from grams × price
  useEffect(() => {
    if (selectedType === 'GOLD' && useGoldCalc) {
      const g = parseFloat(goldGrams) || 0;
      const p = parseFloat(goldPrice) || 0;
      setCurrentValue(g * p > 0 ? Math.round(g * p).toString() : '');
    }
  }, [goldGrams, goldPrice, selectedType, useGoldCalc]);

  // Auto-calculate units from invested amount when NAV changes (Mutual Fund)
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

  // Auto-calculate current value from units × NAV
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
      const [goldRes, mfRes] = await Promise.all([fetch('/api/investments/GOLD/history'), fetch('/api/investments/MUTUAL_FUND/history')]);
      if (goldRes.ok) { const d = await goldRes.json(); setGoldSnapshots(d.responseDetails || []); }
      if (mfRes.ok) { const d = await mfRes.json(); setMfSnapshots(d.responseDetails || []); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setIsSaving(true);
    try {
      const payload: Record<string, unknown> = { type: selectedType, month, invested_amount: parseFloat(investedAmount) || 0, current_value: parseFloat(currentValue) || 0 };
      if (selectedType === 'MUTUAL_FUND') { payload.platform = mfPlatform; payload.product_name = mfProduct; payload.units = mfUnits; payload.nav_per_unit = mfNav; }
      const res = await fetch('/api/investments/snapshot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.responseMessage || 'Failed'); return; }
      setSuccess('Saved!'); resetForm(); fetchSnapshots();
    } catch { setError('Error occurred'); } finally { setIsSaving(false); }
  }

  function resetForm() { setInvestedAmount(''); setCurrentValue(''); setGoldGrams(''); setMfUnits(''); setMfNav(''); setMfProduct(''); }

  function loadSnapshot(s: InvestmentSnapshot, type: InvestmentType) {
    setSelectedType(type); setMonth(s.month); setInvestedAmount(s.invested_amount.toString()); setCurrentValue(s.current_value.toString());
    if (type === 'GOLD') { setUseGoldCalc(false); } else { setUseMfCalc(false); setMfPlatform(s.platform || 'bibit'); setMfProduct(s.product_name || ''); setMfUnits(s.units || ''); setMfNav(s.nav_per_unit || ''); }
  }

  const formatCurrency = (v: number) => isNaN(v) ? 'Rp 0' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const formatMonth = (m: string) => { const [y, mn] = m.split('-'); return new Date(parseInt(y), parseInt(mn) - 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }); };
  const previewGL = (parseFloat(currentValue) || 0) - (parseFloat(investedAmount) || 0);
  const previewReturn = parseFloat(investedAmount) > 0 ? ((previewGL / parseFloat(investedAmount)) * 100).toFixed(1) : '0';
  const inputClass = "w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

  const goldTotal = goldSnapshots.reduce((sum, s) => sum + s.current_value, 0);
  const mfTotal = mfSnapshots.reduce((sum, s) => sum + s.current_value, 0);
  const goldGainLoss = goldSnapshots.reduce((sum, s) => sum + s.gain_loss, 0);
  const mfGainLoss = mfSnapshots.reduce((sum, s) => sum + s.gain_loss, 0);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <main className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-zinc-900">Investments</h2>
          <p className="text-sm text-zinc-500">Track your Gold and Mutual Fund investments</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Row 1: Summary Cards - 2 equal columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Gold (Emas)</p>
                    <p className="text-2xl font-bold text-zinc-900">{formatCurrency(goldTotal)}</p>
                  </div>
                </div>
                <p className={`text-sm ${goldGainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>{goldGainLoss >= 0 ? '+' : ''}{formatCurrency(goldGainLoss)} total gain/loss</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Mutual Fund (Reksa Dana)</p>
                    <p className="text-2xl font-bold text-zinc-900">{formatCurrency(mfTotal)}</p>
                  </div>
                </div>
                <p className={`text-sm ${mfGainLoss >= 0 ? 'text-green-600' : 'text-red-500'}`}>{mfGainLoss >= 0 ? '+' : ''}{formatCurrency(mfGainLoss)} total gain/loss</p>
              </div>
            </div>

            {/* Row 2: Form - Full width */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-zinc-900 mb-4">Add/Update Snapshot</h3>
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}
              {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">{success}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
                    <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as InvestmentType)} className={inputClass}>
                      <option value="GOLD">Gold (Emas)</option>
                      <option value="MUTUAL_FUND">Mutual Fund (Reksa Dana)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Month</label>
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Invested Amount</label>
                    <CurrencyInput value={investedAmount} onChange={setInvestedAmount} required className={inputClass} />
                  </div>
                </div>

                {/* Gold Calculator */}
                {selectedType === 'GOLD' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-amber-800 flex items-center gap-2">🪙 Gold Calculator</h4>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={fetchGoldPrice} disabled={goldPriceLoading} className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1">
                          <svg className={`w-3 h-3 ${goldPriceLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Refresh
                        </button>
                        <label className="flex items-center text-sm text-amber-700 cursor-pointer">
                          <input type="checkbox" checked={useGoldCalc} onChange={(e) => setUseGoldCalc(e.target.checked)} className="mr-2" />Use calculator
                        </label>
                      </div>
                    </div>
                    {goldPriceData && (
                      <div className="bg-amber-100 rounded-lg p-3 flex justify-between items-center mb-3">
                        <div>
                          <span className="text-sm text-amber-800">Live Price</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${goldPriceData.source.includes('offline') ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>{goldPriceData.source}</span>
                        </div>
                        <span className="font-bold text-amber-800">Rp {formatNumber(goldPriceData.sell_price)}/gram</span>
                      </div>
                    )}
                    {useGoldCalc && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-amber-700 mb-1">Price/gram</label>
                          <CurrencyInput value={goldPrice} onChange={setGoldPrice} className={`${inputClass} border-amber-300`} />
                        </div>
                        <div>
                          <label className="block text-xs text-amber-700 mb-1">Grams</label>
                          <input type="number" value={goldGrams} onChange={(e) => setGoldGrams(e.target.value)} step="0.0001" placeholder="0.0000" className={`${inputClass} border-amber-300`} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mutual Fund */}
                {selectedType === 'MUTUAL_FUND' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2">📊 Mutual Fund Details</h4>
                      <label className="flex items-center text-sm text-blue-700 cursor-pointer">
                        <input type="checkbox" checked={useMfCalc} onChange={(e) => setUseMfCalc(e.target.checked)} className="mr-2" />Auto calculate
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">Platform</label>
                        <select value={mfPlatform} onChange={(e) => setMfPlatform(e.target.value)} className={`${inputClass} border-blue-300`}>
                          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-blue-700 mb-1">Product Name</label>
                        <input type="text" value={mfProduct} onChange={(e) => setMfProduct(e.target.value)} placeholder="Fund name" className={`${inputClass} border-blue-300`} />
                      </div>
                      {useMfCalc && (
                        <>
                          <div>
                            <label className="block text-xs text-blue-700 mb-1">Units</label>
                            <input type="number" value={mfUnits} onChange={(e) => setMfUnits(e.target.value)} step="0.0001" placeholder="0.0000" className={`${inputClass} border-blue-300`} />
                          </div>
                          <div>
                            <label className="block text-xs text-blue-700 mb-1">NAV/Unit</label>
                            <CurrencyInput value={mfNav} onChange={setMfNav} className={`${inputClass} border-blue-300`} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Current Value</label>
                    <CurrencyInput value={currentValue} onChange={setCurrentValue} required disabled={(selectedType === 'GOLD' && useGoldCalc) || (selectedType === 'MUTUAL_FUND' && useMfCalc)} className={`${inputClass} ${((selectedType === 'GOLD' && useGoldCalc) || (selectedType === 'MUTUAL_FUND' && useMfCalc)) ? 'bg-zinc-100' : ''}`} />
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-3">
                    <p className="text-xs text-zinc-500 mb-1">Gain/Loss Preview</p>
                    <p className={`text-lg font-bold ${previewGL >= 0 ? 'text-green-600' : 'text-red-500'}`}>{previewGL >= 0 ? '+' : ''}Rp {formatNumber(Math.abs(previewGL))} ({previewReturn}%)</p>
                  </div>
                  <button type="submit" disabled={isSaving} className="py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors text-sm">{isSaving ? 'Saving...' : 'Save Snapshot'}</button>
                </div>
              </form>
            </div>

            {/* Row 3: History - 2 equal columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full bg-amber-400"></div>
                  <h3 className="font-semibold text-zinc-900">Gold (Emas)</h3>
                </div>
                {goldSnapshots.length === 0 ? (
                  <p className="text-center py-6 text-zinc-500 text-sm">No records yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {goldSnapshots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{formatMonth(s.month)}</p>
                          <p className="text-xs text-zinc-500">Invested: {formatCurrency(s.invested_amount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(s.current_value)}</p>
                          <p className={`text-xs ${s.gain_loss >= 0 ? 'text-green-600' : 'text-red-500'}`}>{s.gain_loss >= 0 ? '+' : ''}{formatCurrency(s.gain_loss)}</p>
                        </div>
                        <button onClick={() => loadSnapshot(s, 'GOLD')} className="text-xs text-blue-600 hover:underline ml-3">Edit</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <h3 className="font-semibold text-zinc-900">Mutual Fund (Reksa Dana)</h3>
                </div>
                {mfSnapshots.length === 0 ? (
                  <p className="text-center py-6 text-zinc-500 text-sm">No records yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {mfSnapshots.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{s.product_name || formatMonth(s.month)}</p>
                          <p className="text-xs text-zinc-500">{s.platform} • {formatMonth(s.month)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(s.current_value)}</p>
                          <p className={`text-xs ${s.gain_loss >= 0 ? 'text-green-600' : 'text-red-500'}`}>{s.gain_loss >= 0 ? '+' : ''}{formatCurrency(s.gain_loss)}</p>
                        </div>
                        <button onClick={() => loadSnapshot(s, 'MUTUAL_FUND')} className="text-xs text-blue-600 hover:underline ml-3">Edit</button>
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

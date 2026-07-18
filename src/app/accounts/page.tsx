'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { AccountCard, type AccountSummary } from '@/components/accounts/AccountCard';
import CurrencyInput from '@/components/ui/CurrencyInput';

type AccountForm = { name: string; type: AccountSummary['type']; opening_balance: string; color: string };
const emptyForm: AccountForm = { name: '', type: 'BANK', opening_balance: '', color: '#00a88a' };

function apiError(payload: unknown, fallback: string) {
  const body = payload as { responseDetails?: { errors?: string[] }; responseMessage?: string };
  return body.responseDetails?.errors?.[0] || body.responseMessage || fallback;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAccounts = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/accounts');
      const payload = await response.json();
      if (!response.ok) throw new Error(apiError(payload, 'Unable to load accounts'));
      const list = Array.isArray(payload.responseDetails) ? payload.responseDetails : [];
      setAccounts(list);
      setSourceId((current) => current || list[0]?.id || '');
      setDestinationId((current) => current || list[1]?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load accounts');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  const totalBalance = useMemo(() => accounts.reduce((sum, account) => sum + account.balance, 0), [accounts]);
  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  const parseAmount = (value: string) => Number(value.replace(/[^\d]/g, '')) || 0;

  const saveAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(editingId ? `/api/accounts/${editingId}` : '/api/accounts', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, opening_balance: parseAmount(form.opening_balance) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(apiError(payload, 'Unable to save account'));
      setMessage(editingId ? 'Account updated.' : 'Account created.');
      setForm(emptyForm); setEditingId(null); await loadAccounts();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save account'); }
    finally { setSaving(false); }
  };

  const editAccount = (account: AccountSummary) => {
    setEditingId(account.id);
    setForm({ name: account.name, type: account.type, opening_balance: String(account.opening_balance), color: account.color || '#00a88a' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const archive = async (account: AccountSummary) => {
    if (!window.confirm(`Archive ${account.name}? Existing transaction history will be preserved.`)) return;
    const response = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) { setError(apiError(payload, 'Unable to archive account')); return; }
    setMessage('Account archived.'); await loadAccounts();
  };

  const transfer = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/accounts/transfer', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10), source_account_id: sourceId,
          destination_account_id: destinationId, amount: parseAmount(transferAmount),
          description: transferDescription,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(apiError(payload, 'Unable to transfer funds'));
      setMessage('Transfer recorded without changing income or expenses.');
      setTransferAmount(''); setTransferDescription(''); await loadAccounts();
    } catch (transferError) { setError(transferError instanceof Error ? transferError.message : 'Unable to transfer funds'); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-[#f3faf8]">
    <Sidebar />
    <main className="app-page lg:ml-64 p-4 lg:p-6">
      <header className="mb-5 min-w-0"><p className="app-eyebrow">Money storage</p><h1 className="break-words text-2xl font-bold text-[#16332f]">Accounts and wallets</h1><p className="text-sm text-zinc-500">Manage balances across banks, wallets, and cash.</p></header>
      {(error || message) && <div role="status" className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#bce9de] bg-[#eaf8f4] text-[#087f6b]'}`}>{error || message}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <section className="min-w-0 space-y-4">
          <div className="rounded-3xl bg-[#163f38] p-5 text-white"><p className="text-xs text-white/60">Total available balance</p><p className="mt-2 break-words text-3xl font-bold">{formatCurrency(totalBalance)}</p><p className="mt-2 text-xs text-white/60">Across {accounts.length} active {accounts.length === 1 ? 'account' : 'accounts'}</p></div>
          {loading ? <div className="card rounded-3xl p-6 text-sm text-zinc-500">Loading accounts...</div> : accounts.length === 0 ? <div className="card rounded-3xl p-6 text-sm text-zinc-500">Create your first account to start tracking balances.</div> : <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">{accounts.map((account) => <AccountCard key={account.id} account={account} actions={<><button type="button" onClick={() => editAccount(account)} className="rounded-full bg-[#e9f5f2] px-3 py-1.5 text-xs font-semibold text-[#087f6b]">Edit</button><button type="button" onClick={() => void archive(account)} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600">Archive</button></>} />)}</div>}
        </section>

        <div className="min-w-0 space-y-4">
          <section className="card rounded-3xl p-5"><h2 className="font-semibold text-[#16332f]">{editingId ? 'Edit account' : 'Add account'}</h2><form onSubmit={saveAccount} className="mt-4 space-y-3"><label className="block text-xs text-zinc-600">Name<input required maxLength={100} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="BCA, Mandiri, GoPay..." className="mt-1 w-full rounded-xl border border-[#dcece8] px-3 py-2.5 text-sm" /></label><div className="grid grid-cols-2 gap-3"><label className="block text-xs text-zinc-600">Type<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AccountSummary['type'] }))} className="mt-1 w-full rounded-xl border border-[#dcece8] px-3 py-2.5 text-sm"><option value="BANK">Bank</option><option value="WALLET">Wallet</option><option value="CASH">Cash</option></select></label><label className="block text-xs text-zinc-600">Color<input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border border-[#dcece8] p-1" /></label></div><label className="block text-xs text-zinc-600">Opening balance<CurrencyInput value={form.opening_balance} onChange={(value) => setForm((current) => ({ ...current, opening_balance: value }))} placeholder="0" className="mt-1 w-full rounded-xl border border-[#dcece8] py-2.5 text-sm" /></label><div className="flex gap-2"><button disabled={saving} className="flex-1 rounded-xl bg-[#00cfa6] px-4 py-2.5 text-sm font-semibold text-[#16332f] disabled:opacity-50">{editingId ? 'Save changes' : 'Create account'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-xl bg-zinc-100 px-4 py-2.5 text-sm text-zinc-600">Cancel</button>}</div></form></section>

          <section className="card rounded-3xl p-5"><h2 className="font-semibold text-[#16332f]">Transfer between accounts</h2><p className="mt-1 text-xs text-zinc-500">Transfers move balance without affecting income or expenses.</p><form onSubmit={transfer} className="mt-4 space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block min-w-0 text-xs text-zinc-600">From<select required value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="mt-1 w-full min-w-0 rounded-xl border border-[#dcece8] px-3 py-2.5 text-sm">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="block min-w-0 text-xs text-zinc-600">To<select required value={destinationId} onChange={(event) => setDestinationId(event.target.value)} className="mt-1 w-full min-w-0 rounded-xl border border-[#dcece8] px-3 py-2.5 text-sm">{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div><label className="block text-xs text-zinc-600">Amount<CurrencyInput value={transferAmount} onChange={setTransferAmount} placeholder="0" className="mt-1 w-full rounded-xl border border-[#dcece8] py-2.5 text-sm" /></label><label className="block text-xs text-zinc-600">Note<input value={transferDescription} onChange={(event) => setTransferDescription(event.target.value)} placeholder="Optional transfer note" className="mt-1 w-full rounded-xl border border-[#dcece8] px-3 py-2.5 text-sm" /></label><button disabled={saving || accounts.length < 2 || sourceId === destinationId} className="w-full rounded-xl bg-[#163f38] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Transfer funds</button></form></section>
        </div>
      </div>
    </main>
  </div>;
}

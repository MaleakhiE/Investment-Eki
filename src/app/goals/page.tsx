'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import CurrencyInput from '@/components/ui/CurrencyInput';

interface FinancialGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  category: string;
  priority: number;
  is_completed: boolean;
  percentage: number;
  remaining: number;
  days_left: number | null;
  monthly_needed: number | null;
}

interface GoalsSummary {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_target: number;
  total_current: number;
  overall_progress: number;
}

const CATEGORIES = [
  { value: 'EMERGENCY_FUND', label: 'Dana Darurat' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'VACATION', label: 'Liburan' },
  { value: 'GADGET', label: 'Gadget' },
  { value: 'VEHICLE', label: 'Kendaraan' },
  { value: 'PROPERTY', label: 'Properti' },
  { value: 'EDUCATION', label: 'Pendidikan' },
  { value: 'WEDDING', label: 'Pernikahan' },
  { value: 'OTHER', label: 'Other' },
];

export default function GoalsPage() {
  useSession();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [summary, setSummary] = useState<GoalsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addAmountId, setAddAmountId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState(2);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [goalsRes, summaryRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/goals?summary=true'),
      ]);
      if (goalsRes.ok) { const d = await goalsRes.json(); setGoals(d.responseDetails || []); }
      if (summaryRes.ok) { const d = await summaryRes.json(); setSummary(d.responseDetails); }
    } catch { setError('Failed to load'); } finally { setIsLoading(false); }
  }

  function resetForm() {
    setEditingId(null); setName(''); setTargetAmount(''); setCurrentAmount('');
    setDeadline(''); setCategory('OTHER'); setPriority(2); setShowForm(false);
  }

  function loadGoal(goal: FinancialGoal) {
    setEditingId(goal.id); setName(goal.name); setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString()); setDeadline(goal.deadline || '');
    setCategory(goal.category); setPriority(goal.priority); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess(''); setIsSaving(true);
    try {
      const url = editingId ? `/api/goals/${editingId}` : '/api/goals';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, target_amount: parseFloat(targetAmount) || 0,
          current_amount: parseFloat(currentAmount) || 0,
          deadline: deadline || null, category, priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.responseMessage || 'Failed'); return; }
      setSuccess(editingId ? 'Updated!' : 'Created!'); resetForm(); fetchData();
    } catch { setError('Error'); } finally { setIsSaving(false); }
  }

  async function handleAddAmount(goalId: string) {
    if (!addAmount) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ add_amount: parseFloat(addAmount) || 0 }),
      });
      if (res.ok) { setSuccess('Amount added!'); setAddAmountId(null); setAddAmount(''); fetchData(); }
    } catch { setError('Error'); } finally { setIsSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this goal?')) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch { setError('Error'); }
  }

  async function toggleComplete(goal: FinancialGoal) {
    try {
      await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !goal.is_completed }),
      });
      fetchData();
    } catch { setError('Error'); }
  }

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const fmtC = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)}M` : v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}rb` : v.toString();
  const getCat = (c: string) => CATEGORIES.find(x => x.value === c) || CATEGORIES[8];
  const getPriorityLabel = (p: number) => p === 1 ? 'High' : p === 2 ? 'Medium' : 'Low';
  const getPriorityColor = (p: number) => p === 1 ? 'bg-red-500/20 text-red-400' : p === 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400';

  const activeGoals = goals.filter(g => !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  return (
    <div className="min-h-screen bg-[#f3faf8]">
      <Sidebar />
      <main className="app-page goals-page lg:ml-64 p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#16332f]">Financial Goals</h2>
            <p className="text-sm text-zinc-600">Track your savings targets</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-[#00d4aa] text-[#16332f] rounded-xl text-sm font-medium hover:bg-[#00a88a]">New Goal</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-sm text-red-400">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-sm text-green-400">{success}</div>}

        {isLoading ? <div className="flex items-center justify-center h-64 text-zinc-600">Loading...</div> : (
          <div className="space-y-4">
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card rounded-xl p-4">
                  <p className="text-xs text-zinc-600 mb-1">Total Goals</p>
                  <p className="text-2xl font-bold text-[#16332f]">{summary.total_goals}</p>
                  <p className="text-xs text-zinc-500">{summary.active_goals} active, {summary.completed_goals} done</p>
                </div>
                <div className="card rounded-xl p-4">
                  <p className="text-xs text-zinc-600 mb-1">Target Total</p>
                  <p className="text-2xl font-bold text-[#16332f]">{fmtC(summary.total_target)}</p>
                </div>
                <div className="card rounded-xl p-4">
                  <p className="text-xs text-zinc-600 mb-1">Current Total</p>
                  <p className="text-2xl font-bold text-green-400">{fmtC(summary.total_current)}</p>
                </div>
                <div className="card rounded-xl p-4">
                  <p className="text-xs text-zinc-600 mb-1">Overall Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#e9f5f2] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${summary.overall_progress}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-[#16332f]">{summary.overall_progress.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Modal */}
            {showForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
                <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                  <h3 className="font-semibold text-[#16332f] text-lg mb-4">{editingId ? 'Edit Goal' : 'New Goal'}</h3>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Goal name</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Six-month emergency fund" className="w-full px-3 py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Target</label>
                        <CurrencyInput value={targetAmount} onChange={setTargetAmount} required className="w-full py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Current</label>
                        <CurrencyInput value={currentAmount} onChange={setCurrentAmount} className="w-full py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]">
                          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Priority</label>
                        <select value={priority} onChange={e => setPriority(parseInt(e.target.value))} className="w-full px-3 py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]">
                          <option value={1}>High</option>
                          <option value={2}>Medium</option>
                          <option value={3}>Low</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Deadline (optional)</label>
                      <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-3 py-2 border border-[#dcece8] rounded-lg text-sm bg-[#f3faf8] text-[#16332f]" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-[#00d4aa] text-[#16332f] rounded-lg text-sm font-medium hover:bg-[#00a88a] disabled:opacity-50">{isSaving ? '...' : editingId ? 'Update' : 'Create'}</button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#e9f5f2] text-zinc-400 rounded-lg text-sm">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Active Goals */}
            <div className="card rounded-xl p-5">
              <h3 className="font-semibold text-[#16332f] mb-4">Active Goals ({activeGoals.length})</h3>
              {activeGoals.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">No active goals. Create one to start tracking!</p>
              ) : (
                <div className="space-y-3">
                  {activeGoals.map(goal => {
                    const cat = getCat(goal.category);
                    return (
                      <div key={goal.id} className="p-4 bg-[#f5fbf9] rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-[#16332f]">{goal.name}</p>
                              <p className="text-xs text-zinc-500">{cat.label}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getPriorityColor(goal.priority)}`}>{getPriorityLabel(goal.priority)}</span>
                            <button onClick={() => loadGoal(goal)} className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-[#00d4aa]">Edit</button>
                            <button onClick={() => handleDelete(goal.id)} className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-red-600">Delete</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-3 bg-[#e9f5f2] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${goal.percentage >= 100 ? 'bg-green-500' : goal.percentage >= 75 ? 'bg-blue-500' : goal.percentage >= 50 ? 'bg-amber-500' : 'bg-zinc-400'}`} style={{ width: `${Math.min(100, goal.percentage)}%` }}></div>
                          </div>
                          <span className="text-sm font-bold text-zinc-300 w-12 text-right">{goal.percentage.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span>{fmt(goal.current_amount)} / {fmt(goal.target_amount)}</span>
                          <span>Remaining: {fmtC(goal.remaining)}</span>
                        </div>
                        {goal.deadline && (
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-zinc-500">Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {goal.days_left !== null && (
                              <span className={goal.days_left < 30 ? 'text-red-400' : 'text-zinc-500'}>{goal.days_left} days left</span>
                            )}
                          </div>
                        )}
                        {goal.monthly_needed && (
                          <p className="text-xs text-[#00d4aa] mt-1">Need {fmtC(goal.monthly_needed)}/month to reach target</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          {addAmountId === goal.id ? (
                            <div className="flex gap-2 flex-1">
                              <CurrencyInput value={addAmount} onChange={setAddAmount} placeholder="Amount" className="flex-1 py-1.5 text-xs border border-[#dcece8] rounded-lg bg-[#f3faf8] text-[#16332f]" />
                              <button onClick={() => handleAddAmount(goal.id)} disabled={isSaving} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg">Add</button>
                              <button onClick={() => { setAddAmountId(null); setAddAmount(''); }} className="px-3 py-1.5 bg-[#e9f5f2] text-zinc-400 text-xs rounded-lg">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <button onClick={() => setAddAmountId(goal.id)} className="flex-1 py-2 bg-green-500/20 text-green-400 text-xs rounded-lg font-medium hover:bg-green-500/30">Add Amount</button>
                              <button onClick={() => toggleComplete(goal)} className="px-3 py-2 bg-blue-500/20 text-blue-400 text-xs rounded-lg font-medium hover:bg-blue-500/30">Tandai Selesai</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="card rounded-xl p-5">
                <h3 className="font-semibold text-[#16332f] mb-4">Completed Goals ({completedGoals.length})</h3>
                <div className="space-y-2">
                  {completedGoals.map(goal => {
                    return (
                      <div key={goal.id} className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-[#16332f] line-through opacity-70">{goal.name}</p>
                            <p className="text-xs text-green-400">{fmt(goal.target_amount)} selesai</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleComplete(goal)} className="text-xs text-zinc-500 hover:text-[#00d4aa]">Reopen</button>
                          <button onClick={() => handleDelete(goal.id)} className="text-xs text-zinc-500 hover:text-red-400">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

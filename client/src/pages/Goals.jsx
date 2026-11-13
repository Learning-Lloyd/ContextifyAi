import { useEffect, useState } from 'react';
import { FiPlus, FiTarget, FiTrash2 } from 'react-icons/fi';
import Layout from '../components/Layout';
import { goalsService } from '../services/goalsService';

const today = new Date().toISOString().slice(0, 10);
const weekEnd = new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);

export default function Goals({ embedded = false, titleId }) {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ title: '', target_count: 5, starts_on: today, ends_on: weekEnd, category: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const refresh = () => goalsService.list().then(setGoals).catch(() => setError('Could not load your goals.'));
  useEffect(() => { refresh(); }, []);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try { const values = { ...form, target_count: Number(form.target_count), category: form.category || null }; if (editingId) await goalsService.update(editingId, values); else await goalsService.create(values); setEditingId(null); setForm({ title: '', target_count: 5, starts_on: today, ends_on: weekEnd, category: '' }); refresh(); }
    catch (err) { setError(err.response?.data?.message || 'Could not save this goal.'); }
  };
  const remove = async (id) => { await goalsService.remove(id); refresh(); };
  const content = <div className="max-w-5xl mx-auto space-y-6">
    <header><p className="text-xs uppercase tracking-widest text-emerald-700 font-semibold">Personal planning</p><h1 id={titleId} className="page-title">Goals</h1><p className="page-subtitle">Track completed tasks against the targets you set.</p></header>
    <form onSubmit={submit} className="card p-5 grid gap-3 md:grid-cols-6 items-end">
      <label className="md:col-span-2"><span className="label">Goal</span><input className="input" required maxLength="160" placeholder="Complete 5 tasks this week" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
      <label><span className="label">Target</span><input className="input" type="number" min="1" required value={form.target_count} onChange={(e) => setForm({ ...form, target_count: e.target.value })} /></label>
      <label><span className="label">Category</span><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Any category</option>{['Academic', 'Personal', 'Work'].map((c) => <option key={c}>{c}</option>)}</select></label>
      <label><span className="label">Ends</span><input className="input" type="date" min={form.starts_on} required value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} /></label>
      <button className="btn btn-primary">{editingId ? 'Save changes' : <><FiPlus /> Add goal</>}</button>{editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setForm({ title: '', target_count: 5, starts_on: today, ends_on: weekEnd, category: '' }); }}>Cancel</button>}
      {error && <p className="text-sm text-red-600 md:col-span-full">{error}</p>}
    </form>
    {goals.length ? <div className="grid gap-4 md:grid-cols-2">{goals.map((goal) => <article key={goal.id} className="card p-5 space-y-4">
      <div className="flex justify-between gap-3"><div className="flex gap-3"><span className="rounded-xl bg-emerald-50 text-emerald-700 p-3 h-fit"><FiTarget /></span><div><h2 className="font-semibold">{goal.title}</h2><p className="text-xs text-[var(--app-text-muted)]">{goal.category || 'All categories'} · Due {goal.ends_on}</p></div></div><div className="flex"><button className="btn btn-ghost text-xs" onClick={() => { setEditingId(goal.id); setForm({ title: goal.title, target_count: goal.target_count, starts_on: goal.starts_on, ends_on: goal.ends_on, category: goal.category || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button className="btn btn-ghost btn-icon" aria-label="Delete goal" onClick={() => remove(goal.id)}><FiTrash2 /></button></div></div>
      <div><div className="flex justify-between text-sm mb-2"><span>{goal.completed_count} of {goal.target_count} completed</span><span>{goal.progress}%</span></div><div className="h-2 rounded-full bg-[var(--app-muted)] overflow-hidden"><div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${goal.progress}%` }} /></div></div>
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${goal.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : goal.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{goal.status.replace('_', ' ')}</span>
    </article>)}</div> : <div className="card p-10 text-center text-[var(--app-text-muted)]">No goals yet. Add a small, measurable goal to get started.</div>}
  </div>;
  return embedded ? content : <Layout>{content}</Layout>;
}

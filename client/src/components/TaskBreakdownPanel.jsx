import { useState } from 'react';
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { taskService } from '../services/taskService';

export default function TaskBreakdownPanel({ task }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const generate = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await taskService.generateBreakdown(task.id);
      setItems((result.subtasks || []).map((item) => ({ ...item, selected: true })));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate subtasks.');
    } finally {
      setBusy(false);
    }
  };

  const updateItem = (index, changes) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...changes } : item));

  const saveSelected = async () => {
    const selected = items.filter((item) => item.selected && item.title.trim());
    if (!selected.length) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      for (const item of selected) {
        await taskService.create({
          title: item.title.trim(),
          description: item.description?.trim() || null,
          category: task.category || null,
          due_date: task.due_date,
          due_time: task.due_time || null,
          estimated_time_minutes: null,
          location: task.location || null,
          latitude: task.latitude || null,
          longitude: task.longitude || null,
        });
      }
      setItems([]);
      setNotice(`${selected.length} reviewed subtask${selected.length === 1 ? '' : 's'} added to your task list.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Some subtasks could not be saved. Check your task list before retrying.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pt-4 border-t border-[var(--app-border)] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--app-text)]">Break this task into steps</h2>
          <p className="text-xs text-[var(--app-text-muted)]">AI suggestions are drafts. Review and edit them before adding.</p>
        </div>
        <button type="button" onClick={generate} disabled={busy || saving} className="btn btn-secondary btn-sm">
          <FiRefreshCw size={13} className={busy ? 'animate-spin' : ''} /> {busy ? 'Generating…' : items.length ? 'Regenerate' : 'Suggest steps'}
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="card p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <input aria-label={`Include step ${index + 1}`} type="checkbox" checked={item.selected} onChange={(e) => updateItem(index, { selected: e.target.checked })} className="mt-3" />
            <div className="flex-1 space-y-2">
              <input className="input" value={item.title} onChange={(e) => updateItem(index, { title: e.target.value })} aria-label={`Step ${index + 1} title`} />
              <textarea className="input resize-y" rows={2} value={item.description || ''} onChange={(e) => updateItem(index, { description: e.target.value })} aria-label={`Step ${index + 1} description`} />
            </div>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove step" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><FiTrash2 size={15} /></button>
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setItems((current) => [...current, { title: '', description: '', selected: true }])} className="btn btn-ghost btn-sm"><FiPlus size={14} /> Add step</button>
          <button type="button" onClick={saveSelected} disabled={saving || !items.some((item) => item.selected && item.title.trim())} className="btn btn-primary btn-sm">{saving ? 'Adding…' : 'Add reviewed steps'}</button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      {notice && <p className="text-xs text-emerald-600">{notice}</p>}
    </section>
  );
}

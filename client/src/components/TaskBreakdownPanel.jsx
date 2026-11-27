import { useRef, useState } from 'react';
import { FiPlus, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { taskService } from '../services/taskService';
import {
  buildReviewedStepsPayload,
  getBreakdownGenerationError,
  getBreakdownSaveError,
} from '../utils/taskBreakdown';

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export default function TaskBreakdownPanel({ task }) {
  const [items, setItems] = useState([]);
  const [savedSteps, setSavedSteps] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const savingRef = useRef(false);
  const generatingRef = useRef(false);
  const saveRequestIdRef = useRef(null);
  const savePayloadRef = useRef(null);

  const generate = async () => {
    if (generatingRef.current || savingRef.current || retryPending) return;
    generatingRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await taskService.generateBreakdown(task.id);
      setItems((result.subtasks || []).map((item) => ({ ...item, selected: true })));
    } catch (err) {
      setError(getBreakdownGenerationError(err));
    } finally {
      generatingRef.current = false;
      setBusy(false);
    }
  };

  const updateItem = (index, changes) => setItems((current) => current.map((item, i) => i === index ? { ...item, ...changes } : item));

  const saveSelected = async () => {
    if (savingRef.current) return;
    const requestId = saveRequestIdRef.current || createRequestId();
    const payload = savePayloadRef.current || buildReviewedStepsPayload(items, requestId);
    if (!payload.steps.length) return;

    savingRef.current = true;
    saveRequestIdRef.current = requestId;
    savePayloadRef.current = payload;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await taskService.addReviewedBreakdownSteps(task.id, payload);
      const submitted = new Map();
      payload.steps.forEach((step) => {
        const key = `${step.title}\u0000${step.description || ''}`;
        submitted.set(key, (submitted.get(key) || 0) + 1);
      });
      setItems((current) => {
        return current.filter((item) => {
          if (!item.selected || !item.title.trim()) return true;
          const key = `${item.title.trim()}\u0000${item.description?.trim() || ''}`;
          const remaining = submitted.get(key) || 0;
          if (remaining > 0) {
            submitted.set(key, remaining - 1);
            return false;
          }
          return true;
        });
      });
      setSavedSteps((current) => {
        const currentIds = new Set(current.map((savedTask) => Number(savedTask.id)));
        return [...current, ...(result.tasks || []).filter((savedTask) => !currentIds.has(Number(savedTask.id)))];
      });
      saveRequestIdRef.current = null;
      savePayloadRef.current = null;
      setRetryPending(false);
      setNotice('Reviewed steps added successfully.');
    } catch (err) {
      if (err?.response?.status === 422) {
        // Laravel validation happens before persistence, so this payload can be edited safely.
        saveRequestIdRef.current = null;
        savePayloadRef.current = null;
        setRetryPending(false);
      } else {
        // For an unknown network result, keep the submitted snapshot unchanged for a safe retry.
        setRetryPending(true);
      }
      setError(getBreakdownSaveError(err));
    } finally {
      savingRef.current = false;
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
        <button type="button" onClick={generate} disabled={busy || saving || retryPending} className="btn btn-secondary btn-sm">
          <FiRefreshCw size={13} className={busy ? 'animate-spin' : ''} /> {busy ? 'Generating…' : items.length ? 'Regenerate' : 'Suggest steps'}
        </button>
      </div>
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="card p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <input aria-label={`Include step ${index + 1}`} type="checkbox" checked={item.selected} disabled={busy || saving || retryPending} onChange={(e) => updateItem(index, { selected: e.target.checked })} className="mt-3" />
            <div className="flex-1 space-y-2">
              <input className="input" value={item.title} disabled={busy || saving || retryPending} onChange={(e) => updateItem(index, { title: e.target.value })} aria-label={`Step ${index + 1} title`} />
              <textarea className="input resize-y" rows={2} value={item.description || ''} disabled={busy || saving || retryPending} onChange={(e) => updateItem(index, { description: e.target.value })} aria-label={`Step ${index + 1} description`} />
            </div>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Remove step" disabled={busy || saving || retryPending} onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><FiTrash2 size={15} /></button>
          </div>
        </div>
      ))}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setItems((current) => [...current, { title: '', description: '', selected: true }])} disabled={busy || saving || retryPending} className="btn btn-ghost btn-sm"><FiPlus size={14} /> Add step</button>
          <button type="button" onClick={saveSelected} disabled={saving || !items.some((item) => item.selected && item.title.trim())} className="btn btn-primary btn-sm">{saving ? 'Adding…' : 'Add reviewed steps'}</button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="text-xs text-zinc-600" role="status">{notice}</p>}
      {savedSteps.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/20" aria-label="Steps added to your tasks">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Added to your tasks</p>
          <ul className="mt-1 list-inside list-disc text-xs text-[var(--app-text-secondary)]">
            {savedSteps.map((savedTask) => <li key={savedTask.id}>{savedTask.title}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

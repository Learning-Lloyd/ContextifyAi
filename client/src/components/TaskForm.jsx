import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiClock, FiFileText, FiX, FiZap } from 'react-icons/fi';
import LocationSearch from './LocationSearch';
import { suggestUrgencyFromDueDate } from '../utils/taskUtils';
import { taskService } from '../services/taskService';

const defaultValues = {
  title: '',
  description: '',
  category: '',
  notes: '',
  estimated_time_minutes: '',
  due_date: '',
  due_time: '',
  location: '',
  latitude: null,
  longitude: null,
};

const defaultFactors = {
  importance: 5,
  urgency: 5,
  time_availability: 5,
  current_workload: 5,
};

const sourceLabels = {
  ai: 'AI suggestion',
  heuristic: 'Keyword match',
  default: 'Default',
  calendar: 'Calendar',
};

function AutoFactorRow({ label, value, source, reason, loading }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--app-border)] last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--app-text)]">{label}</p>
        {loading ? (
          <p className="text-xs text-[var(--app-text-muted)] mt-0.5">Calculating...</p>
        ) : (
          <>
            <p className="text-xs text-[#111111] mt-0.5">{source}</p>
            {reason && (
              <p className="text-xs text-[var(--app-text-secondary)] mt-1">{reason}</p>
            )}
          </>
        )}
      </div>
      <span className="text-sm font-semibold text-[#111111] shrink-0">
        {loading ? '—' : `${value}/10`}
      </span>
    </div>
  );
}

export default function TaskForm({ isOpen, onClose, onSubmit, task = null, loading = false }) {
  const [form, setForm] = useState(defaultValues);
  const [factors, setFactors] = useState(defaultFactors);
  const [importanceOverride, setImportanceOverride] = useState(null);
  const [errors, setErrors] = useState({});
  const [importanceAnalysis, setImportanceAnalysis] = useState(null);
  const [calendarContext, setCalendarContext] = useState(null);
  const [analyzingFactors, setAnalyzingFactors] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState(null);
  const previewTimerRef = useRef(null);
  const previewRequestIdRef = useRef(0);
  const descriptionRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        notes: task.notes || '',
        estimated_time_minutes: task.estimated_time_minutes ?? '',
        due_date: task.due_date || '',
        due_time: task.due_time?.slice(0, 5) || '',
        location: task.location || '',
        latitude: task.latitude ?? null,
        longitude: task.longitude ?? null,
      });
      setFactors({
        importance: task.importance || 5,
        urgency: task.urgency || 5,
        time_availability: task.time_availability || 5,
        current_workload: task.current_workload || 5,
      });
      setImportanceOverride(task.importance_source === 'user' ? Number(task.importance) : null);
    } else {
      setForm(defaultValues);
      setFactors(defaultFactors);
      setImportanceOverride(null);
    }
    setErrors({});
    setImportanceAnalysis(null);
    setCalendarContext(null);
    setAnalysisError(null);
    setDescriptionError(null);
    setGeneratingDescription(false);
  }, [task, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    const title = form.title.trim();
    if (title.length < 3) {
      setImportanceAnalysis(null);
      setCalendarContext(null);
      setFactors((prev) => ({
        ...prev,
        importance: 5,
        urgency: form.due_date ? suggestUrgencyFromDueDate(form.due_date) : 5,
      }));
      return undefined;
    }

    previewTimerRef.current = setTimeout(async () => {
      const requestId = ++previewRequestIdRef.current;
      setAnalyzingFactors(true);
      setAnalysisError(null);

      try {
        const result = await taskService.previewScoring({
          title,
          description: form.description || '',
          due_date: form.due_date || null,
          due_time: form.due_time || null,
        });

        if (requestId !== previewRequestIdRef.current) return;

        const preview = result.preview;
        setFactors({
          importance: preview.importance,
          urgency: preview.urgency,
          time_availability: preview.time_availability,
          current_workload: preview.current_workload,
        });
        setImportanceAnalysis(preview.importance_analysis || null);
        setCalendarContext(preview.calendar_context || null);
      } catch {
        if (requestId !== previewRequestIdRef.current) return;

        setAnalysisError('Automatic scoring preview is temporarily unavailable. The server will still compute values when you save.');
        setImportanceAnalysis(null);
        setFactors((prev) => ({
          ...prev,
          urgency: form.due_date ? suggestUrgencyFromDueDate(form.due_date) : prev.urgency,
        }));
      } finally {
        if (requestId === previewRequestIdRef.current) {
          setAnalyzingFactors(false);
        }
      }
    }, 750);

    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [form.title, form.description, form.due_date, form.due_time, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleLocationChange = (locationData) => {
    setForm((prev) => ({
      ...prev,
      location: locationData.location,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
    }));
  };

  const handleGenerateDescription = async () => {
    if (descriptionRequestInFlightRef.current) return;
    if (!form.title.trim()) {
      setDescriptionError('Enter a task title first.');
      return;
    }
    descriptionRequestInFlightRef.current = true;
    setGeneratingDescription(true);
    setDescriptionError(null);
    try {
      const result = await taskService.generateDescription(form.title.trim(), form.description.trim());
      setForm((previous) => ({ ...previous, description: result.description }));
    } catch (error) {
      setDescriptionError(error.response?.data?.message || 'Could not generate a description. Try again.');
    } finally {
      descriptionRequestInFlightRef.current = false;
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.due_date) newErrors.due_date = 'Due date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...form,
      estimated_time_minutes: form.estimated_time_minutes ? Number(form.estimated_time_minutes) : null,
    };
    if (importanceOverride !== null) payload.importance = Number(importanceOverride);

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const mapped = {};
        Object.keys(apiErrors).forEach((key) => {
          mapped[key] = apiErrors[key][0];
        });
        setErrors(mapped);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="relative card w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)]">
          <h2 className="section-title">{task ? 'Edit Task' : 'Create Task'}</h2>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label" htmlFor="task-title">Title</label>
            <input
              id="task-title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              className="input"
              placeholder="Task title"
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="label mb-0" htmlFor="task-description">Description <span className="text-[var(--app-text-muted)] font-normal">(optional)</span></label>
              <button type="button" onClick={handleGenerateDescription} disabled={generatingDescription || !form.title.trim()} className="btn btn-ghost text-sm px-2 py-1 disabled:opacity-50">
                <FiFileText size={14} /> {generatingDescription ? 'Writing…' : 'Help me write'}
              </button>
            </div>
            <textarea
              id="task-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="input resize-none"
              placeholder="Add a short description (optional)"
            />
            {descriptionError && <p className="form-error mt-1">{descriptionError}</p>}
            <p className="text-xs text-[var(--app-text-muted)] mt-1">AI drafts text for you to review.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="task-category">Category</label>
              <select
                id="task-category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="input"
              >
                <option value="">Choose a category</option>
                {form.category && !['Academic', 'Personal', 'Work'].includes(form.category) && <option value={form.category}>{form.category} (existing)</option>}
                {['Academic', 'Personal', 'Work'].map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="task-estimated-time">Estimated time (min)</label>
              <input
                id="task-estimated-time"
                type="number"
                name="estimated_time_minutes"
                min="1"
                value={form.estimated_time_minutes}
                onChange={handleChange}
                className="input"
                placeholder="60"
              />
            </div>
          </div>

          {task && (
            <div>
              <label className="label" htmlFor="task-notes">Notes</label>
              <textarea
                id="task-notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                className="input resize-none"
                placeholder="Optional notes"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="task-due-date">Due Date</label>
              <input
                id="task-due-date"
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className="input"
              />
              {errors.due_date && <p className="form-error">{errors.due_date}</p>}
            </div>
            <div>
              <label className="label" htmlFor="task-due-time">Due Time</label>
              <input
                id="task-due-time"
                type="time"
                name="due_time"
                value={form.due_time}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <LocationSearch
            value={{ location: form.location, latitude: form.latitude, longitude: form.longitude }}
            onChange={handleLocationChange}
            error={errors.location}
          />

          {analysisError && <p className="text-sm text-[#444444]" role="status">{analysisError}</p>}
          <details className="card-kpi p-4 border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.04)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#111111]">
              <FiZap size={14} /> Scoring factors {analyzingFactors ? '· Updating…' : ''}
            </summary>
            <div className="mt-3">

            <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--app-border)]">
              <div className="min-w-0 flex-1">
                <label className="text-sm font-medium text-[var(--app-text)]" htmlFor="task-importance">Importance</label>
                <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                  {importanceOverride !== null
                    ? 'Your value will be used in the official score.'
                    : `${importanceAnalysis ? (sourceLabels[importanceAnalysis.source] || 'Suggested') : 'Suggested'} value; change it if needed.`}
                </p>
                {importanceAnalysis?.reason && importanceOverride === null && (
                  <p className="text-xs text-[var(--app-text-secondary)] mt-1">{importanceAnalysis.reason}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="task-importance"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={importanceOverride ?? factors.importance}
                    onChange={(event) => {
                      const value = event.target.value;
                      setImportanceOverride(value);
                    }}
                    className="input w-24"
                    aria-describedby="task-importance-help"
                  />
                  <span className="text-sm text-[var(--app-text-muted)]">/10</span>
                  {importanceOverride !== null && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImportanceOverride(null)}>
                      Use Contextify suggestion
                    </button>
                  )}
                  {analyzingFactors && <span className="text-xs text-[var(--app-text-muted)]">Updating suggestion…</span>}
                </div>
                <p id="task-importance-help" className="text-xs text-[var(--app-text-muted)] mt-1">Choose a whole number from 1 to 10. Leave the suggestion unchanged to let Gemini suggest the saved value when available; the keyword suggestion is used if Gemini cannot respond. A value you set is kept as yours.</p>
                {errors.importance && <p className="form-error mt-1">{errors.importance}</p>}
              </div>
            </div>

            <AutoFactorRow
              label="Urgency"
              value={factors.urgency}
              source="From deadline"
              reason={form.due_date ? 'Based on how soon it is due.' : 'Set a deadline to calculate.'}
              loading={false}
            />

            <AutoFactorRow
              label="Time Availability"
              value={factors.time_availability}
              source={calendarContext ? sourceLabels[calendarContext.source] || 'Calendar' : 'Calendar'}
              reason={calendarContext?.reason_time_availability}
              loading={analyzingFactors && form.title.trim().length >= 3}
            />

            <AutoFactorRow
              label="Current Workload"
              value={factors.current_workload}
              source={calendarContext ? sourceLabels[calendarContext.source] || 'Calendar' : 'Calendar'}
              reason={calendarContext?.reason_current_workload}
              loading={analyzingFactors && form.title.trim().length >= 3}
            />

            {importanceAnalysis && !analyzingFactors && (
              <p className="text-xs text-[var(--app-text-muted)] mt-3 flex items-center gap-1">
                <FiClock size={12} />
                Importance confidence: {importanceAnalysis.confidence}%
              </p>
            )}

            {calendarContext?.commitments_count > 0 && !analyzingFactors && (
              <p className="text-xs text-[var(--app-text-muted)] mt-1 flex items-center gap-1">
                <FiCalendar size={12} />
                {calendarContext.commitments_count} upcoming calendar commitment(s) considered
              </p>
            )}

            <p className="text-xs text-[var(--app-text-muted)] mt-3">Calculated automatically from task details and your calendar.</p>
            </div>
          </details>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

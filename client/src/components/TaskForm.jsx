import { useEffect, useRef, useState } from 'react';
import { FiCalendar, FiCheckSquare, FiClock, FiFileText, FiMapPin, FiTag, FiX, FiZap } from 'react-icons/fi';
import LocationSearch from './LocationSearch';
import { suggestUrgencyFromDueDate } from '../utils/taskUtils';
import { hoursToMinutes, minutesToHours } from '../utils/duration';
import { applyTaskSuggestion } from '../utils/taskSuggestions';
import { saveTaskWithoutAnalysis } from '../utils/taskCreationFlow';

import { taskService } from '../services/taskService';

const defaultValues = {
  title: '',
  description: '',
  category: '',
  notes: '',
  estimated_duration_hours: '',
  due_date: '',
  due_time: '',
  scheduled_start_date: '',
  scheduled_start_time: '',
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

export default function TaskForm({ isOpen, onClose, onSubmit, task = null, loading = false, suggestions = [], initialSuggestion = null }) {
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
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState('');
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const previewTimerRef = useRef(null);
  const previewRequestIdRef = useRef(0);
  const descriptionRequestInFlightRef = useRef(false);
  const submitRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        category: task.category || '',
        notes: task.notes || '',
        estimated_duration_hours: minutesToHours(task.estimated_time_minutes),
        due_date: task.due_date || '',
        due_time: task.due_time?.slice(0, 5) || '',
        scheduled_start_date: task.scheduled_start_date || '',
        scheduled_start_time: task.scheduled_start_time?.slice(0, 5) || '',
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
      setForm(initialSuggestion ? applyTaskSuggestion(defaultValues, initialSuggestion, true).form : defaultValues);
      setFactors(defaultFactors);
      setImportanceOverride(null);
    }
    setSelectedSuggestionIndex('');
    setPendingSuggestion(null);
    setErrors({});
    setImportanceAnalysis(null);
    setCalendarContext(null);
    setAnalysisError(null);
    setDescriptionError(null);
    setGeneratingDescription(false);
  }, [task, isOpen, initialSuggestion]);

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

  const handleUseSuggestion = () => {
    const suggestion = suggestions[Number(selectedSuggestionIndex)];
    if (!suggestion) return;
    const result = applyTaskSuggestion(form, suggestion);
    if (result.requiresConfirmation) {
      setPendingSuggestion(suggestion);
      return;
    }
    setForm(result.form);
    setPendingSuggestion(null);
    setErrors((previous) => {
      const next = { ...previous };
      ['title', 'estimated_duration_hours'].forEach((field) => delete next[field]);
      return next;
    });
  };

  const confirmUseSuggestion = () => {
    if (!pendingSuggestion) return;
    setForm(applyTaskSuggestion(form, pendingSuggestion, true).form);
    setPendingSuggestion(null);
    setErrors((previous) => {
      const next = { ...previous };
      ['title', 'estimated_duration_hours'].forEach((field) => delete next[field]);
      return next;
    });
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
    if (submitRequestInFlightRef.current) return;
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.due_date) newErrors.due_date = 'Due date is required';
    if (!form.scheduled_start_date && form.scheduled_start_time) newErrors.scheduled_start_date = 'Choose a start date before entering a start time.';
    if (form.estimated_duration_hours !== '') {
      const hours = Number(form.estimated_duration_hours);
      const minutes = hoursToMinutes(hours);
      if (!Number.isFinite(hours) || hours < 0.02 || hours > 168 || !minutes || minutes > 10080) {
        newErrors.estimated_duration_hours = 'Enter a duration from 0.02 to 168 hours.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const { estimated_duration_hours: durationHours, ...taskDetails } = form;
    const payload = {
      ...taskDetails,
      estimated_time_minutes: hoursToMinutes(durationHours),
    };
    if (importanceOverride !== null) payload.importance = Number(importanceOverride);

    submitRequestInFlightRef.current = true;
    try {
      await saveTaskWithoutAnalysis({ saveTask: onSubmit, taskData: payload });
      onClose();
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const mapped = {};
        Object.keys(apiErrors).forEach((key) => {
          mapped[key] = apiErrors[key][0];
        });
        if (mapped.estimated_time_minutes) {
          mapped.estimated_duration_hours = mapped.estimated_time_minutes;
          delete mapped.estimated_time_minutes;
        }
        setErrors(mapped);
      }
    } finally {
      submitRequestInFlightRef.current = false;
    }
  };

  return (
    <div className="task-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 modal-overlay" onClick={loading ? undefined : onClose} aria-hidden="true" />

      <section className="task-modal-shell relative w-full animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" aria-describedby="task-modal-subtitle">
        <header className="task-modal-header">
          <div className="task-modal-heading-group">
            <span className="task-modal-icon"><FiCheckSquare size={20} /></span>
            <div>
              <p className="task-modal-eyebrow">CONTEXTIFY TASK</p>
              <h2 id="task-modal-title">{task ? 'Edit Task' : 'Create a New Task'}</h2>
              <p id="task-modal-subtitle">{task ? 'Update the details and context for this task.' : 'Add the details and context needed to prioritize your task.'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="task-modal-close" aria-label="Close task form" disabled={loading}>

            <FiX size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate className="task-modal-form">
          <div className="task-modal-scroll">
            {!task && suggestions.length > 0 && (
              <details className="mb-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-muted)]/40 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">Suggested task ideas <span className="font-normal text-[var(--app-text-muted)]">(optional)</span></summary>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-xs font-medium text-[var(--app-text-secondary)]" htmlFor="task-suggestion-select">
                    Choose an idea
                    <select id="task-suggestion-select" className="input mt-1" value={selectedSuggestionIndex} onChange={(event) => { setSelectedSuggestionIndex(event.target.value); setPendingSuggestion(null); }}>
                      <option value="">Select a suggestion…</option>
                      {suggestions.map((suggestion, index) => <option key={`${suggestion.title}-${index}`} value={index}>{suggestion.title}{suggestion.category ? ` · ${suggestion.category}` : ''}</option>)}
                    </select>
                  </label>
                  <button type="button" className="btn btn-secondary btn-sm shrink-0" disabled={selectedSuggestionIndex === ''} onClick={handleUseSuggestion}>Use idea</button>
                </div>
                {pendingSuggestion && (
                  <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100" role="status">
                    <p>Some task details are already filled in. Replace the title, description, category, and estimate with “{pendingSuggestion.title}”?</p>
                    <div className="mt-2 flex gap-2"><button type="button" className="btn btn-primary btn-sm" onClick={confirmUseSuggestion}>Replace details</button><button type="button" className="btn btn-secondary btn-sm" onClick={() => setPendingSuggestion(null)}>Keep my details</button></div>
                  </div>
                )}
              </details>
            )}

            <section className="task-form-section" aria-labelledby="task-details-heading">
              <div className="task-form-section-heading">
                <span className="task-form-section-icon"><FiFileText size={16} /></span>
                <div><h3 id="task-details-heading">Task details</h3><p>Give this task a clear name and category.</p></div>
              </div>

              <div className="task-form-field">
                <label className="label" htmlFor="task-title">Task title <span className="task-required">Required</span></label>
                <input
                  id="task-title"
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="input task-modal-input"
                  placeholder="e.g. Prepare for the biology exam"
                  maxLength={255}
                  autoFocus
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'task-title-error' : undefined}
                />
                {errors.title && <p className="form-error" id="task-title-error">{errors.title}</p>}
              </div>

              <div className="task-form-field">
                <div className="task-description-heading">
                  <label className="label" htmlFor="task-description">Description <span>(optional)</span></label>
                  <button type="button" onClick={handleGenerateDescription} disabled={generatingDescription || !form.title.trim()} className="task-ai-write" aria-busy={generatingDescription}>
                    <FiFileText size={14} /> {generatingDescription ? 'Writing…' : 'Help me write'}
                  </button>
                </div>
                <textarea
                  id="task-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="input task-modal-input task-modal-textarea"
                  placeholder="Add helpful context, requirements, or notes for this task…"
                />
                {descriptionError && <p className="form-error" role="alert">{descriptionError}</p>}
                <p className="task-field-hint">AI drafts are optional. Review and edit the description before saving.</p>
              </div>

              <div className="task-form-field">
                <label className="label" htmlFor="task-category">Category <span>(optional)</span></label>
                <div className="task-modal-select-wrap"><FiTag size={15} aria-hidden="true" />
                  <select id="task-category" name="category" value={form.category} onChange={handleChange} className="input task-modal-input task-modal-select">
                    <option value="">Choose a category</option>
                    {form.category && !['Academic', 'Personal', 'Work'].includes(form.category) && <option value={form.category}>{form.category} (existing)</option>}
                    {['Academic', 'Personal', 'Work'].map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="task-form-section" aria-labelledby="task-schedule-heading">
              <div className="task-form-section-heading">
                <span className="task-form-section-icon task-form-section-icon-violet"><FiCalendar size={16} /></span>
                <div><h3 id="task-schedule-heading">Time &amp; schedule</h3><p>Estimate the effort and set the deadline.</p></div>
              </div>

              <div className="task-schedule-grid">
                <div className="task-form-field">
                  <label className="label" htmlFor="task-scheduled-start-date">Scheduled start date <span>(optional)</span></label>
                  <div className="task-date-input-wrap"><FiCalendar size={15} aria-hidden="true" />
                    <input id="task-scheduled-start-date" type="date" name="scheduled_start_date" value={form.scheduled_start_date} onChange={handleChange} className="input task-modal-input" aria-invalid={Boolean(errors.scheduled_start_date)} />
                  </div>
                  {errors.scheduled_start_date && <p className="form-error">{errors.scheduled_start_date}</p>}
                  <p className="task-field-hint">Used to place the task on your timeline. Existing tasks remain unscheduled until you set a start.</p>
                </div>
                <div className="task-form-field">
                  <label className="label" htmlFor="task-scheduled-start-time">Scheduled start time <span>(optional)</span></label>
                  <div className="task-date-input-wrap"><FiClock size={15} aria-hidden="true" />
                    <input id="task-scheduled-start-time" type="time" name="scheduled_start_time" value={form.scheduled_start_time} onChange={handleChange} className="input task-modal-input" aria-invalid={Boolean(errors.scheduled_start_time)} />
                  </div>
                  {errors.scheduled_start_time && <p className="form-error">{errors.scheduled_start_time}</p>}
                </div>
                <div className="task-form-field">
                  <label className="label" htmlFor="task-estimated-duration">Estimated Duration (hours) <span>(optional)</span></label>
                  <div className="task-duration-input-wrap">
                    <FiClock size={16} aria-hidden="true" />
                    <input
                      id="task-estimated-duration"
                      type="number"
                      name="estimated_duration_hours"
                      min="0.02"
                      max="168"
                      step="0.01"
                      inputMode="decimal"
                      value={form.estimated_duration_hours}
                      onChange={handleChange}
                      className="input task-modal-input"
                      placeholder="e.g. 1.5"
                      aria-invalid={Boolean(errors.estimated_duration_hours)}
                      aria-describedby="task-duration-help"
                    />
                    <span className="task-duration-unit">hours</span>
                  </div>
                  <p id="task-duration-help" className="task-field-hint">Enter a decimal: 0.5 = 30 min · 1.5 = 1 hr 30 min.</p>
                  {errors.estimated_duration_hours && <p className="form-error">{errors.estimated_duration_hours}</p>}
                </div>

                <div className="task-form-field">
                  <label className="label" htmlFor="task-due-date">Due date <span className="task-required">Required</span></label>
                  <div className="task-date-input-wrap"><FiCalendar size={15} aria-hidden="true" />
                    <input id="task-due-date" type="date" name="due_date" value={form.due_date} onChange={handleChange} className="input task-modal-input" aria-invalid={Boolean(errors.due_date)} />
                  </div>
                  {errors.due_date && <p className="form-error">{errors.due_date}</p>}
                </div>

                <div className="task-form-field">
                  <label className="label" htmlFor="task-due-time">Due time <span>(optional)</span></label>
                  <div className="task-date-input-wrap"><FiClock size={15} aria-hidden="true" />
                    <input id="task-due-time" type="time" name="due_time" value={form.due_time} onChange={handleChange} className="input task-modal-input" />
                  </div>
                </div>
              </div>
            </section>

            <section className="task-form-section task-context-section" aria-labelledby="task-context-heading">
              <div className="task-form-section-heading">
                <span className="task-form-section-icon task-form-section-icon-teal"><FiMapPin size={16} /></span>
                <div><h3 id="task-context-heading">Context &amp; location</h3><p>Add a location to include relevant local context.</p></div>
              </div>
              <div className="task-modal-location">
                <LocationSearch
                  value={{ location: form.location, latitude: form.latitude, longitude: form.longitude }}
                  onChange={handleLocationChange}
                  error={errors.location}
                />
              </div>
            </section>

            {task && (
              <section className="task-form-section">
                <div className="task-form-field">
                  <label className="label" htmlFor="task-notes">Notes <span>(optional)</span></label>
                  <textarea id="task-notes" name="notes" value={form.notes} onChange={handleChange} rows={2} className="input task-modal-input task-modal-textarea" placeholder="Private notes for this task" />
                </div>
              </section>
            )}

            {analysisError && <p className="task-analysis-notice" role="status">{analysisError}</p>}
            <details className="task-scoring-details">
              <summary><span className="task-form-section-icon task-form-section-icon-violet"><FiZap size={15} /></span><span><strong>Scoring context</strong><small>{analyzingFactors ? 'Updating suggested factors…' : 'View how Contextify will evaluate this task.'}</small></span></summary>
              <div className="task-scoring-content">
                <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--app-border)]">
                  <div className="min-w-0 flex-1">
                    <label className="text-sm font-medium text-[var(--app-text)]" htmlFor="task-importance">Importance</label>
                    <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                      {importanceOverride !== null ? 'Your value will be used in the official score.' : `${importanceAnalysis ? (sourceLabels[importanceAnalysis.source] || 'Suggested') : 'Suggested'} value; change it if needed.`}
                    </p>
                    {importanceAnalysis?.reason && importanceOverride === null && <p className="text-xs text-[var(--app-text-secondary)] mt-1">{importanceAnalysis.reason}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <input id="task-importance" type="number" min="1" max="10" step="1" value={importanceOverride ?? factors.importance} onChange={(event) => setImportanceOverride(event.target.value)} className="input w-24" aria-describedby="task-importance-help" />
                      <span className="text-sm text-[var(--app-text-muted)]">/10</span>
                      {importanceOverride !== null && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImportanceOverride(null)}>Use Contextify suggestion</button>}
                      {analyzingFactors && <span className="text-xs text-[var(--app-text-muted)]">Updating suggestion…</span>}
                    </div>
                    <p id="task-importance-help" className="text-xs text-[var(--app-text-muted)] mt-1">Choose a whole number from 1 to 10. Leave the suggestion unchanged to let Gemini suggest the saved value when available; the keyword suggestion is used if Gemini cannot respond. A value you set is kept as yours.</p>
                    {errors.importance && <p className="form-error mt-1">{errors.importance}</p>}
                  </div>
                </div>
                <AutoFactorRow label="Urgency" value={factors.urgency} source="From deadline" reason={form.due_date ? 'Based on how soon it is due.' : 'Set a deadline to calculate.'} loading={false} />
                <AutoFactorRow label="Time Availability" value={factors.time_availability} source={calendarContext ? sourceLabels[calendarContext.source] || 'Calendar' : 'Calendar'} reason={calendarContext?.reason_time_availability} loading={analyzingFactors && form.title.trim().length >= 3} />
                <AutoFactorRow label="Current Workload" value={factors.current_workload} source={calendarContext ? sourceLabels[calendarContext.source] || 'Calendar' : 'Calendar'} reason={calendarContext?.reason_current_workload} loading={analyzingFactors && form.title.trim().length >= 3} />
                {importanceAnalysis && !analyzingFactors && <p className="text-xs text-[var(--app-text-muted)] mt-3 flex items-center gap-1"><FiClock size={12} /> Importance confidence: {importanceAnalysis.confidence}%</p>}
                {calendarContext?.commitments_count > 0 && !analyzingFactors && <p className="text-xs text-[var(--app-text-muted)] mt-1 flex items-center gap-1"><FiCalendar size={12} /> {calendarContext.commitments_count} upcoming calendar commitment(s) considered</p>}
                <p className="text-xs text-[var(--app-text-muted)] mt-3">Calculated automatically from task details and your calendar.</p>
              </div>
            </details>
          </div>

          <footer className="task-modal-footer">
            <p><span className="task-required-dot" /> Required fields are marked</p>
            <div className="task-modal-footer-actions">
              <button type="button" onClick={onClose} className="btn task-modal-cancel" disabled={loading}>Cancel</button>
              <button type="submit" disabled={loading} className="btn task-modal-submit">
                {loading ? <><span className="task-submit-spinner" /> Saving…</> : task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { FiX, FiZap } from 'react-icons/fi';
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
  importance: 5,
  urgency: 5,
  urgency_manual: false,
  time_availability: 5,
  current_workload: 5,
};

function calculateScore(importance, urgency, timeAvailability, currentWorkload) {
  return (
    importance * 0.4 +
    urgency * 0.3 +
    timeAvailability * 0.2 +
    currentWorkload * 0.1
  ).toFixed(2);
}

export default function TaskForm({ isOpen, onClose, onSubmit, task = null, loading = false }) {
  const [form, setForm] = useState(defaultValues);
  const [errors, setErrors] = useState({});
  const [importanceSuggestion, setImportanceSuggestion] = useState(null);
  const [analyzingImportance, setAnalyzingImportance] = useState(false);
  const analyzeTimerRef = useRef(null);

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
        importance: task.importance || 5,
        urgency: task.urgency || 5,
        urgency_manual: task.urgency_manual || false,
        time_availability: task.time_availability || 5,
        current_workload: task.current_workload || 5,
      });
    } else {
      setForm(defaultValues);
    }
    setErrors({});
    setImportanceSuggestion(null);
  }, [task, isOpen]);

  useEffect(() => {
    if (!isOpen || task) return undefined;

    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
    }

    const title = form.title.trim();
    if (title.length < 3) {
      setImportanceSuggestion(null);
      return undefined;
    }

    analyzeTimerRef.current = setTimeout(async () => {
      setAnalyzingImportance(true);
      try {
        const result = await taskService.analyzeImportance(title, form.description || '');
        const analysis = result.analysis;
        setImportanceSuggestion(analysis);
        setForm((prev) => ({ ...prev, importance: analysis.importance }));
      } catch {
        setImportanceSuggestion(null);
      } finally {
        setAnalyzingImportance(false);
      }
    }, 700);

    return () => {
      if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    };
  }, [form.title, form.description, isOpen, task]);

  if (!isOpen) return null;

  const previewScore = calculateScore(
    form.importance,
    form.urgency,
    form.time_availability,
    form.current_workload
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: ['title', 'description', 'category', 'notes', 'due_date', 'due_time', 'estimated_time_minutes'].includes(name)
          ? value
          : Number(value),
      };

      if (name === 'due_date' && !prev.urgency_manual) {
        next.urgency = suggestUrgencyFromDueDate(value);
      }

      if (name === 'importance') {
        setImportanceSuggestion(null);
      }

      return next;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleUrgencyChange = (e) => {
    setForm((prev) => ({
      ...prev,
      urgency: Number(e.target.value),
      urgency_manual: true,
    }));
  };

  const handleLocationChange = (locationData) => {
    setForm((prev) => ({
      ...prev,
      location: locationData.location,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.due_date) newErrors.due_date = 'Due date is required';
    if (form.importance < 1 || form.importance > 10) newErrors.importance = 'Must be 1-10';
    if (form.urgency < 1 || form.urgency > 10) newErrors.urgency = 'Must be 1-10';
    if (form.time_availability < 1 || form.time_availability > 10) newErrors.time_availability = 'Must be 1-10';
    if (form.current_workload < 1 || form.current_workload > 10) newErrors.current_workload = 'Must be 1-10';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...form,
      estimated_time_minutes: form.estimated_time_minutes ? Number(form.estimated_time_minutes) : null,
    };

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

  const sliders = [
    { name: 'importance', label: 'Importance', weight: '× 0.40', manual: false },
    { name: 'urgency', label: 'Urgency', weight: '× 0.30', manual: true },
    { name: 'time_availability', label: 'Time Availability', weight: '× 0.20', manual: false },
    { name: 'current_workload', label: 'Current Workload', weight: '× 0.10', manual: false },
  ];

  const sourceLabels = {
    ai: 'AI suggestion',
    heuristic: 'Keyword-based suggestion',
    default: 'Default',
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
              placeholder="Enter task title"
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          <div>
            <label className="label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="input resize-none"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="task-category">Category</label>
              <input
                id="task-category"
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Academic"
              />
            </div>
            <div>
              <label className="label" htmlFor="task-estimated-time">Est. Time (minutes)</label>
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

          {(importanceSuggestion || analyzingImportance) && (
            <div className="card-kpi p-4 border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.04)]">
              <div className="flex items-center gap-2 text-sm font-medium text-[#2563EB] mb-2">
                <FiZap size={14} />
                {analyzingImportance ? 'Analyzing importance...' : 'Importance Suggestion'}
              </div>
              {importanceSuggestion && !analyzingImportance && (
                <>
                  <p className="text-sm text-[var(--app-text)]">
                    Suggested: <strong>{importanceSuggestion.importance}/10</strong>
                    {' · '}
                    Confidence: {importanceSuggestion.confidence}%
                    {' · '}
                    <span className="text-[var(--app-text-muted)]">
                      {sourceLabels[importanceSuggestion.source] || importanceSuggestion.source}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--app-text-secondary)] mt-1">{importanceSuggestion.reason}</p>
                  <p className="text-xs text-[var(--app-text-muted)] mt-2">
                    You can adjust the importance slider below.
                  </p>
                </>
              )}
            </div>
          )}

          {sliders.map(({ name, label, weight, manual }) => (
            <div key={name}>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-[var(--app-text)]">
                  {label} <span className="text-[var(--app-text-muted)]">{weight}</span>
                  {manual && form.urgency_manual && (
                    <span className="text-xs text-[#2563EB] ml-2">(manual)</span>
                  )}
                  {manual && !form.urgency_manual && form.due_date && (
                    <span className="text-xs text-[#14B8A6] ml-2">(auto from deadline)</span>
                  )}
                </label>
                <span className="text-sm font-semibold text-[#2563EB]">{form[name]}</span>
              </div>
              <input
                type="range"
                name={name}
                min="1"
                max="10"
                value={form[name]}
                onChange={manual ? handleUrgencyChange : handleChange}
                className="w-full"
              />
              {errors[name] && <p className="form-error">{errors[name]}</p>}
            </div>
          ))}

          <div className="card-kpi text-center">
            <p className="card-kpi-label">Preview Priority Score</p>
            <p className="card-kpi-value text-[#2563EB]">{previewScore}</p>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

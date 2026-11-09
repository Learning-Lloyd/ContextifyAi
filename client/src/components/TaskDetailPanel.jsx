import { useEffect } from 'react';
import { FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiCopy, FiEdit2, FiMapPin, FiTrash2, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import PriorityBadge from './PriorityBadge';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

function formatDeadline(task) {
  if (!task.due_date) return 'No deadline';
  const date = new Date(`${task.due_date}T00:00:00`);
  const label = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return task.due_time ? `${label} · ${task.due_time.slice(0, 5)}` : label;
}

export default function TaskDetailPanel({ task, onClose, onEdit, onToggle, onDelete, onArchive, onDuplicate }) {
  useEffect(() => {
    if (!task) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [task, onClose]);

  if (!task) return null;
  const countdown = getCountdownLabel(task.due_date, task.due_time);
  const completed = task.status === 'completed';
  const overdue = !completed && countdown?.startsWith('Overdue');

  return (
    <div className="task-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="task-detail-panel" role="dialog" aria-modal="true" aria-labelledby="task-panel-title">
        <header className="task-detail-header">
          <div><p className="eyebrow">TASK DETAILS</p><span className={`task-status-tag ${completed ? 'is-complete' : overdue ? 'is-overdue' : 'is-pending'}`}>{completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'}</span></div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close task details"><FiX /></button>
        </header>
        <div className="task-detail-body">
          <h2 id="task-panel-title">{task.title}</h2>
          <div className="task-detail-priority">{task.analyzed ? <PriorityBadge level={task.priority_level} /> : <span className="task-board-muted">Analyze this task in Decision Lab to see its priority.</span>}</div>
          {task.description && <p className="task-detail-description">{task.description}</p>}
          <dl className="task-detail-fields">
            <div><dt><FiCalendar /> Deadline</dt><dd>{formatDeadline(task)}</dd></div>
            <div><dt><FiClock /> Time remaining</dt><dd className={overdue ? 'is-overdue' : ''}>{countdown || '—'}</dd></div>
            <div><dt>Category</dt><dd>{task.category || '—'}</dd></div>
            <div><dt>Estimated duration</dt><dd>{task.estimated_time_minutes ? `${task.estimated_time_minutes} minutes` : '—'}</dd></div>
            {task.location && <div><dt><FiMapPin /> Location</dt><dd>{task.location}</dd></div>}
            {task.weather_condition && <div><dt>Weather context</dt><dd>{weatherIcon(task.weather_condition)} {task.weather_condition}{task.temperature != null ? ` · ${task.temperature}°` : ''}{task.rain_probability != null ? ` · ${task.rain_probability}% rain` : ''}</dd></div>}
            {task.notes && <div><dt>Notes</dt><dd>{task.notes}</dd></div>}
          </dl>
          {task.analyzed && task.analysis_explanation && <section className="task-analysis-explanation"><strong>Why this is your priority</strong><p>{task.analysis_explanation}</p></section>}
        </div>
        <footer className="task-detail-footer">
          <button type="button" className="btn btn-primary" onClick={() => onToggle(task.id)}><FiCheckCircle /> {completed ? 'Reopen task' : 'Mark complete'}</button>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(task)}><FiEdit2 /> Edit</button>
          <button type="button" className="btn btn-quiet" onClick={() => onArchive(task.id)}>{task.is_archived ? 'Restore' : 'Archive'}</button>
          <button type="button" className="btn btn-quiet" onClick={() => onDuplicate(task.id)}><FiCopy /> Duplicate</button>
          <button type="button" className="task-action-button danger" onClick={() => onDelete(task.id)} aria-label="Delete task" title="Delete task"><FiTrash2 /></button>
          <Link className="task-detail-full-link" to={`/tasks/${task.id}`} onClick={onClose}>Open full task page <FiArrowUpRight /></Link>
        </footer>
      </aside>
    </div>
  );
}

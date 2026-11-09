import { FiArchive, FiArrowUpRight, FiCheckCircle, FiCopy, FiEdit2, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import PriorityBadge from './PriorityBadge';
import { getCountdownLabel } from '../utils/taskUtils';

function prettyDate(value, time) {
  if (!value) return 'No deadline';
  const date = new Date(`${value}T00:00:00`);
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return time ? `${label} · ${time.slice(0, 5)}` : label;
}

export default function TaskCard({ task, onOpen, onToggle, onDelete, onEdit, onArchive, onRestore, onDuplicate }) {
  const completed = task.status === 'completed';
  const countdown = getCountdownLabel(task.due_date, task.due_time);
  const overdue = !completed && countdown?.startsWith('Overdue');

  return (
    <tr className={`task-board-row ${completed ? 'is-complete' : ''} ${overdue ? 'is-overdue' : ''}`}>
      <td className="task-board-task-cell">
        <div className="task-board-title-line">
          <button type="button" onClick={() => onOpen?.(task)} className="task-row-title task-board-open-detail">
            {task.title}<FiArrowUpRight aria-hidden="true" />
          </button>
          <span className={`task-analysis-tag ${task.analyzed ? 'is-analyzed' : 'needs-analysis'}`}>
            {task.analyzed ? 'Analyzed' : 'Needs analysis'}
          </span>
        </div>
        {task.description && <p className="task-row-description line-clamp-2">{task.description}</p>}
        {task.analyzed && task.analysis_explanation && (
          <div className="task-analysis-explanation">
            <div className="flex items-center justify-between gap-2">
              <strong>Why this is your priority</strong>
              {task.analysis_explanation_source && <span className="task-explanation-source">{task.analysis_explanation_source === 'ai' ? 'AI explanation' : 'Based on scoring results'}</span>}
            </div>
            <p>{task.analysis_explanation}</p>
          </div>
        )}
      </td>
      <td>
        <span className={`task-status-tag ${completed ? 'is-complete' : overdue ? 'is-overdue' : 'is-pending'}`}>
          {completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
        </span>
      </td>
      <td>{task.analyzed ? <PriorityBadge level={task.priority_level} /> : <span className="task-board-muted">Analyze first</span>}</td>
      <td className="task-board-deadline">{prettyDate(task.due_date, task.due_time)}</td>
      <td><span className={`task-countdown ${overdue ? 'is-overdue' : ''}`}>{countdown || '—'}</span></td>
      <td>{task.category || <span className="task-board-muted">—</span>}</td>
      <td>{task.estimated_time_minutes ? `${task.estimated_time_minutes} min` : <span className="task-board-muted">—</span>}</td>
      <td>
        <div className="task-board-actions">
          <button type="button" className={`task-action-button ${completed ? 'undo' : ''}`} onClick={() => onToggle(task.id)} aria-label={completed ? `Mark ${task.title} pending` : `Mark ${task.title} complete`} title={completed ? 'Mark pending' : 'Complete task'}><FiCheckCircle /></button>
          {onEdit && <button type="button" className="task-action-button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task"><FiEdit2 /></button>}
          {onDelete && <button type="button" className="task-action-button danger" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`} title="Delete task"><FiTrash2 /></button>}
          {task.is_archived
            ? onRestore && <button type="button" className="task-action-button" onClick={() => onRestore(task.id)} aria-label={`Restore ${task.title}`} title="Restore task"><FiRotateCcw /></button>
            : onArchive && <button type="button" className="task-action-button" onClick={() => onArchive(task.id)} aria-label={`Archive ${task.title}`} title="Archive task"><FiArchive /></button>}
          {onDuplicate && <button type="button" className="task-action-button" onClick={() => onDuplicate(task.id)} aria-label={`Duplicate ${task.title}`} title="Duplicate task"><FiCopy /></button>}
        </div>
      </td>
    </tr>
  );
}

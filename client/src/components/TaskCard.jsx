import { FiArchive, FiArrowUpRight, FiCheckCircle, FiCopy, FiEdit2, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import PriorityBadge from './PriorityBadge';
import { getCountdownLabel } from '../utils/taskUtils';
import { formatMinutesAsHours } from '../utils/duration';

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
          {!completed && task.rank && <span className="task-rank-chip" aria-label={`Priority rank ${task.rank}`}>#{task.rank}</span>}
          <span className={`task-analysis-tag ${task.analyzed ? 'is-analyzed' : 'is-scored'}`} title={task.analyzed ? 'Included in a saved Decision Lab analysis' : 'Official priority is calculated automatically'}>
            {task.analyzed ? 'Compared' : 'Auto-scored'}
          </span>
        </div>
        {task.description && <p className="task-row-description line-clamp-2">{task.description}</p>}
      </td>
      <td>
        <span className={`task-status-tag ${completed ? 'is-complete' : overdue ? 'is-overdue' : 'is-pending'}`}>
          {completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
        </span>
      </td>
      <td>{task.priority_score != null ? <PriorityBadge level={task.priority_level} score={Number(task.priority_score).toFixed(1)} /> : <span className="task-board-muted">Score unavailable</span>}</td>
      <td className="task-board-deadline">{prettyDate(task.due_date, task.due_time)}</td>
      <td><span className={`task-countdown ${overdue ? 'is-overdue' : ''}`}>{countdown || '—'}</span></td>
      <td>{task.category ? <span className={`task-category-tag category-${String(task.category).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{task.category}</span> : <span className="task-board-muted">—</span>}</td>
      <td>{task.estimated_time_minutes ? formatMinutesAsHours(task.estimated_time_minutes, true) : <span className="task-board-muted">—</span>}</td>
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

import { FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiEdit2, FiMapPin, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import PriorityBadge from './PriorityBadge';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

function prettyDate(value) {
  if (!value) return 'No deadline';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const completed = task.status === 'completed';
  const countdown = task.countdown || getCountdownLabel(task.due_date, task.due_time);
  const overdue = task.deadline_group === 'overdue' || countdown === 'Overdue';

  return (
    <article className={`task-queue-row ${completed ? 'is-complete' : ''} ${overdue ? 'is-overdue' : ''}`}>
      <div className="task-row-score"><span>{Number(task.priority_score || 0).toFixed(2)}</span><small>score</small></div>
      <div className="task-row-content">
        <div className="task-row-markers">
          {task.priority_level && <PriorityBadge level={task.priority_level} />}
          {overdue && <span className="task-overdue-tag">Overdue</span>}
          {task.category && <span className="task-category-tag">{task.category}</span>}
          {task.is_archived && <span className="task-category-tag">Archived</span>}
        </div>
        <Link to={`/tasks/${task.id}`} className="task-row-title">{task.title}<FiArrowUpRight aria-hidden="true" /></Link>
        {task.description && <p className="task-row-description">{task.description}</p>}
        <div className="task-row-meta">
          <span><FiCalendar /> {prettyDate(task.due_date)}{task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ''}</span>
          {task.estimated_time_minutes && <span><FiClock /> {task.estimated_time_minutes} min</span>}
          {task.location && <span><FiMapPin /> {task.location}</span>}
          {task.weather_condition && <span>{weatherIcon(task.weather_condition)} {task.weather_condition}{task.temperature != null ? ` · ${task.temperature}°` : ''}</span>}
          {!overdue && countdown && <span className="task-countdown">{countdown}</span>}
        </div>
      </div>
      <div className="task-row-factors" aria-label="Task scoring factors">
        <span title="Importance">I <b>{task.importance}</b></span>
        <span title="Urgency">U <b>{task.urgency}</b></span>
        <span title="Time availability">T <b>{task.time_availability}</b></span>
        <span title="Current workload">W <b>{task.current_workload}</b></span>
      </div>
      <div className="task-row-actions">
        <button type="button" className={`task-action-button ${completed ? 'undo' : ''}`} onClick={() => onToggle(task.id)} aria-label={completed ? `Mark ${task.title} pending` : `Mark ${task.title} complete`} title={completed ? 'Mark pending' : 'Complete task'}><FiCheckCircle /></button>
        {onEdit && <button type="button" className="task-action-button" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task"><FiEdit2 /></button>}
        {onDelete && <button type="button" className="task-action-button danger" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`} title="Delete task"><FiTrash2 /></button>}
      </div>
    </article>
  );
}

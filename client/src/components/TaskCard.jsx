import { FiCheck, FiEdit2, FiMapPin, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import PriorityBadge from './PriorityBadge';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

export default function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const isCompleted = task.status === 'completed';
  const countdown = task.countdown || getCountdownLabel(task.due_date, task.due_time);

  const scoreBadge = () => {
    if (task.priority_score >= 8) return 'badge-danger';
    if (task.priority_score >= 5) return 'badge-warning';
    return 'badge-neutral';
  };

  return (
    <div
      className={`card p-5 card-hover animate-fade-in ${
        isCompleted ? 'opacity-70' : ''
      } ${task.deadline_group === 'overdue' ? 'border-[rgba(239,68,68,0.3)]' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${scoreBadge()}`}>
              Score {task.priority_score}
            </span>
            {task.priority_level && <PriorityBadge level={task.priority_level} />}
            <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}>
              {task.status}
            </span>
            {countdown && (
              <span className={`badge ${countdown === 'Overdue' ? 'badge-danger' : 'badge-primary'}`}>
                {countdown}
              </span>
            )}
          </div>
          <Link to={`/tasks/${task.id}`}>
            <h3
              className={`text-base font-semibold hover:text-[#2563EB] transition-colors ${
                isCompleted ? 'line-through text-[var(--app-text-secondary)]' : 'text-[var(--app-text)]'
              }`}
            >
              {task.title}
            </h3>
          </Link>
          {task.description && (
            <p className="text-[var(--app-text-secondary)] text-sm mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-[var(--app-text-muted)]">
            {task.category && (
              <span className="badge badge-neutral">{task.category}</span>
            )}
            {task.due_date && (
              <span>Due: {task.due_date}{task.due_time ? ` ${task.due_time}` : ''}</span>
            )}
            {task.location && (
              <span className="flex items-center gap-1">
                <FiMapPin size={12} className="text-[#2563EB]" /> {task.location}
              </span>
            )}
            {task.weather_condition && (
              <span className="flex items-center gap-1">
                {weatherIcon(task.weather_condition)} {task.weather_condition}
                {task.temperature != null ? ` ${task.temperature}°C` : ''}
              </span>
            )}
            <span>Importance: {task.importance}</span>
            <span>Urgency: {task.urgency}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            className="btn btn-ghost btn-icon"
            title={isCompleted ? 'Mark pending' : 'Mark complete'}
            aria-label={isCompleted ? 'Mark pending' : 'Mark complete'}
          >
            <FiCheck size={16} className={isCompleted ? 'text-[#F59E0B]' : 'text-[#22C55E]'} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="btn btn-ghost btn-icon"
            title="Edit task"
            aria-label="Edit task"
          >
            <FiEdit2 size={16} className="text-[#2563EB]" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="btn btn-ghost btn-icon"
            title="Delete task"
            aria-label="Delete task"
          >
            <FiTrash2 size={16} className="text-[#EF4444]" />
          </button>
        </div>
      </div>
    </div>
  );
}

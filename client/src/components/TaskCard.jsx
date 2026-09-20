import { FiCalendar, FiCheck, FiClock, FiEdit2, FiMapPin, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import PriorityBadge from './PriorityBadge';
import ScoreRing from './ScoreRing';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

export default function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const isCompleted = task.status === 'completed';
  const countdown = task.countdown || getCountdownLabel(task.due_date, task.due_time);

  const isOverdue = task.deadline_group === 'overdue' || countdown === 'Overdue';
  const borderHighlight = isOverdue
    ? 'border-l-4 border-l-[#EF4444]'
    : task.priority_level === 'high'
    ? 'border-l-4 border-l-[#2563EB]'
    : task.priority_level === 'medium'
    ? 'border-l-4 border-l-[#F59E0B]'
    : 'border-l-4 border-l-[var(--app-border)]';

  return (
    <div
      className={`card p-5 card-hover animate-fade-in transition-all duration-200 ${borderHighlight} ${
        isCompleted ? 'opacity-65 bg-[var(--app-muted)]/40' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Score Ring */}
        <Link
          to={`/tasks/${task.id}`}
          className="shrink-0 pt-0.5 hover:scale-105 transition-transform"
          title={`Priority Score: ${task.priority_score}`}
        >
          <ScoreRing score={task.priority_score} variant="sm" />
        </Link>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {task.priority_level && <PriorityBadge level={task.priority_level} />}
            <span
              className={`badge ${
                isCompleted ? 'badge-success' : 'badge-neutral'
              } text-[11px] uppercase tracking-wider`}
            >
              {task.status}
            </span>
            {countdown && (
              <span
                className={`badge ${
                  isOverdue ? 'badge-danger' : 'badge-primary'
                } font-medium text-[11px]`}
              >
                {countdown}
              </span>
            )}
            {task.category && (
              <span className="badge badge-neutral text-[11px]">{task.category}</span>
            )}
          </div>

          <Link to={`/tasks/${task.id}`} className="group block">
            <h3
              className={`text-base font-semibold group-hover:text-[#2563EB] transition-colors ${
                isCompleted
                  ? 'line-through text-[var(--app-text-secondary)]'
                  : 'text-[var(--app-text)]'
              }`}
            >
              {task.title}
            </h3>
          </Link>

          {task.description && (
            <p className="text-[var(--app-text-secondary)] text-sm mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Context metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-[var(--app-text-muted)]">
            {task.due_date && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--app-text-secondary)]">
                <FiCalendar size={13} className="text-[#2563EB]" />
                {task.due_date}
                {task.due_time && (
                  <span className="inline-flex items-center gap-0.5 text-[var(--app-text-muted)]">
                    <FiClock size={11} /> {task.due_time}
                  </span>
                )}
              </span>
            )}
            {task.location && (
              <span className="inline-flex items-center gap-1">
                <FiMapPin size={12} className="text-[#2563EB]" /> {task.location}
              </span>
            )}
            {task.weather_condition && (
              <span className="inline-flex items-center gap-1 bg-[var(--app-muted)] px-2 py-0.5 rounded text-[11px]">
                {weatherIcon(task.weather_condition)} {task.weather_condition}
                {task.temperature != null ? ` · ${task.temperature}°C` : ''}
              </span>
            )}
            <span className="text-[11px] text-[var(--app-text-muted)] font-mono">
              Imp: {task.importance} · Urg: {task.urgency}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            className={`btn btn-ghost btn-icon w-8 h-8 rounded-lg transition-colors ${
              isCompleted
                ? 'hover:bg-amber-500/10 text-[#F59E0B]'
                : 'hover:bg-green-500/10 text-[#22C55E]'
            }`}
            title={isCompleted ? 'Mark pending' : 'Mark complete'}
            aria-label={isCompleted ? 'Mark pending' : 'Mark complete'}
          >
            <FiCheck size={16} />
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="btn btn-ghost btn-icon w-8 h-8 rounded-lg hover:bg-blue-500/10 text-[var(--app-text-secondary)] hover:text-[#2563EB]"
              title="Edit task"
              aria-label="Edit task"
            >
              <FiEdit2 size={15} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="btn btn-ghost btn-icon w-8 h-8 rounded-lg hover:bg-red-500/10 text-[var(--app-text-secondary)] hover:text-[#EF4444]"
              title="Delete task"
              aria-label="Delete task"
            >
              <FiTrash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

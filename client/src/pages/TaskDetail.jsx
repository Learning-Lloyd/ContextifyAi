import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiEdit2,
  FiMapPin,
} from 'react-icons/fi';
import Layout from '../components/Layout';
import PriorityBadge from '../components/PriorityBadge';
import TaskForm from '../components/TaskForm';
import TaskBreakdownPanel from '../components/TaskBreakdownPanel';
import { taskService } from '../services/taskService';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

export default function TaskDetail() {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const { id: taskId } = useParams();

  const fetchTask = useCallback(async () => {
    try {
      const result = await taskService.getById(taskId);
      setTask(result.task);
    } catch (err) {
      console.error('Failed to load task:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleUpdate = async (formData) => {
    setFormLoading(true);
    try {
      const result = await taskService.update(task.id, formData);
      setTask(result.task);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async () => {
    const result = await taskService.toggleComplete(task.id);
    setTask(result.task);
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-6 w-36 bg-[var(--app-muted)] rounded animate-pulse" />
          <div className="card p-8 space-y-4">
            <div className="h-8 w-3/4 bg-[var(--app-muted)] rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-[var(--app-muted)] rounded animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16 card p-8">
          <p className="text-base font-semibold text-[var(--app-text)]">Task Not Found</p>
          <p className="text-xs text-[var(--app-text-secondary)] mt-1 mb-6">
            The requested task record might have been deleted or archived.
          </p>
          <Link to="/tasks" className="btn btn-primary inline-flex">
            Back to Task List
          </Link>
        </div>
      </Layout>
    );
  }

  const countdown = task.countdown || getCountdownLabel(task.due_date, task.due_time);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Navigation Breadcrumb Back */}
        <div>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text-secondary)] hover:text-[#2563EB] transition-colors"
          >
            <FiArrowLeft size={14} /> Back to Tasks
          </Link>
        </div>

        {/* Environmental Weather Snapshot if Available */}
        {task.weather_condition && (
          <div className="card p-4 bg-[var(--app-card)] flex items-center justify-between border-l-4 border-l-[#14B8A6]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{weatherIcon(task.weather_condition)}</span>
              <div>
                <p className="text-xs font-semibold text-[var(--app-text)] flex items-center gap-1">
                  <FiMapPin size={12} className="text-[#2563EB]" /> {task.location}
                </p>
                <p className="text-xs text-[var(--app-text-secondary)] mt-0.5">
                  {task.temperature}°C · {task.weather_condition}
                  {task.rain_probability != null && ` · 💧 ${task.rain_probability}% rain chance`}
                </p>
              </div>
            </div>
            <span className="text-[10px] text-[var(--app-text-muted)] italic">
              Weather advisory
            </span>
          </div>
        )}

        {/* Main Task Card */}
        <div className="card p-7 space-y-6 shadow-sm">
          {/* Task details */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge level={task.priority_level} />
                <span
                  className={`badge ${
                    task.status === 'completed' ? 'badge-success' : 'badge-neutral'
                  } uppercase text-[10px] tracking-wider`}
                >
                  {task.status}
                </span>
                {countdown && (
                  <span
                    className={`badge ${
                      countdown === 'Overdue' ? 'badge-danger' : 'badge-primary'
                    } text-xs font-medium`}
                  >
                    {countdown}
                  </span>
                )}
                {task.category && (
                  <span className="badge badge-neutral text-xs">{task.category}</span>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-[var(--app-text)] leading-tight">
                {task.title}
              </h1>

              {task.description && (
                <p className="text-sm text-[var(--app-text-secondary)] leading-relaxed pt-1">
                  {task.description}
                </p>
              )}

              {/* Schedule and Meta */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--app-text-muted)] pt-2">
                {task.due_date && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-[var(--app-text)]">
                    <FiCalendar size={13} className="text-[#2563EB]" />
                    {task.due_date}
                    {task.due_time && (
                      <span className="inline-flex items-center gap-0.5 text-[var(--app-text-muted)]">
                        <FiClock size={11} /> {task.due_time}
                      </span>
                    )}
                  </span>
                )}
                {task.estimated_time_minutes && (
                  <span>⏱ {task.estimated_time_minutes} min duration</span>
                )}
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--app-border)]">
            <button
              type="button"
              onClick={handleToggle}
              className={`btn btn-sm ${
                task.status === 'completed' ? 'btn-secondary text-[#F59E0B]' : 'btn-primary'
              }`}
            >
              <FiCheck size={15} />
              {task.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Completed'}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="btn btn-secondary btn-sm"
            >
              <FiEdit2 size={14} />
              Edit Details
            </button>
          </div>

          <div className="pt-4 border-t border-[var(--app-border)] flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--app-text-secondary)]">
              Select this task in Decision Lab to view its priority analysis.
            </p>
            <Link to="/decision-lab" className="btn btn-secondary btn-sm">Open Decision Lab</Link>
          </div>

          <TaskBreakdownPanel task={task} />

          {/* Notes Section if Present */}
          {task.notes && (
            <div className="pt-4 border-t border-[var(--app-border)] space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                Notes
              </h3>
              <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] whitespace-pre-wrap bg-[var(--app-muted)]/40 p-3 rounded-lg border border-[var(--app-border)]">
                {task.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      <TaskForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleUpdate}
        task={task}
        loading={formLoading}
      />
    </Layout>
  );
}

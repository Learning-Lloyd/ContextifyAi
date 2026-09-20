import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCpu,
  FiEdit2,
  FiInfo,
  FiMapPin,
  FiZap,
} from 'react-icons/fi';
import Layout from '../components/Layout';
import PriorityBadge from '../components/PriorityBadge';
import ScoreRing from '../components/ScoreRing';
import FactorBar from '../components/FactorBar';
import TaskForm from '../components/TaskForm';
import { taskService } from '../services/taskService';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

const FACTOR_META = {
  importance: { label: 'Task Importance', weight: 0.4, color: '#2563EB' },
  urgency: { label: 'Deadline Urgency', weight: 0.3, color: '#F59E0B' },
  time_availability: { label: 'Time Availability', weight: 0.2, color: '#14B8A6' },
  current_workload: { label: 'Current Workload', weight: 0.1, color: '#64748B' },
};

export default function TaskDetail() {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const { id: taskId } = useParams();

  const fetchTask = async () => {
    try {
      const result = await taskService.getById(taskId);
      setTask(result.task);
    } catch (err) {
      console.error('Failed to load task:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

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

  const breakdown = task.breakdown || {};
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
              Advisory context
            </span>
          </div>
        )}

        {/* Main Task Card */}
        <div className="card p-7 space-y-6 shadow-sm">
          {/* Header Row with Badges, Actions, and Score Ring */}
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

            {/* Score Ring Hero */}
            <div className="flex flex-col items-center shrink-0">
              <ScoreRing score={task.priority_score} variant="lg" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] mt-1">
                Priority Score
              </span>
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

          {/* AI Explanation Callout */}
          {task.explanation && (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/[0.03] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#14B8A6] uppercase tracking-wider">
                <FiZap size={14} />
                <span>AI Contextual Explanation</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed">
                {task.explanation}
              </p>
              <p className="text-[10px] text-[var(--app-text-muted)] italic pt-1">
                This narrative is produced by the language model to interpret your deterministic score.
              </p>
            </div>
          )}

          {/* Priority Calculation Breakdown */}
          <div className="pt-4 border-t border-[var(--app-border)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                  Contextual Factor Breakdown
                </h2>
                <p className="text-xs text-[var(--app-text-muted)]">
                  Formula: (Importance × 0.40) + (Urgency × 0.30) + (Time × 0.20) + (Workload × 0.10)
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {Object.entries(FACTOR_META).map(([key, meta]) => {
                const item = breakdown[key] || { value: task[key] ?? 5, weighted: '—' };
                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-muted)]/30 space-y-1"
                  >
                    <FactorBar
                      label={meta.label}
                      factorKey={key}
                      value={item.value}
                      weight={meta.weight}
                      showFormula={true}
                    />
                  </div>
                );
              })}
            </div>

            {/* Final Total Banner */}
            <div className="p-4 rounded-xl bg-blue-500/[0.05] border border-[#2563EB]/25 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[var(--app-text)] uppercase tracking-wider">
                  Computed Deterministic Priority
                </p>
                <p className="text-[11px] text-[var(--app-text-muted)]">
                  Exact mathematical sum of weighted factors
                </p>
              </div>
              <span className="text-2xl font-extrabold text-[#2563EB] font-mono">
                {task.priority_score}
              </span>
            </div>
          </div>

          {/* Notes Section if Present */}
          {task.notes && (
            <div className="pt-4 border-t border-[var(--app-border)] space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                Internal Notes
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

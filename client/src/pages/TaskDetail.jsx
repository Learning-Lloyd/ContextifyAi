import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiEdit2, FiMapPin } from 'react-icons/fi';
import Layout from '../components/Layout';
import PriorityBadge from '../components/PriorityBadge';
import TaskForm from '../components/TaskForm';
import { taskService } from '../services/taskService';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

const breakdownLabels = {
  importance: 'Importance',
  urgency: 'Urgency',
  time_availability: 'Time Availability',
  current_workload: 'Current Workload',
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
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (!task) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-[var(--app-text-secondary)]">Task not found</p>
          <Link to="/dashboard" className="text-[#2563EB] mt-4 inline-block hover:underline">Back to Dashboard</Link>
        </div>
      </Layout>
    );
  }

  const breakdown = task.breakdown;
  const countdown = task.countdown || getCountdownLabel(task.due_date, task.due_time);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-[var(--app-text-secondary)] hover:text-[#2563EB] transition-colors text-sm">
          <FiArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {task.weather_condition && (
          <div className="card p-5">
            <p className="text-sm text-[var(--app-text-secondary)] mb-2">Current Weather</p>
            <div className="flex items-center gap-4">
              <span className="text-3xl">{weatherIcon(task.weather_condition)}</span>
              <div>
                <p className="font-semibold flex items-center gap-1 text-sm">
                  <FiMapPin size={14} className="text-[#2563EB]" /> {task.location}
                </p>
                <p className="text-xl font-bold mt-1">{task.temperature}°C · {task.weather_condition}</p>
                {task.rain_probability != null && (
                  <p className="text-sm text-[var(--app-text-secondary)]">Chance of Rain: {task.rain_probability}%</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="card p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="badge badge-primary text-sm">Score: {task.priority_score}</span>
                <PriorityBadge level={task.priority_level} />
                <span className={`badge ${task.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                  {task.status}
                </span>
                {countdown && (
                  <span className={`badge ${countdown === 'Overdue' ? 'badge-danger' : 'badge-primary'}`}>
                    {countdown}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{task.title}</h1>
              {task.description && (
                <p className="text-[var(--app-text-secondary)] mt-2">{task.description}</p>
              )}
              {task.due_date && (
                <p className="text-sm text-[var(--app-text-muted)] mt-2">
                  Due: {task.due_date}{task.due_time ? ` at ${task.due_time}` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggle}
                className="btn btn-ghost btn-icon"
                title="Toggle complete"
                aria-label="Toggle complete"
              >
                <FiCheck size={18} className="text-[#22C55E]" />
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="btn btn-ghost btn-icon"
                title="Edit task"
                aria-label="Edit task"
              >
                <FiEdit2 size={18} className="text-[#2563EB]" />
              </button>
            </div>
          </div>

          {task.explanation && (
            <div className="mb-6 card-kpi">
              <p className="text-sm font-medium text-[var(--app-text)] mb-1">Explanation</p>
              <p className="text-[var(--app-text-secondary)] text-sm leading-relaxed">{task.explanation}</p>
            </div>
          )}

          <div className="border-t border-[var(--app-border)] pt-6">
            <h2 className="section-title mb-4">Priority Calculation Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(breakdownLabels).map(([key, label]) => {
                const item = breakdown[key];
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between card-kpi p-4"
                  >
                    <div>
                      <p className="font-medium text-sm">{label}</p>
                      <p className="text-sm text-[var(--app-text-muted)]">
                        {item.value} × {item.weight} = {item.weighted}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[#2563EB]">{item.weighted}</span>
                  </div>
                );
              })}

              <div className="flex items-center justify-between card-kpi p-5 mt-2 border-[rgba(37,99,235,0.2)]">
                <p className="font-semibold">Final Score</p>
                <p className="text-2xl font-bold text-[#2563EB]">{breakdown.final_score}</p>
              </div>
            </div>
          </div>
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

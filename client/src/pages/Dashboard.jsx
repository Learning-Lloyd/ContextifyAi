import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiPlus, FiZap } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import TaskForm from '../components/TaskForm';
import WeatherWidget from '../components/WeatherWidget';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { dashboardService } from '../services/dashboardService';
import { taskService } from '../services/taskService';

const factors = [
  { key: 'importance', label: 'Importance', weight: '40%' },
  { key: 'urgency', label: 'Deadline urgency', weight: '30%' },
  { key: 'time_availability', label: 'Time available', weight: '20%' },
  { key: 'current_workload', label: 'Current workload', weight: '10%' },
];

function dateLabel(value) {
  if (!value) return 'No deadline set';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const { showToast } = useToast();

  const fetchDashboard = useCallback(async () => {
    try {
      setData(await dashboardService.getDashboard());
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      showToast('Could not load your workspace. Check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSave = async (formData) => {
    setFormLoading(true);
    try {
      await taskService.create(formData);
      showToast('Task created and prioritized', 'success');
      setFormOpen(false);
      await fetchDashboard();
    } catch {
      showToast('Could not save this task', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await taskService.toggleComplete(id);
      await fetchDashboard();
    } catch {
      showToast('Could not update task status', 'error');
    }
  };

  const queue = useMemo(() => {
    const groups = data?.grouped_tasks || {};
    return Object.values(groups).flat()
      .filter((task) => task.status !== 'completed')
      .sort((a, b) => Number(b.priority_score || 0) - Number(a.priority_score || 0));
  }, [data]);

  if (loading) return <Layout><div className="workspace-loading"><p className="eyebrow">Preparing your day</p><LoadingSkeleton variant="task-card" count={3} /></div></Layout>;
  if (!data) return <Layout><div className="workspace-error"><p className="eyebrow">Workspace unavailable</p><h1 className="page-title">We couldn’t load your day.</h1><button type="button" className="btn btn-primary" onClick={fetchDashboard}>Try again</button></div></Layout>;

  const { user, stats = {}, highest_priority_task: focusTask, widgets = {} } = data;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="daily-workspace animate-fade-in">
        <div className="daily-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> DAILY BRIEF · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>{greeting}, <em>{user?.name?.split(' ')[0] || 'there'}.</em></h1>
            <p className="daily-subtitle">A clear next step, grounded in your time, workload, and deadlines.</p>
          </div>
          <button type="button" className="text-action" onClick={() => setFormOpen(true)}><FiPlus /> Add a task</button>
        </div>

        {focusTask ? (
          <section className="focus-workspace" aria-labelledby="focus-heading">
            <div className="focus-main">
              <div className="focus-label"><FiZap size={14} /> CONTEXTIFY RECOMMENDS <span>01 / {String(queue.length).padStart(2, '0')}</span></div>
              <Link to={`/tasks/${focusTask.id}`} className="focus-title-link"><h2 id="focus-heading">{focusTask.title}</h2></Link>
              {focusTask.description && <p className="focus-description">{focusTask.description}</p>}
              <div className="focus-metadata">
                <span><FiCalendar /> {dateLabel(focusTask.due_date)}{focusTask.due_time ? ` · ${focusTask.due_time.slice(0, 5)}` : ''}</span>
                {focusTask.estimated_time_minutes && <span><FiClock /> {focusTask.estimated_time_minutes} min</span>}
                {focusTask.category && <span className="category-label">{focusTask.category}</span>}
              </div>
              <div className="focus-actions">
                <Link to={`/tasks/${focusTask.id}`} className="btn btn-primary">Open task <FiArrowRight /></Link>
                <button type="button" className="btn btn-quiet" onClick={() => handleToggle(focusTask.id)}><FiCheckCircle /> Mark complete</button>
              </div>
            </div>
            <aside className="focus-reasoning" aria-label="Priority explanation">
              <div className="focus-score-line"><span className="focus-score">{Number(focusTask.priority_score || 0).toFixed(2)}</span><span className="score-denom">/ 10<br />PRIORITY SCORE</span></div>
              <p className="reasoning-caption">Why this is next</p>
              <div className="factor-list">
                {factors.map(({ key, label, weight }) => {
                  const value = Math.max(0, Math.min(10, Number(focusTask[key] || 0)));
                  return <div className="factor-row" key={key}><div className="factor-label"><span>{label}</span><span>{weight}</span></div><div className="factor-track"><span style={{ width: `${value * 10}%` }} /></div><span className="factor-value">{value.toFixed(1)}<small> / 10</small></span></div>;
                })}
              </div>
              <Link to={`/tasks/${focusTask.id}`} className="reasoning-link">See full breakdown <FiArrowUpRight /></Link>
            </aside>
          </section>
        ) : (
          <section className="first-task-prompt">
            <div className="first-task-mark">01</div>
            <div><p className="eyebrow">START WITH ONE THING</p><h2>Your day is still unwritten.</h2><p>Add a task and Contextify will weigh its importance, deadline, available time, and current workload.</p><button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><FiPlus /> Create your first task</button></div>
          </section>
        )}

        <div className="workspace-lower-grid">
          <section className="priority-queue" aria-labelledby="queue-heading">
            <div className="queue-heading-row"><div><p className="eyebrow">YOUR NEXT DECISIONS</p><h2 id="queue-heading">Priority queue <span>{queue.length}</span></h2></div><Link to="/tasks" className="text-action">View all <FiArrowRight /></Link></div>
            {queue.length > 1 ? <ol className="queue-list">{queue.slice(1, 6).map((task, index) => <li key={task.id} className="queue-item"><span className="queue-index">{String(index + 2).padStart(2, '0')}</span><div className="queue-copy"><Link to={`/tasks/${task.id}`}>{task.title}</Link><span>{dateLabel(task.due_date)}{task.category ? ` · ${task.category}` : ''}</span></div><span className="queue-score">{Number(task.priority_score || 0).toFixed(2)}</span><button type="button" aria-label={`Mark ${task.title} complete`} className="queue-complete" onClick={() => handleToggle(task.id)}><FiCheckCircle /></button></li>)}</ol> : <div className="queue-empty">{queue.length ? 'You have one task to focus on. Finish it, then we’ll help choose the next.' : 'Create a task to build your priority queue.'}</div>}
          </section>

          <aside className="day-context">
            <div className="context-heading"><span className="eyebrow">CAPACITY CHECK</span><Link to="/calendar" aria-label="Open calendar"><FiArrowUpRight /></Link></div>
            <div className="capacity-number">{stats.current_workload ?? 0}<small> / 10</small></div>
            <p className="capacity-caption">Current workload index</p>
            <div className="capacity-rule"><span style={{ width: `${Math.max(0, Math.min(100, Number(stats.current_workload || 0) * 10))}%` }} /></div>
            <div className="context-pair"><span>Due today</span><strong>{stats.tasks_due_today ?? 0}</strong></div>
            <div className="context-pair"><span>Needs attention</span><strong>{stats.overdue_tasks ?? 0}</strong></div>
            {widgets.weather && <div className="weather-context"><WeatherWidget weather={widgets.weather} /></div>}
            <Link to="/decision-lab" className="context-link">Explore another ranking <FiArrowRight /></Link>
          </aside>
        </div>

        <div className="daily-footer-note"><span>DETERMINISTIC BY DESIGN</span><span>Importance 40 · Urgency 30 · Time 20 · Workload 10</span><Link to="/decision-lab">How Contextify decides <FiArrowUpRight /></Link></div>
      </div>

      <TaskForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSave} loading={formLoading} />
    </Layout>
  );
}

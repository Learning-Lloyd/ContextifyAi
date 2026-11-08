import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiArrowUpRight, FiCalendar, FiCheckCircle, FiClock, FiCpu, FiPlus, FiZap } from 'react-icons/fi';
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
  { key: 'urgency', label: 'Deadline', weight: '30%' },
  { key: 'time_availability', label: 'Available time', weight: '20%' },
  { key: 'current_workload', label: 'Workload', weight: '10%' },
];

const PRODUCTIVE_MINUTES_PER_DAY = 480;

function getTimeFit(task, tasks) {
  const estimate = Number(task?.estimated_time_minutes || 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDays = 7;
  const busyByDate = new Map();

  tasks.forEach((item) => {
    if (item.id === task.id || item.status !== 'pending' || !item.due_date) return;
    const date = new Date(`${item.due_date}T00:00:00`);
    const dayOffset = Math.floor((date - today) / 86400000);
    if (dayOffset < 0 || dayOffset >= horizonDays) return;
    const dateKey = item.due_date;
    busyByDate.set(dateKey, Math.min(PRODUCTIVE_MINUTES_PER_DAY,
      (busyByDate.get(dateKey) || 0) + Number(item.estimated_time_minutes || 60)));
  });

  let available = 0;
  for (let day = 0; day < horizonDays; day += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    available += PRODUCTIVE_MINUTES_PER_DAY - (busyByDate.get(key) || 0);
  }

  return { estimate: estimate || null, available };
}

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
    const allTasks = data?.tasks?.length ? data.tasks : Object.values(groups).flat();
    const pending = allTasks.filter((task) => task.status !== 'completed');
    if (Number(data?.unanalyzed_pending_count || 0) > 0) {
      return pending.sort((a, b) => (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31'));
    }
    // The API has already ranked tasks; keep its order without exposing scores to this view.
    return pending;
  }, [data]);

  if (loading) return <Layout><div className="workspace-loading"><p className="eyebrow">Preparing your day</p><LoadingSkeleton variant="task-card" count={3} /></div></Layout>;
  if (!data) return <Layout><div className="workspace-error"><p className="eyebrow">Workspace unavailable</p><h1 className="page-title">We couldn’t load your day.</h1><button type="button" className="btn btn-primary" onClick={fetchDashboard}>Try again</button></div></Layout>;

  const { user, stats = {}, highest_priority_task: highestPriorityTask, widgets = {} } = data;
  const unanalyzedCount = Number(data.unanalyzed_pending_count || 0);
  const needsAnalysis = unanalyzedCount > 0;
  const focusTask = needsAnalysis ? null : queue.find((task) => task.id === highestPriorityTask?.id) || queue[0] || null;
  const timeFit = focusTask ? getTimeFit(focusTask, queue) : null;
  const topReasonLabels = focusTask
    ? [...factors]
      .sort((a, b) => (Number(focusTask[b.key] || 0) * parseFloat(b.weight)) - (Number(focusTask[a.key] || 0) * parseFloat(a.weight)))
      .slice(0, 2)
      .map((factor) => factor.label.toLowerCase())
    : [];
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="daily-workspace animate-fade-in">
        <div className="daily-heading">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> DAILY BRIEF · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>{greeting}, <em>{user?.name?.split(' ')[0] || 'there'}.</em></h1>
          </div>
          <button type="button" className="text-action" onClick={() => setFormOpen(true)}><FiPlus /> Add a task</button>
        </div>

        <section className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4" aria-label="Task progress">
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-3 text-sm"><strong className="text-[var(--app-text)]">Daily Progress</strong><span className="text-[var(--app-text-muted)]">{stats.completed_tasks ?? 0} done · {stats.pending_tasks ?? 0} remaining</span></div>
            <div className="h-2 rounded-full bg-[var(--app-muted)] mt-2 overflow-hidden"><span className="block h-full rounded-full bg-[#285E4D] transition-all" style={{ width: `${Math.max(0, Math.min(100, stats.completion_percent || 0))}%` }} /></div>
          </div>
          <span className="text-sm font-bold text-[#285E4D]">{stats.completion_percent || 0}%</span>
          {stats.unread_notifications > 0 && <Link to="/notifications" className="text-xs font-semibold text-[#285E4D]">{stats.unread_notifications} reminder{stats.unread_notifications === 1 ? '' : 's'} <FiArrowRight className="inline" /></Link>}
        </section>

        {needsAnalysis ? (
          <section className="first-task-prompt analysis-needed-prompt">
            <div className="first-task-mark"><FiCpu /></div>
            <div>
              <p className="eyebrow">ANALYSIS RECOMMENDED FIRST</p>
              <h2>Analyze tasks to see what comes first.</h2>
              <p>{unanalyzedCount} task{unanalyzedCount === 1 ? '' : 's'} need analysis.</p>
              <Link to="/decision-lab" className="btn btn-primary"><FiCpu /> Analyze tasks <FiArrowRight /></Link>
            </div>
          </section>
        ) : focusTask ? (
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
            <aside className="focus-reasoning" aria-label="Recommendation details">
              <p className="text-sm text-[var(--app-text-secondary)] mb-3">Most influenced by {topReasonLabels.join(' and ')}.</p>
              <details>
              <summary className="reasoning-caption cursor-pointer">Why recommended?</summary>
              <div className="factor-list mt-3">
                {factors.map(({ key, label, weight }) => {
                  const value = Math.max(0, Math.min(10, Number(focusTask[key] || 0)));
                  return <div className="factor-row" key={key}><div className="factor-label"><span>{label}</span><span>{weight}</span></div><div className="factor-track"><span style={{ width: `${value * 10}%` }} /></div><span className="factor-value">{value.toFixed(1)}<small> / 10</small></span></div>;
                })}
              </div>
              <Link to="/decision-lab" className="reasoning-link mt-3">View analysis <FiArrowUpRight /></Link>
              </details>
            </aside>
          </section>
        ) : (
          <section className="first-task-prompt">
            <div className="first-task-mark">01</div>
            <div><p className="eyebrow">START WITH ONE THING</p><h2>Your day is still unwritten.</h2><p>Add a task and Contextify will weigh its importance, deadline, available time, and current workload.</p><button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><FiPlus /> Create your first task</button></div>
          </section>
        )}

        {focusTask && timeFit && (
          <section className="time-fit-strip" aria-label="Estimated time fit">
            <div className="time-fit-mark"><FiClock /></div>
            <div className="time-fit-copy">
              <p className="eyebrow">TIME FIT</p>
              <strong>{timeFit.estimate ? `${timeFit.estimate} min estimated` : 'Add an estimate to check time fit'}</strong>
              <span>About {Math.floor(timeFit.available / 60)} hours available this week.</span>
            </div>
            {timeFit.estimate && <span className={`time-fit-status ${timeFit.estimate <= timeFit.available ? 'is-fit' : 'is-tight'}`}>
              {timeFit.estimate <= timeFit.available ? 'Fits the estimate' : 'May need more time'}
            </span>}
          </section>
        )}

        <div className="workspace-lower-grid">
          <section className="priority-queue" aria-labelledby="queue-heading">
            <div className="queue-heading-row"><div><p className="eyebrow">UP NEXT</p><h2 id="queue-heading">Priority Queue <span>{queue.length}</span></h2></div><Link to="/tasks" className="text-action">View all <FiArrowRight /></Link></div>
            {queue.length > (focusTask ? 1 : 0) ? <ol className="queue-list">{queue.slice(focusTask ? 1 : 0, focusTask ? 6 : 5).map((task, index) => <li key={task.id} className="queue-item"><span className="queue-index">{String(index + (focusTask ? 2 : 1)).padStart(2, '0')}</span><div className="queue-copy"><Link to={`/tasks/${task.id}`}>{task.title}</Link><span>{dateLabel(task.due_date)}{task.category ? ` · ${task.category}` : ''}</span></div><button type="button" aria-label={`Mark ${task.title} complete`} className="queue-complete" onClick={() => handleToggle(task.id)}><FiCheckCircle /></button></li>)}</ol> : <div className="queue-empty">{queue.length ? 'One task at a time. You’ve got this.' : 'Add a task to start your queue.'}</div>}
          </section>

          <aside className="day-context">
            <div className="context-heading"><span className="eyebrow">CAPACITY CHECK</span><Link to="/calendar" aria-label="Open calendar"><FiArrowUpRight /></Link></div>
            <div className="capacity-number">{stats.current_workload ?? 0}<small> / 10</small></div>
            <p className="capacity-caption">Workload</p>
            <div className="capacity-rule"><span style={{ width: `${Math.max(0, Math.min(100, Number(stats.current_workload || 0) * 10))}%` }} /></div>
            <div className="context-pair"><span>Due today</span><strong>{stats.tasks_due_today ?? 0}</strong></div>
            <div className="context-pair"><span>Needs attention</span><strong>{stats.overdue_tasks ?? 0}</strong></div>
            {widgets.weather && <div className="weather-context"><WeatherWidget weather={widgets.weather} /></div>}
            <Link to="/decision-lab" className="context-link">Open Decision Lab <FiArrowRight /></Link>
          </aside>
        </div>

        <section className="card p-5 space-y-3" aria-labelledby="recent-activity-heading">
          <div className="flex items-center justify-between"><div><p className="eyebrow">YOUR WORKSPACE</p><h2 id="recent-activity-heading" className="text-lg font-bold text-[var(--app-text)] mt-1">Recent activity</h2></div><Link to="/tasks" className="text-action">Task queue <FiArrowRight /></Link></div>
          {widgets.recent_activity?.length ? <ul className="divide-y divide-[var(--app-border)]">{widgets.recent_activity.map((activity) => <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium text-[var(--app-text-secondary)]">{activity.label}</span><time className="text-xs text-[var(--app-text-muted)] shrink-0">{new Date(activity.created_at).toLocaleString()}</time></li>)}</ul> : <p className="text-sm text-[var(--app-text-muted)] py-3">Your task updates will appear here.</p>}
        </section>

        <div className="daily-footer-note"><Link to="/help">How priorities work <FiArrowUpRight /></Link></div>
      </div>

      <TaskForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSave} loading={formLoading} />
    </Layout>
  );
}

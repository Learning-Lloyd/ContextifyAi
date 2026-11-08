import { useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import LoadingSkeleton from './LoadingSkeleton';
import { scheduleService } from '../services/scheduleService';

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function ScheduleSuggestions() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scheduleService.getSuggestions(todayDate())
      .then(setSchedule)
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card p-5"><LoadingSkeleton variant="task-card" count={2} /></div>;
  if (schedule?.setup_required) {
    return <div className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 className="font-bold text-[var(--app-text)]">Set your daily availability</h2><p className="text-sm text-[var(--app-text-secondary)] mt-1">Add your available time and start time to get a plan.</p></div><Link to="/profile" className="btn btn-secondary btn-sm">Set availability</Link></div>;
  }
  if (!schedule) return null;

  const plannedCount = (schedule.days || []).reduce((count, day) => count + day.items.length, 0);
  return (
    <section className="card p-5 space-y-4" aria-labelledby="schedule-suggestions-heading">
      <div><h2 id="schedule-suggestions-heading" className="text-lg font-bold text-[var(--app-text)]">Next 7 days</h2><p className="text-sm text-[var(--app-text-secondary)] mt-1">{plannedCount} tasks planned · {schedule.daily_available_minutes} min/day from {schedule.workday_start_time}</p></div>
      <div className="grid sm:grid-cols-2 gap-3">
        {schedule.days.filter((day) => day.items.length > 0).map((day) => (
          <div key={day.date} className="rounded-lg border border-[var(--app-border)] p-3">
            <div className="flex items-center justify-between text-sm font-bold text-[var(--app-text)]"><span>{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><span className="text-[var(--app-text-muted)]">{day.scheduled_minutes}/{day.available_minutes} min</span></div>
            <ul className="mt-2 space-y-2">{day.items.map((item) => <li key={item.task_id} className="flex items-start gap-2 text-sm"><FiClock className="mt-0.5 text-[#285E4D] shrink-0" /><span><Link to={`/tasks/${item.task_id}`} className="font-semibold text-[var(--app-text)] hover:underline">{item.title}</Link><small className="block text-xs text-[var(--app-text-muted)] mt-0.5">{item.start_time}–{item.end_time} · {item.duration_minutes} min</small></span></li>)}</ul>
          </div>
        ))}
      </div>
      {plannedCount === 0 && <p className="text-sm text-[var(--app-text-muted)]">No tasks fit this plan yet.</p>}
      {schedule.unplanned_tasks?.length > 0 && <details className="border-t border-[var(--app-border)] pt-3"><summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">{schedule.unplanned_tasks.length} tasks need attention</summary><ul className="mt-2 space-y-2">{schedule.unplanned_tasks.map((task) => <li key={task.id} className="text-sm text-[var(--app-text-secondary)]"><strong>{task.title}:</strong> {task.reason}</li>)}</ul></details>}
      <details><summary className="cursor-pointer text-sm text-[var(--app-text-muted)]">About these suggestions</summary><p className="mt-1 text-sm text-[var(--app-text-muted)]">They don’t change your tasks or priority settings.</p></details>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
} from 'react-icons/fi';
import Layout from '../components/Layout';
import PriorityBadge from '../components/PriorityBadge';
import { calendarService } from '../services/calendarService';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ tasks: [], calendar: [] });
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    calendarService
      .getCalendar()
      .then(setCalendarData)
      .catch(() => setCalendarData({ tasks: [], calendar: [] }))
      .finally(() => setLoading(false));
  }, []);

  const tasksByDate = (calendarData.tasks || []).reduce((acc, task) => {
    if (!task.due_date) return acc;
    acc[task.due_date] = acc[task.due_date] || [];
    acc[task.due_date].push(task);
    return acc;
  }, {});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthLabel = currentDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <div className="card p-6 h-96 bg-[var(--app-muted)] rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        {/* Calendar Header with Month Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <h1 className="page-title">Calendar & Workload Schedule</h1>
            <p className="page-subtitle text-xs sm:text-sm">
              Visualize deadline density and time availability across upcoming days
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="btn btn-secondary btn-sm text-xs font-semibold"
            >
              Today
            </button>
            <div className="flex items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] p-0.5">
              <button
                type="button"
                onClick={prevMonth}
                className="btn btn-ghost btn-icon w-8 h-8 rounded-md"
                aria-label="Previous Month"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="font-bold text-xs sm:text-sm min-w-[140px] text-center text-[var(--app-text)] px-2">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="btn btn-ghost btn-icon w-8 h-8 rounded-md"
                aria-label="Next Month"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Informational Context Banner */}
        <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-[#2563EB]/20 flex items-center justify-between text-xs text-[var(--app-text-secondary)]">
          <div className="flex items-center gap-2">
            <FiInfo size={14} className="text-[#2563EB] shrink-0" />
            <span>
              Days with high task density automatically reduce your <strong>Time Availability</strong> score and increase <strong>Current Workload</strong>.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-[var(--app-text-muted)]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> High priority
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8]" /> Low
            </span>
          </div>
        </div>

        {/* Monthly Grid Card */}
        <div className="card p-4 sm:p-6 shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[100px] rounded-xl border border-transparent bg-transparent"
                  />
                );
              }

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = tasksByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const hasHighWorkload = dayTasks.length >= 3;

              return (
                <div
                  key={dateStr}
                  className={`min-h-[100px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    isToday
                      ? 'border-[#2563EB] bg-blue-500/[0.04] ring-1 ring-[#2563EB]/40 shadow-sm'
                      : hasHighWorkload
                      ? 'border-amber-500/30 bg-amber-500/[0.02]'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-text-muted)]/40'
                  }`}
                >
                  {/* Day Header Row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold leading-none ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center'
                          : 'text-[var(--app-text-secondary)]'
                      }`}
                    >
                      {day}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-semibold text-[var(--app-text-muted)] font-mono">
                        {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {/* Task Chips Strip */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => (
                      <Link
                        key={task.id}
                        to={`/tasks/${task.id}`}
                        className="block text-[11px] truncate px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-card)] hover:border-[#2563EB] transition-colors"
                        title={`${task.title} (Score: ${task.priority_score})`}
                      >
                        <span
                          className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                            task.priority_level === 'high'
                              ? 'bg-[#2563EB]'
                              : task.priority_level === 'medium'
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#94A3B8]'
                          }`}
                        />
                        <span className="font-medium text-[var(--app-text)]">{task.title}</span>
                      </Link>
                    ))}
                    {dayTasks.length > 2 && (
                      <p className="text-[10px] font-semibold text-[#2563EB] pl-1">
                        +{dayTasks.length - 2} more...
                      </p>
                    )}
                  </div>

                  {/* Empty Footer Space */}
                  <div />
                </div>
              );
            })}
          </div>
        </div>

        {/* All Scheduled Tasks Master List */}
        {calendarData.tasks?.length > 0 && (
          <div className="card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)]">
              <div>
                <h2 className="text-base font-bold text-[var(--app-text)]">
                  All Scheduled Deadlines ({calendarData.tasks.length})
                </h2>
                <p className="text-xs text-[var(--app-text-muted)]">
                  Chronologically ordered commitments factored into workload calculations
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {calendarData.tasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-hover)] transition-colors text-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PriorityBadge level={task.priority_level} score={task.priority_score} />
                    <span className="font-semibold text-sm text-[var(--app-text)] group-hover:text-[#2563EB] truncate">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--app-text-muted)] shrink-0">
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--app-text-secondary)]">
                      <FiCalendar size={12} className="text-[#2563EB]" />
                      {task.due_date}
                      {task.due_time && ` at ${task.due_time}`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    calendarService.getCalendar()
      .then(setCalendarData)
      .catch(() => setCalendarData({ tasks: [], calendar: [] }))
      .finally(() => setLoading(false));
  }, []);

  const tasksByDate = calendarData.tasks.reduce((acc, task) => {
    acc[task.due_date] = acc[task.due_date] || [];
    acc[task.due_date].push(task);
    return acc;
  }, {});

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthLabel = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="page-title">Calendar</h1>
            <p className="page-subtitle">Tasks by due date</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={prevMonth} className="btn btn-secondary btn-sm">←</button>
            <span className="font-semibold min-w-[180px] text-center text-sm">{monthLabel}</span>
            <button type="button" onClick={nextMonth} className="btn btn-secondary btn-sm">→</button>
          </div>
        </div>

        <div className="card p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs text-[var(--app-text-muted)] py-2 font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[90px]" />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTasks = tasksByDate[dateStr] || [];
              const isToday = dateStr === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={dateStr}
                  className={`min-h-[90px] p-2 rounded-lg border ${
                    isToday
                      ? 'border-[rgba(37,99,235,0.4)] bg-[rgba(37,99,235,0.05)]'
                      : 'border-[var(--app-border)] bg-[var(--app-muted)]'
                  }`}
                >
                  <p className={`text-sm font-medium mb-1 ${isToday ? 'text-[#2563EB]' : 'text-[var(--app-text-secondary)]'}`}>{day}</p>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <Link
                        key={task.id}
                        to={`/tasks/${task.id}`}
                        className="block text-xs truncate px-1.5 py-0.5 rounded border border-[var(--app-border)] bg-[var(--app-card)] hover:border-[rgba(37,99,235,0.3)] transition-colors"
                        title={task.title}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                          task.priority_level === 'high' ? 'bg-[#EF4444]' :
                          task.priority_level === 'medium' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]'
                        }`} />
                        {task.title}
                      </Link>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-xs text-[var(--app-text-muted)]">+{dayTasks.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {calendarData.tasks.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title mb-4">All Scheduled Tasks</h2>
            <div className="space-y-2">
              {calendarData.tasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--app-border)] hover:bg-[var(--app-hover)] transition-colors text-sm"
                >
                  <div className="flex items-center gap-3">
                    <PriorityBadge level={task.priority_level} score={task.priority_score} />
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <span className="text-[var(--app-text-secondary)]">{task.due_date}{task.due_time ? ` ${task.due_time}` : ''}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiFileText, FiPieChart } from 'react-icons/fi';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Layout from '../components/Layout';
import { goalsService } from '../services/goalsService';

const toDateInput = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const STATUS_COLORS = { completed: '#15966b', pending: '#e6a11a' };

function currentWeek() {
  const end = new Date();
  const start = new Date(end);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  return { start: toDateInput(start), end: toDateInput(end) };
}

export default function Reports() {
  const initialRange = currentWeek();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [status, setStatus] = useState('all');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Choose a valid date range. The end date must be on or after the start date.');
      setReport(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      setReport(await goalsService.reportSummary({ start_date: startDate, end_date: endDate, status }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your report. Please try again.');
      setReport(null);
    } finally {
      setBusy(false);
    }
  }, [startDate, endDate, status]);

  useEffect(() => { load(); }, [load]);

  const setPreset = (preset) => {
    const now = new Date();
    const start = new Date(now);
    if (preset === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    else start.setDate(1);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(now));
  };

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const { data } = await goalsService.report({ start_date: startDate, end_date: endDate, status });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contextify-report-${startDate}-to-${endDate}-${status}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not generate your report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const stats = report?.summary;
  const cards = [
    ['Tasks in range', stats?.total ?? 0, 'blue'],
    ['Completed', stats?.completed ?? 0, 'green'],
    ['Pending', stats?.pending ?? 0, 'amber'],
    ['Overdue', stats?.overdue ?? 0, 'red'],
  ];
  const statColors = {
    blue: 'text-blue-600 dark:text-blue-300',
    green: 'text-green-600 dark:text-green-300',
    amber: 'text-amber-600 dark:text-amber-300',
    red: 'text-red-600 dark:text-red-300',
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs uppercase tracking-widest text-blue-700 dark:text-blue-300 font-semibold">Your activity</p><h1 className="page-title">Reports</h1><p className="page-subtitle">Explore your task activity and prioritization results.</p></div>
          <button className="btn btn-primary" disabled={downloading || !report} onClick={download}><FiDownload />{downloading ? 'Preparing…' : 'Download PDF'}</button>
        </header>

        <section className="card p-4 md:p-5" aria-label="Report filters">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">Start date<input className="input" type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">End date<input className="input" type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Task status<select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option></select></label>
            <div className="flex gap-2"><button className="btn btn-secondary" onClick={() => setPreset('week')}>This week</button><button className="btn btn-secondary" onClick={() => setPreset('month')}>This month</button></div>
          </div>
        </section>

        {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300" role="alert">{error}</p>}
        {busy && <p className="text-sm text-[var(--app-text-muted)]" role="status">Loading report…</p>}
        {!busy && report && <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Task summary">
            {cards.map(([label, value, color]) => <article key={label} className="card p-4"><p className="text-sm text-[var(--app-text-secondary)]">{label}</p><p className={`mt-2 text-3xl font-bold ${statColors[color]}`}>{value}</p></article>)}
            <article className="card p-4 col-span-2 lg:col-span-4"><div className="flex justify-between text-sm"><span className="font-semibold">Completion rate</span><span>{stats.completion_rate}%</span></div><div className="mt-2 h-2 rounded-full bg-blue-100 dark:bg-slate-700"><div className="h-full rounded-full bg-blue-600" style={{ width: `${stats.completion_rate}%` }} /></div></article>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="card p-5"><div className="flex items-center gap-2"><FiPieChart className="text-blue-600" /><h2 className="font-semibold">Task status distribution</h2></div>{report.status_distribution?.some((item) => item.count > 0) ? <div className="mt-3 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_160px]"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={report.status_distribution.filter((item) => item.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={82} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>{report.status_distribution.filter((item) => item.count > 0).map((item) => <Cell key={item.status} fill={STATUS_COLORS[item.status] || '#64748b'} />)}</Pie><Tooltip formatter={(value, name) => [`${value} tasks`, name]} /></PieChart></ResponsiveContainer></div><ul className="space-y-3">{report.status_distribution.map((item) => <li key={item.status} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || '#64748b' }} />{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span><span className="font-semibold">{item.count} · {item.percentage}%</span></li>)}</ul></div> : <p className="py-12 text-center text-sm text-[var(--app-text-muted)]">No tasks match these filters.</p>}</article>
            <article className="card p-5"><h2 className="font-semibold">Tasks created over time</h2>{report.activity.length ? <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.activity}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="created" name="Tasks created" fill="#3b82f6" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-[var(--app-text-muted)]">No task activity in this range.</p>}</article>
            <article className="card p-5"><h2 className="font-semibold">Tasks by category</h2>{report.by_category.length ? <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.by_category} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Tasks" fill="#8b5cf6" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-[var(--app-text-muted)]">No categories in this range.</p>}</article>
          </section>
        </>}
        {!busy && !error && report && report.summary.total === 0 && <div className="card p-6 text-center text-sm text-[var(--app-text-secondary)]"><FiFileText className="mx-auto mb-2 text-2xl" />No tasks match these filters yet.</div>}
      </div>
    </Layout>
  );
}

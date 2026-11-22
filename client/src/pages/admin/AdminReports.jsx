import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiFileText, FiList, FiPieChart, FiShield, FiSun, FiUsers } from 'react-icons/fi';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import { adminService } from '../../services/adminService';

const reports = [
  { type: 'users', label: 'User Account Registry', desc: 'Registered users, roles, and active status', icon: FiUsers, color: 'icon-box-blue' },
  { type: 'tasks', label: 'Task Backlog & Completion Log', desc: 'Platform tasks, deadlines, and scores', icon: FiList, color: 'icon-box-teal' },
  { type: 'decisions', label: 'Decision History & Audits', desc: 'Evaluated rankings and pairwise decision records', icon: FiShield, color: 'icon-box-amber' },
  { type: 'priority', label: 'Priority Score Distribution', desc: 'Aggregation across priority score bands', icon: FiPieChart, color: 'icon-box-green' },
  { type: 'weather', label: 'Weather Impact Statistics', desc: 'Weather conditions attached to stored tasks', icon: FiSun, color: 'icon-box-blue' },
];
const formats = [{ id: 'csv', label: 'CSV' }, { id: 'xlsx', label: 'Excel (XLS)' }, { id: 'pdf', label: 'PDF Report' }];
const STATUS_COLORS = { completed: '#15966b', pending: '#e6a11a' };
const toDateInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const getRange = (preset) => {
  const now = new Date();
  const start = new Date(now);
  if (preset === 'weekly') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  else start.setDate(1);
  return { start_date: toDateInput(start), end_date: toDateInput(now), period: preset };
};

export default function AdminReports() {
  const [range, setRange] = useState(() => getRange('weekly'));
  const [status, setStatus] = useState('all');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!range.start_date || !range.end_date || range.start_date > range.end_date) {
      setError('Choose a valid reporting date range.');
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setData(await adminService.getReportSummary({ ...range, status }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load administrator analytics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, status]);

  useEffect(() => { load(); }, [load]);

  const downloadAnalytics = async () => {
    setDownloading(true);
    setError('');
    try {
      const response = await adminService.exportReport('analytics', 'pdf', { ...range, status });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Could not create the administrator PDF report.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `contextify-admin-report-${range.start_date}-to-${range.end_date}-${status}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.message || 'Could not create the administrator PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleExport = async (type, format) => {
    try {
      const response = await adminService.exportReport(type, format);
      if (!response.ok) throw new Error('Report export failed.');
      const ext = format === 'xlsx' ? 'xls' : format;
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_report.${ext}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError.message || 'Report export failed.');
    }
  };

  const summary = data?.summary;
  const cards = [
    ['Registered users', summary?.users_total ?? 0, 'text-blue-600 dark:text-blue-300'],
    ['Active users', summary?.users_active ?? 0, 'text-emerald-600 dark:text-emerald-300'],
    ['Tasks in range', summary?.total ?? 0, 'text-violet-600 dark:text-violet-300'],
    ['Completed', summary?.completed ?? 0, 'text-emerald-600 dark:text-emerald-300'],
    ['Pending', summary?.pending ?? 0, 'text-amber-600 dark:text-amber-300'],
    ['Completion rate', `${summary?.completion_rate ?? 0}%`, 'text-blue-600 dark:text-blue-300'],
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl space-y-6 animate-fade-in">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--app-border)] pb-3">
          <div><h1 className="page-title">Reports</h1><p className="page-subtitle text-xs sm:text-sm">Review platform analytics and export administrator reports.</p></div>
          <button type="button" className="btn btn-primary" disabled={!data || downloading} onClick={downloadAnalytics}><FiDownload />{downloading ? 'Preparing…' : 'Download analytics PDF'}</button>
        </header>

        <section className="card space-y-4 p-4 md:p-5" aria-label="Administrator report filters">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">Start date<input className="input" type="date" value={range.start_date} max={range.end_date || undefined} onChange={(event) => setRange((current) => ({ ...current, start_date: event.target.value, period: 'custom' }))} /></label>
            <label className="grid gap-1 text-sm">End date<input className="input" type="date" value={range.end_date} min={range.start_date || undefined} onChange={(event) => setRange((current) => ({ ...current, end_date: event.target.value, period: 'custom' }))} /></label>
            <label className="grid gap-1 text-sm">Task status<select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="completed">Completed</option></select></label>
            <div className="flex gap-2"><button type="button" className="btn btn-secondary" onClick={() => setRange(getRange('weekly'))}>This week</button><button type="button" className="btn btn-secondary" onClick={() => setRange(getRange('monthly'))}>This month</button></div>
          </div>
          {data?.filters && <p className="text-xs text-[var(--app-text-muted)]">Showing {data.filters.period} report · {data.filters.start_date} to {data.filters.end_date} · {data.filters.status} tasks. User totals are platform-wide; task metrics follow the selected filters.</p>}
        </section>

        {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300" role="alert">{error}</p>}
        {loading && <p className="text-sm text-[var(--app-text-muted)]" role="status">Loading administrator report…</p>}
        {!loading && data && <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Platform summary">
            {cards.map(([label, value, color]) => <article key={label} className="card p-4"><p className="text-xs text-[var(--app-text-secondary)]">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p></article>)}
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <article className="card p-5"><h2 className="flex items-center gap-2 font-semibold"><FiPieChart className="text-blue-600" />Task status distribution</h2>{data.status_distribution.some((item) => item.count > 0) ? <div className="mt-3 grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_170px]"><div className="h-60"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.status_distribution.filter((item) => item.count > 0)} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={88} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>{data.status_distribution.filter((item) => item.count > 0).map((item) => <Cell key={item.status} fill={STATUS_COLORS[item.status] || '#64748b'} />)}</Pie><Tooltip formatter={(value, name) => [`${value} tasks`, name]} /></PieChart></ResponsiveContainer></div><ul className="space-y-3">{data.status_distribution.map((item) => <li key={item.status} className="flex items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || '#64748b' }} />{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span><span className="font-semibold">{item.count} · {item.percentage}%</span></li>)}</ul></div> : <p className="py-14 text-center text-sm text-[var(--app-text-muted)]">No tasks match this reporting period and status.</p>}</article>
            <article className="card p-5"><h2 className="font-semibold">Tasks by category</h2>{data.by_category.length ? <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.by_category} layout="vertical" margin={{ left: 4, right: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="category" width={112} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Tasks" radius={[0, 5, 5, 0]} fill="#8b5cf6" /></BarChart></ResponsiveContainer></div> : <p className="py-14 text-center text-sm text-[var(--app-text-muted)]">No task categories in this period.</p>}</article>
          </section>
          {summary.total === 0 && <div className="card p-5 text-center text-sm text-[var(--app-text-secondary)]"><FiFileText className="mx-auto mb-2 text-2xl" />No tasks match the selected report filters.</div>}
        </>}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Detailed administrator exports">
          {reports.map(({ type, label, desc, icon: Icon, color }) => <article key={type} className="card card-hover flex flex-col justify-between space-y-4 p-6 shadow-sm"><div><div className="mb-3 flex items-center justify-between gap-3"><div className={`icon-box ${color} h-10 w-10 shrink-0 rounded-xl`}><Icon size={18} /></div><span className="rounded bg-[var(--app-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">Audit data</span></div><h3 className="text-sm font-bold text-[var(--app-text)]">{label}</h3><p className="mt-1 text-xs leading-relaxed text-[var(--app-text-secondary)]">{desc}</p></div><div className="border-t border-[var(--app-border)] pt-3"><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--app-text-muted)]">Download format</span><div className="flex flex-wrap gap-2">{formats.map(({ id, label: fmtLabel }) => <button key={id} type="button" onClick={() => handleExport(type, id)} className="btn btn-secondary btn-sm inline-flex items-center gap-1 px-2.5 py-1 text-xs"><FiDownload size={11} />{fmtLabel}</button>)}</div></div></article>)}
        </section>
      </div>
    </AdminLayout>
  );
}

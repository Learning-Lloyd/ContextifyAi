import { useEffect, useState } from 'react';
import {
  Cell,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { analyticsService } from '../services/analyticsService';

const CHART_PALETTE = ['#22A06B', '#F5A623', '#E45B5B', '#3B82F6', '#8B5CF6', '#14B8A6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 shadow-xl text-xs border border-[var(--app-border)] space-y-1">
        <p className="font-bold text-[var(--app-text)]">{label || payload[0].name}</p>
        <p className="text-[#111111] font-mono font-semibold">
          Tasks: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsService
      .getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <LoadingSkeleton variant="stat-card" count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="chart" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <EmptyState title="Analytics Unavailable" description="Unable to retrieve task metrics at this time." />
      </Layout>
    );
  }

  const { stats, charts } = data;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Productivity</h1>
          <p className="page-subtitle text-sm">A live view of your task activity and progress.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Tasks" value={stats.total_tasks} type="total" accent />
          <StatCard title="Completed" value={stats.completed_tasks} type="completed" />
          <StatCard title="Pending" value={stats.pending_tasks} type="pending" />
          <StatCard title="Overdue" value={stats.overdue_tasks} type="highest" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Donut */}
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-base font-bold text-[var(--app-text)]">Task status</h3>
            </div>
            {charts.status?.some((s) => s.value > 0) ? (
              <div className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={charts.status}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {charts.status.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-16">
                No task data yet.
              </p>
            )}
          </div>
          <div className="card p-6 shadow-sm space-y-3"><h3 className="text-base font-bold text-[var(--app-text)]">Tasks by category</h3>{charts.category?.some((x) => x.value) ? <ResponsiveContainer width="100%" height={260}><BarChart data={charts.category} margin={{ left: -20, bottom: 16 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)"/><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="value" name="Tasks" radius={[6,6,0,0]}>{charts.category.map((item, i) => <Cell key={item.name} fill={CHART_PALETTE[i % CHART_PALETTE.length]}/>)}</Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-center text-[var(--app-text-muted)] py-20">Create tasks to see category trends.</p>}</div>
          <div className="card p-6 shadow-sm space-y-3"><h3 className="text-base font-bold text-[var(--app-text)]">Tasks by priority</h3>{charts.priority?.some((x) => x.value) ? <ResponsiveContainer width="100%" height={260}><BarChart data={charts.priority} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)"/><XAxis dataKey="name" tick={{ fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="value" name="Tasks" radius={[6,6,0,0]}>{charts.priority.map((item) => <Cell key={item.name} fill={item.name === 'High' ? '#E45B5B' : item.name === 'Medium' ? '#F5A623' : '#22A06B'}/>)}</Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-center text-[var(--app-text-muted)] py-20">No priority data yet.</p>}</div>
          <div className="card p-6 shadow-sm space-y-3"><h3 className="text-base font-bold text-[var(--app-text)]">Completion trend · 7 days</h3><ResponsiveContainer width="100%" height={260}><LineChart data={charts.completion_trend || []}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)"/><XAxis dataKey="date" tick={{ fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip/><Line type="monotone" dataKey="completed" stroke="#22A06B" strokeWidth={3} dot={{ r: 4 }}/></LineChart></ResponsiveContainer></div>
          <div className="card p-6 shadow-sm space-y-3"><h3 className="text-base font-bold text-[var(--app-text)]">Tasks by due date</h3>{charts.due_dates?.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={charts.due_dates}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--app-border)"/><XAxis dataKey="date" tick={{ fontSize: 11 }}/><YAxis allowDecimals={false} tick={{ fontSize: 11 }}/><Tooltip content={<CustomTooltip/>}/><Bar dataKey="value" name="Tasks" fill="#3B82F6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer> : <p className="text-sm text-center text-[var(--app-text-muted)] py-20">Add task deadlines to see the schedule overview.</p>}</div>
          <div className="card p-6 shadow-sm flex flex-col justify-center"><p className="text-sm text-[var(--app-text-muted)]">Task completion rate</p><p className="text-4xl font-bold mt-2">{data.completion_rate ?? 0}%</p><p className="text-sm text-[var(--app-text-secondary)] mt-2">{stats.completed_tasks} completed out of {stats.total_tasks} tasks</p></div>
        </div>
      </div>
    </Layout>
  );
}

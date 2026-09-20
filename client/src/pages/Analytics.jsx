import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { analyticsService } from '../services/analyticsService';

const CHART_PALETTE = ['#2563EB', '#14B8A6', '#F59E0B', '#22C55E', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-3 shadow-xl text-xs border border-[var(--app-border)] space-y-1">
        <p className="font-bold text-[var(--app-text)]">{label || payload[0].name}</p>
        <p className="text-[#2563EB] font-mono font-semibold">
          Count / Score: {payload[0].value}
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
          <h1 className="page-title">Personal Productivity Analytics</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Empirical breakdown of task status, completion rates, and priority score distribution
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Tasks" value={stats.total_tasks} type="total" accent />
          <StatCard title="Completed" value={stats.completed_tasks} type="completed" />
          <StatCard title="Pending Execution" value={stats.pending_tasks} type="pending" />
          <StatCard
            title="Avg. Priority Score"
            value={stats.average_priority_score}
            type="average"
            subtitle="Calculated across all tasks"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Donut */}
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Task Status Breakdown
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Ratio of pending vs completed tasks in your workspace
              </p>
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
                No status data available yet
              </p>
            )}
          </div>

          {/* Score Distribution Bar */}
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Priority Score Bands
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Number of tasks categorized by priority severity ranges
              </p>
            </div>
            {charts.priority_distribution?.length > 0 ? (
              <div className="pt-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.priority_distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--app-text-muted)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--app-text-muted)"
                      fontSize={11}
                      allowDecimals={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {charts.priority_distribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-16">
                No priority distribution data available
              </p>
            )}
          </div>

          {/* Average Score by Status */}
          <div className="card p-6 shadow-sm space-y-3 lg:col-span-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Average Priority Score by Completion Status
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Comparison of contextual pressure between completed items and active backlog
              </p>
            </div>
            {charts.score_by_status?.length > 0 ? (
              <div className="pt-2">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={charts.score_by_status}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--app-text-muted)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--app-text-muted)" domain={[0, 10]} fontSize={12} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {charts.score_by_status.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-16">
                No score comparison data available
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

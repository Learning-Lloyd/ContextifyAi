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
import { analyticsService } from '../services/analyticsService';

const COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#22C55E', '#EF4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="font-medium text-[var(--app-text)]">{label || payload[0].name}</p>
        <p className="text-[#2563EB] font-semibold">{payload[0].value}</p>
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
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  const { stats, charts } = data;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Insights from your task data</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Tasks" value={stats.total_tasks} type="total" />
          <StatCard title="Completed" value={stats.completed_tasks} type="completed" />
          <StatCard title="Pending" value={stats.pending_tasks} type="pending" />
          <StatCard title="Avg. Priority Score" value={stats.average_priority_score} type="average" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">Task Status Distribution</h3>
            {charts.status.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={charts.status}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {charts.status.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[var(--app-text-muted)] text-center py-12">No data available</p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="section-title mb-4">Priority Score Distribution</h3>
            {charts.priority_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.priority_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                  <XAxis dataKey="name" stroke="var(--app-text-muted)" fontSize={12} />
                  <YAxis stroke="var(--app-text-muted)" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {charts.priority_distribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[var(--app-text-muted)] text-center py-12">No data available</p>
            )}
          </div>

          <div className="card p-6 lg:col-span-2">
            <h3 className="section-title mb-4">Average Score by Status</h3>
            {charts.score_by_status.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={charts.score_by_status}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                  <XAxis dataKey="name" stroke="var(--app-text-muted)" />
                  <YAxis stroke="var(--app-text-muted)" domain={[0, 10]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {charts.score_by_status.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[var(--app-text-muted)] text-center py-12">No data available</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiAward, FiPieChart, FiTrendingUp } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { adminService } from '../../services/adminService';

const COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#22C55E', '#EF4444', '#64748B'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-2.5 shadow-xl text-xs border border-[var(--app-border)]">
        <p className="font-bold text-[var(--app-text)]">{label || payload[0].name}</p>
        <p className="text-[#2563EB] font-mono font-semibold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getAnalytics()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6 max-w-7xl">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <div className="grid lg:grid-cols-2 gap-6">
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="chart" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in max-w-7xl">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Platform-Wide Analytics</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Cross-system aggregate telemetry on task velocity, adoption, priority spreads, and weather impacts
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Monthly Task Creation Velocity" data={data.tasks_per_month} xKey="month" yKey="count" />
          <ChartCard title="User Registration Growth" data={data.users_registered} xKey="month" yKey="count" />
          <ChartCard title="Decision Analysis Activity" data={data.decision_frequency} xKey="month" yKey="count" />

          {/* Priority Distribution */}
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Global Priority Level Spread
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">Distribution of high, medium, and low priority tasks</p>
            </div>
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={data.priority_distribution}
                    dataKey="count"
                    nameKey="level"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.priority_distribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Completion vs Pending */}
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Resolution Ratio (Completed vs Backlog)
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">Overall platform execution efficiency</p>
            </div>
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={data.completed_vs_pending}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.completed_vs_pending?.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weather Stats */}
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Environmental Weather Conditions Logged
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">Frequency of weather scenarios attached to user tasks</p>
            </div>
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={data.weather_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                  <XAxis dataKey="weather_condition" stroke="var(--app-text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--app-text-muted)" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#14B8A6" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Most Active Users */}
        <div className="card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--app-border)]">
            <FiAward className="text-[#2563EB]" size={18} />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
              Most Active Platform Users
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.most_active_users?.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] font-bold flex items-center justify-center shrink-0">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-[var(--app-text)] truncate">{u.name}</p>
                    <p className="text-[10px] text-[var(--app-text-muted)] truncate">{u.email}</p>
                  </div>
                </div>
                <span className="font-bold text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded-full shrink-0">
                  {u.decision_analyses_count} analyses
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ChartCard({ title, data, xKey, yKey }) {
  return (
    <div className="card p-6 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">{title}</h3>
      </div>
      <div className="pt-2">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
            <XAxis dataKey={xKey} stroke="var(--app-text-muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--app-text-muted)" fontSize={11} allowDecimals={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={yKey} fill="#2563EB" radius={[6, 6, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

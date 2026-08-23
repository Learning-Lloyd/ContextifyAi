import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import AdminLayout from '../../components/AdminLayout';
import { adminService } from '../../services/adminService';

const COLORS = ['#2563EB', '#14B8A6', '#F59E0B', '#22C55E', '#EF4444', '#64748B'];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    adminService.getAnalytics().then(setData);
  }, []);

  if (!data) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12"><div className="spinner" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="page-title text-2xl">Analytics Dashboard</h1>
          <p className="page-subtitle">Platform-wide metrics and trends</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Tasks per Month" data={data.tasks_per_month} xKey="month" yKey="count" />
          <ChartCard title="Users Registered" data={data.users_registered} xKey="month" yKey="count" />
          <ChartCard title="Decision Frequency" data={data.decision_frequency} xKey="month" yKey="count" />

          <div className="card p-6">
            <h3 className="section-title mb-4">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.priority_distribution} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={80} label>
                  {data.priority_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="section-title mb-4">Completed vs Pending</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.completed_vs_pending} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                  {data.completed_vs_pending?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="section-title mb-4">Weather Statistics</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.weather_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                <XAxis dataKey="weather_condition" stroke="var(--app-text-muted)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--app-text-muted)" />
                <Tooltip />
                <Bar dataKey="count" fill="#14B8A6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="section-title mb-4">Most Active Users</h3>
          {data.most_active_users?.map((u) => (
            <p key={u.id} className="text-sm py-2 border-b border-[var(--app-border)] last:border-0">
              {u.name} — <span className="text-[#2563EB] font-medium">{u.decision_analyses_count}</span> analyses
            </p>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

function ChartCard({ title, data, xKey, yKey }) {
  return (
    <div className="card p-6">
      <h3 className="section-title mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
          <XAxis dataKey={xKey} stroke="var(--app-text-muted)" fontSize={12} />
          <YAxis stroke="var(--app-text-muted)" />
          <Tooltip />
          <Bar dataKey={yKey} fill="#2563EB" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

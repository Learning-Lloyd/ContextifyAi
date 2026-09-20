import { useEffect, useState } from 'react';
import {
  FiBell,
  FiCheckCircle,
  FiClock,
  FiCloud,
  FiFileText,
  FiList,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { adminService } from '../../services/adminService';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <LoadingSkeleton variant="stat-card" count={8} />
        </div>
      </AdminLayout>
    );
  }

  const { stats, weather_api_status, recent_notifications } = data;

  const kpis = [
    { label: 'Registered Users', value: stats.total_users, icon: FiUsers, color: 'icon-box-blue' },
    { label: 'Active Accounts', value: stats.active_users, icon: FiCheckCircle, color: 'icon-box-green' },
    { label: 'Total Tasks', value: stats.total_tasks, icon: FiList, color: 'icon-box-blue' },
    { label: 'Decisions Logged', value: stats.total_decisions, icon: FiShield, color: 'icon-box-teal' },
    { label: "Today's Decisions", value: stats.todays_decisions, icon: FiClock, color: 'icon-box-amber' },
    { label: 'Pending Tasks', value: stats.pending_tasks, icon: FiClock, color: 'icon-box-amber' },
    { label: 'Completed Tasks', value: stats.completed_tasks, icon: FiCheckCircle, color: 'icon-box-green' },
    {
      label: 'Weather API Status',
      value: weather_api_status.status || 'Active',
      icon: FiCloud,
      color: weather_api_status.status === 'ok' || weather_api_status.status === 'operational' ? 'icon-box-green' : 'icon-box-teal',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in max-w-7xl">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Administrative Operations Center</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Real-time platform telemetry, user metrics, algorithm evaluations, and service health
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 card-hover shadow-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="card-kpi-label text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wider">
                    {kpi.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[var(--app-text)] mt-1 tracking-tight capitalize">
                    {kpi.value}
                  </p>
                </div>
                <div className={`icon-box ${kpi.color} shrink-0 w-10 h-10 rounded-xl`}>
                  <Icon size={18} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Admin Navigation Shortcuts */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            to="/admin/users"
            className="card p-5 card-hover flex items-center gap-3 border-l-4 border-l-[#2563EB]"
          >
            <div className="icon-box icon-box-blue shrink-0">
              <FiUsers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--app-text)]">Manage Users</h3>
              <p className="text-xs text-[var(--app-text-muted)]">View roles, status, and reset credentials</p>
            </div>
          </Link>

          <Link
            to="/admin/decisions"
            className="card p-5 card-hover flex items-center gap-3 border-l-4 border-l-[#14B8A6]"
          >
            <div className="icon-box icon-box-teal shrink-0">
              <FiShield size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--app-text)]">Decision Audits</h3>
              <p className="text-xs text-[var(--app-text-muted)]">Inspect computed rankings and AI justifications</p>
            </div>
          </Link>

          <Link
            to="/admin/reports"
            className="card p-5 card-hover flex items-center gap-3 border-l-4 border-l-[#F59E0B]"
          >
            <div className="icon-box icon-box-amber shrink-0">
              <FiFileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--app-text)]">Export Data</h3>
              <p className="text-xs text-[var(--app-text-muted)]">Download CSV, XLSX, and PDF system audits</p>
            </div>
          </Link>
        </div>

        {/* Recent Notifications Card */}
        {recent_notifications?.data?.length > 0 && (
          <div className="card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)] flex items-center gap-2">
                <FiBell size={16} className="text-[#2563EB]" />
                Recent System Alerts & Notices
              </h2>
              <Link to="/admin/notifications" className="text-xs text-[#2563EB] hover:underline font-semibold">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {recent_notifications.data.slice(0, 5).map((n) => (
                <div key={n.id} className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-xs space-y-1">
                  <p className="font-bold text-sm text-[var(--app-text)]">{n.title}</p>
                  <p className="text-[var(--app-text-secondary)]">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

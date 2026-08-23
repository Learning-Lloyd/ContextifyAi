import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center h-64 items-center">
          <div className="spinner" />
        </div>
      </AdminLayout>
    );
  }

  const { stats, weather_api_status, recent_notifications } = data;

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">System overview and monitoring</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Total Users', stats.total_users],
            ['Active Users', stats.active_users],
            ['Total Tasks', stats.total_tasks],
            ['Total Decisions', stats.total_decisions],
            ["Today's Decisions", stats.todays_decisions],
            ['Pending Tasks', stats.pending_tasks],
            ['Completed Tasks', stats.completed_tasks],
            ['Weather API', weather_api_status.status],
          ].map(([label, value]) => (
            <div key={label} className="card-kpi">
              <p className="card-kpi-label">{label}</p>
              <p className="card-kpi-value capitalize text-xl">{value}</p>
            </div>
          ))}
        </div>

        {recent_notifications?.data?.length > 0 && (
          <div className="card p-6">
            <h2 className="section-title mb-4">Recent Notifications</h2>
            <div className="space-y-2">
              {recent_notifications.data.slice(0, 5).map((n) => (
                <div key={n.id} className="card-kpi">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-[var(--app-text-secondary)]">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

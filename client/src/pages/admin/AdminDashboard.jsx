import { useEffect, useState } from 'react';
import { FiArrowRight, FiBell, FiCheckCircle, FiCloud, FiFileText, FiShield, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { adminService } from '../../services/adminService';

const routes = [
  { to: '/admin/users', label: 'User directory', note: 'Accounts, roles, and access', icon: FiUsers },
  { to: '/admin/tasks', label: 'Task monitoring', note: 'Platform task records', icon: FiCheckCircle },
  { to: '/admin/decisions', label: 'Decision records', note: 'Prioritization and comparisons', icon: FiShield },
  { to: '/admin/feedback', label: 'Feedback inbox', note: 'Triage and respond to reports', icon: FiBell },
  { to: '/admin/reports', label: 'Report exports', note: 'Download supported datasets', icon: FiFileText },
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    adminService.getDashboard().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="admin-console animate-fade-in">
        <header className="admin-console-heading">
          <div><p className="eyebrow"><span className="eyebrow-dot" /> PLATFORM OPERATIONS</p><h1 className="page-title">System pulse</h1><p className="page-subtitle">A working view of platform activity, service health, and review queues.</p></div>
          <Link to="/admin/analytics" className="text-action">Open analytics <FiArrowRight /></Link>
        </header>
        {loading ? <div className="admin-console-loading">Reading platform status…</div> : error || !data ? <div className="admin-console-loading">Platform status could not be loaded. Check the API connection and refresh.</div> : <>
          <section className="admin-status-band" aria-label="Platform totals">
            <div><span>Registered accounts</span><strong>{data.stats.total_users}</strong></div>
            <div><span>Active accounts</span><strong>{data.stats.active_users}</strong></div>
            <div><span>Open tasks</span><strong>{data.stats.pending_tasks}</strong></div>
            <div><span>Decisions recorded</span><strong>{data.stats.total_decisions}</strong></div>
          </section>
          <div className="admin-console-grid">
            <section className="admin-ops-list">
              <div className="admin-section-heading"><div><p className="eyebrow">CONTROL ROOM</p><h2>Operations</h2></div><span>05 destinations</span></div>
              {routes.map(({ to, label, note, icon: Icon }, index) => <Link className="admin-destination" to={to} key={to}><span className="admin-destination-index">0{index + 1}</span><span className="admin-destination-icon"><Icon /></span><span className="admin-destination-copy"><strong>{label}</strong><small>{note}</small></span><FiArrowRight className="admin-destination-arrow" /></Link>)}
              <Link className="admin-secondary-destination" to="/admin/audit-logs">Open audit trail <FiArrowRight /></Link>
            </section>
            <aside className="admin-system-context">
              <div className="admin-section-heading"><div><p className="eyebrow">SERVICE HEALTH</p><h2>Connectivity</h2></div></div>
              <div className="service-status-line"><span className={`service-status-dot ${data.weather_api_status?.status === 'operational' ? 'is-up' : 'is-degraded'}`} /><div><strong>{data.weather_api_status?.provider || 'Weather service'}</strong><span>{data.weather_api_status?.status || 'Unknown'}</span></div><FiCloud /></div>
              <p className="service-status-note">This check reports the weather provider response. Other services are not monitored here.</p>
              <div className="admin-activity-callout"><span className="eyebrow">TODAY</span><strong>{data.stats.todays_decisions}</strong><span>decision records created</span><Link to="/admin/decisions">Review activity <FiArrowRight /></Link></div>
              {(data.recent_notifications?.data || data.recent_notifications || []).length > 0 && <div className="admin-alerts-list"><div className="admin-section-heading"><div><p className="eyebrow">RECENT</p><h2>System notices</h2></div><Link to="/admin/notifications" aria-label="All notifications"><FiArrowRight /></Link></div>{(data.recent_notifications?.data || data.recent_notifications || []).slice(0, 3).map((notice) => <article key={notice.id}><strong>{notice.title}</strong><span>{notice.message}</span></article>)}</div>}
            </aside>
          </div>
        </>}
      </div>
    </AdminLayout>
  );
}

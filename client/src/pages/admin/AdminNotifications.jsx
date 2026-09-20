import { useEffect, useState } from 'react';
import { FiBell, FiCheck, FiClock } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchNotifications = () => {
    setLoading(true);
    adminService
      .getNotifications()
      .then((res) => setNotifications(res.notifications?.data || res.notifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    await adminService.markNotificationRead(id);
    showToast('Notification marked as read', 'success');
    fetchNotifications();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-5xl">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Administrative Alerts & Notifications</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            System notices, error dispatches, threshold alerts, and administrative status updates
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton variant="card" count={4} />
        ) : notifications.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FiBell}
              title="All Clear — No Notifications"
              description="There are currently no active administrative alerts or unread notices."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`card p-5 transition-all shadow-sm ${
                  n.is_read
                    ? 'opacity-70 bg-[var(--app-muted)]/30'
                    : 'border-l-4 border-l-[#2563EB] bg-[var(--app-card)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[var(--app-text)]">{n.title}</span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-[var(--app-text-muted)] flex items-center gap-1.5 pt-1 font-mono">
                      <FiClock size={11} /> {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>

                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="btn btn-secondary btn-sm text-xs shrink-0 inline-flex items-center gap-1"
                    >
                      <FiCheck size={13} />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

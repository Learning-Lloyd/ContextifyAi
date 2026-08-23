import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/adminService';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchNotifications = () => {
    setLoading(true);
    adminService.getNotifications()
      .then((res) => setNotifications(res.notifications?.data || res.notifications || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    await adminService.markNotificationRead(id);
    showToast('Notification marked as read', 'success');
    fetchNotifications();
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title text-2xl">Notifications</h1>
          <p className="page-subtitle">System alerts and updates</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="card p-10 text-center text-[var(--app-text-secondary)]">No notifications.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`card p-5 ${n.is_read ? 'opacity-70' : 'border-[rgba(37,99,235,0.25)]'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-sm">{n.title}</p>
                    <p className="text-sm text-[var(--app-text-secondary)] mt-1">{n.message}</p>
                    <p className="text-xs text-[var(--app-text-muted)] mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && (
                    <button type="button" onClick={() => handleMarkRead(n.id)} className="btn btn-ghost btn-sm shrink-0">
                      Mark read
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

import { useEffect, useRef, useState } from 'react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { notificationService } from '../services/notificationService';

export default function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const containerRef = useRef(null);

  const refresh = async () => {
    try {
      const result = await notificationService.getAll({ per_page: 6 });
      setNotifications(result.notifications?.data || []);
      setUnreadCount(result.unread_count || 0);
    } catch {
      // Notification refresh is non-blocking for the rest of the workspace.
    }
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 60000);
    const refreshAfterGoalUpdate = () => { refresh(); };
    window.addEventListener('contextify:notifications-refresh', refreshAfterGoalUpdate);
    const close = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('contextify:notifications-refresh', refreshAfterGoalUpdate);
      document.removeEventListener('pointerdown', close);
    };
  }, []);

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    await refresh();
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    await refresh();
  };

  return (
    <div className="notification-anchor" ref={containerRef}>
      <button type="button" className="workspace-icon-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} onClick={() => { setOpen((value) => !value); refresh(); }}>
        <FiBell size={17} />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown" role="dialog" aria-label="Notifications">
          <div className="notification-dropdown-heading">
            <div><strong>Notifications</strong><small>{unreadCount} unread</small></div>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} aria-label="Mark all notifications as read"><FiCheckCircle size={15} /></button>}
          </div>
          {notifications.length === 0 ? (
            <p className="notification-empty">No reminders yet. Deadline reminders will appear here.</p>
          ) : (
            <div className="notification-items">
              {notifications.map((item) => (
                <div key={item.id} className={`notification-item ${item.read_at ? '' : 'is-unread'}`}>
                  <div className="min-w-0">
                    {item.type === 'announcement' ? (
                      <button type="button" className="notification-announcement-title" aria-expanded={expandedId === item.id} onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}>{item.title}</button>
                    ) : <strong>{item.title}</strong>}
                    <p className={item.type === 'announcement' && expandedId !== item.id ? 'line-clamp-2' : 'whitespace-pre-wrap'}>{item.message}</p>
                    {item.type === 'announcement' && <><small className="notification-announcement-category">Announcement</small><button type="button" className="notification-announcement-toggle" aria-expanded={expandedId === item.id} onClick={() => setExpandedId((current) => current === item.id ? null : item.id)}>{expandedId === item.id ? 'Show less' : 'Read announcement'}</button></>}
                    <small>{new Date(item.type === 'announcement' ? (item.metadata?.published_at || item.created_at) : item.created_at).toLocaleString()}</small>
                  </div>
                  {!item.read_at && <button type="button" onClick={() => markRead(item.id)} aria-label="Mark notification as read"><FiCheck /></button>}
                </div>
              ))}
            </div>
          )}
          <Link to="/notifications" className="notification-history-link" onClick={() => setOpen(false)}>View notification history</Link>
        </div>
      )}
    </div>
  );
}

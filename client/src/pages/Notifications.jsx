import { useCallback, useEffect, useState } from 'react';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { notificationService } from '../services/notificationService';

export default function Notifications() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(await notificationService.getAll({ page, per_page: 20 }));
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await notificationService.markAsRead(id);
    await load();
  };

  const markAllRead = async () => {
    await notificationService.markAllAsRead();
    await load();
  };

  const pageData = result?.notifications;
  const notifications = pageData?.data || [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--app-border)]">
          <h1 className="page-title">Notifications</h1>
          {(result?.unread_count || 0) > 0 && <button type="button" onClick={markAllRead} className="btn btn-secondary text-sm"><FiCheckCircle /> Mark all read</button>}
        </div>
        {loading ? <LoadingSkeleton variant="task-card" count={3} /> : notifications.length === 0 ? (
          <EmptyState title="No reminders yet" description="Deadline reminders will appear here." />
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <article key={item.id} className={`card p-5 flex flex-col sm:flex-row items-start justify-between gap-3 ${item.read_at ? 'opacity-75' : 'border-l-4 border-l-[#285E4D]'}`}>
                <div className="min-w-0"><h2 className="font-bold text-base text-[var(--app-text)]">{item.title}</h2><p className="text-sm text-[var(--app-text-secondary)] mt-1">{item.message}</p><time className="text-xs text-[var(--app-text-muted)] mt-2 block">{new Date(item.created_at).toLocaleString()}</time></div>
                {!item.read_at && <button type="button" className="btn btn-secondary btn-sm text-sm shrink-0" onClick={() => markRead(item.id)}><FiCheck /> Mark read</button>}
              </article>
            ))}
            {pageData?.last_page > 1 && <div className="flex justify-between"><button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-xs text-[var(--app-text-muted)] self-center">Page {pageData.current_page} of {pageData.last_page}</span><button className="btn btn-ghost btn-sm" disabled={page >= pageData.last_page} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { FiActivity, FiClock } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { adminService } from '../../services/adminService';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getAuditLogs()
      .then((res) => setLogs(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Security & System Audit Trail</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Immutable chronological record of user actions, administrative events, and security access points
          </p>
        </div>

        {loading ? (
          <div className="table-container shadow-sm">
            <table className="table-modern">
              <tbody>
                <LoadingSkeleton variant="table-row" count={6} cols={4} />
              </tbody>
            </table>
          </div>
        ) : logs.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FiActivity}
              title="No Audit Logs Recorded"
              description="Platform activities and security events will be archived here as users interact with the system."
            />
          </div>
        ) : (
          <div className="table-container shadow-sm">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor Identity</th>
                  <th>Action Triggered</th>
                  <th>Originating IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isSystem = !log.user;
                  return (
                    <tr key={log.id} className="hover:bg-[var(--app-hover)] transition-colors">
                      <td className="text-xs text-[var(--app-text-muted)] font-mono whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <FiClock size={12} />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                              isSystem
                                ? 'bg-amber-500/10 text-[#F59E0B]'
                                : 'bg-[#2563EB]/10 text-[#2563EB]'
                            }`}
                          >
                            {isSystem ? 'S' : log.user.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-xs text-[var(--app-text)]">
                            {log.user?.name ?? 'System Process'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral font-mono text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs text-[var(--app-text-secondary)] bg-[var(--app-muted)] px-2 py-0.5 rounded">
                          {log.ip_address || '127.0.0.1'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

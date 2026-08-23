import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminService } from '../../services/adminService';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    adminService.getAuditLogs().then((res) => setLogs(res.data || []));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title text-2xl">Audit Logs</h1>
          <p className="page-subtitle">System activity and security events</p>
        </div>

        <div className="table-container">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user?.name ?? 'System'}</td>
                  <td>{log.action}</td>
                  <td className="font-mono text-xs">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

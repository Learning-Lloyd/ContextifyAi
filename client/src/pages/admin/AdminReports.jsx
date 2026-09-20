import { FiDownload, FiFileText, FiList, FiPieChart, FiShield, FiSun, FiUsers } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';

const reports = [
  {
    type: 'users',
    label: 'User Account Registry',
    desc: 'Full roster of registered users, roles, and status',
    icon: FiUsers,
    color: 'icon-box-blue',
  },
  {
    type: 'tasks',
    label: 'Task Backlog & Completion Log',
    desc: 'Historical list of all user tasks, deadlines, and scores',
    icon: FiList,
    color: 'icon-box-teal',
  },
  {
    type: 'decisions',
    label: 'Decision History & Audits',
    desc: 'Evaluated rankings and pairwise decision records',
    icon: FiShield,
    color: 'icon-box-amber',
  },
  {
    type: 'priority',
    label: 'Priority Score Distribution',
    desc: 'Statistical aggregation across priority score bands',
    icon: FiPieChart,
    color: 'icon-box-green',
  },
  {
    type: 'weather',
    label: 'Weather Impact Statistics',
    desc: 'Environmental factors associated with stored tasks',
    icon: FiSun,
    color: 'icon-box-blue',
  },
];

const formats = [
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'Excel (XLS)' },
  { id: 'pdf', label: 'PDF Report' },
];

export default function AdminReports() {
  const handleExport = (type, format) => {
    const token = localStorage.getItem('token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const ext = format === 'xlsx' ? 'xls' : format;
    fetch(`${base}/admin/reports/export?type=${type}&format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report.${ext}`;
        a.click();
      });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Export & Audit Reports</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Generate and download platform data in standard business formats
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map(({ type, label, desc, icon: Icon, color }) => (
            <div
              key={type}
              className="card p-6 card-hover shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className={`icon-box ${color} w-10 h-10 rounded-xl shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] bg-[var(--app-muted)] px-2 py-0.5 rounded">
                    Audit Data
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[var(--app-text)]">{label}</h3>
                <p className="text-xs text-[var(--app-text-secondary)] mt-1 leading-relaxed">
                  {desc}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--app-border)]">
                <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block mb-2">
                  Download Format
                </span>
                <div className="flex gap-2 flex-wrap">
                  {formats.map(({ id, label: fmtLabel }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleExport(type, id)}
                      className="btn btn-secondary btn-sm text-xs py-1 px-2.5 inline-flex items-center gap-1"
                    >
                      <FiDownload size={11} />
                      {fmtLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

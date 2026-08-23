import AdminLayout from '../../components/AdminLayout';

const reports = [
  { type: 'users', label: 'Monthly User Report' },
  { type: 'tasks', label: 'Task Completion Report' },
  { type: 'decisions', label: 'Decision History Report' },
  { type: 'priority', label: 'Priority Distribution Report' },
  { type: 'weather', label: 'Weather Statistics Report' },
];

const formats = [
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'Excel' },
  { id: 'pdf', label: 'PDF' },
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
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title text-2xl">Reports</h1>
          <p className="page-subtitle">Download reports as CSV, Excel, or PDF</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {reports.map(({ type, label }) => (
            <div key={type} className="card p-5 card-hover">
              <p className="font-semibold text-sm">{label}</p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {formats.map(({ id, label: fmtLabel }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleExport(type, id)}
                    className="btn btn-secondary btn-sm"
                  >
                    {fmtLabel}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

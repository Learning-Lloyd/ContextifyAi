import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminService } from '../../services/adminService';

export default function AdminDecisions() {
  const [decisions, setDecisions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    adminService.getDecisions().then((res) => setDecisions(res.data || []));
  }, []);

  const viewDetail = async (id) => {
    const res = await adminService.getDecision(id);
    setSelected(res.decision);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title text-2xl">Decision Monitoring</h1>
          <p className="page-subtitle">Review user decision analyses</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {decisions.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => viewDetail(d.id)}
                className="w-full text-left card p-4 card-hover"
              >
                <p className="font-medium text-sm">{d.user?.name}</p>
                <p className="text-sm text-[var(--app-text-secondary)]">{d.total_selected} tasks · {new Date(d.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="card p-6 space-y-4">
              <h2 className="section-title">Analysis Detail</h2>
              <p className="text-sm text-[var(--app-text-secondary)]">User: {selected.user?.name}</p>
              <p className="text-sm">Tasks: {selected.total_selected}</p>
              {selected.summary && (
                <pre className="text-xs bg-[var(--app-muted)] p-3 rounded-lg overflow-auto border border-[var(--app-border)]">
                  {JSON.stringify(selected.summary, null, 2)}
                </pre>
              )}
              {selected.ranked_tasks?.slice(0, 3).map((t) => (
                <p key={t.id || t.title} className="text-sm">#{t.rank} {t.title} — {t.priority_score}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

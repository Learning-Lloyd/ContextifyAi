import { useEffect, useState } from 'react';
import { FiClock, FiShield } from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { adminService } from '../../services/adminService';

export default function AdminDecisions() {
  const [decisions, setDecisions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getDecisions()
      .then((res) => {
        const data = res.data || [];
        setDecisions(data);
        if (data.length > 0) {
          viewDetail(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const viewDetail = async (id) => {
    try {
      const res = await adminService.getDecision(id);
      setSelected(res.decision);
    } catch {
      // fallback
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Decision Audit Logs</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Inspect recorded multi-factor rankings, candidate inputs, and generated AI justifications
          </p>
        </div>

        {loading ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <LoadingSkeleton variant="card" count={4} />
            <LoadingSkeleton variant="card" count={1} />
          </div>
        ) : decisions.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FiShield}
              title="No Decision Analyses Found"
              description="No user decision events have been processed on the platform yet."
            />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Left Master List */}
            <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
              {decisions.map((d) => {
                const isSelected = selected?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => viewDetail(d.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#2563EB] bg-blue-500/[0.04] shadow-sm'
                        : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-text-muted)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                          {d.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-sm text-[var(--app-text)] truncate">
                          {d.user?.name || 'Unknown User'}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded-full">
                        {d.total_selected} tasks
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[var(--app-text-muted)] mt-2">
                      <FiClock size={12} />
                      <span>{new Date(d.created_at).toLocaleString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Detail Panel */}
            {selected ? (
              <div className="card p-6 space-y-5 shadow-sm sticky top-20">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                      Audit Inspection Record #{selected.id}
                    </span>
                    <h3 className="text-base font-bold text-[var(--app-text)]">
                      Analysis by {selected.user?.name}
                    </h3>
                  </div>
                  <span className="badge badge-primary text-xs font-semibold">
                    {selected.total_selected} Tasks
                  </span>
                </div>

                {/* Ranked Tasks Summary */}
                {selected.ranked_tasks?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                      Top Output Rankings
                    </p>
                    <div className="space-y-1.5">
                      {selected.ranked_tasks.slice(0, 4).map((t) => (
                        <div
                          key={t.id || t.title}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-muted)]/30 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-bold text-[#2563EB]">#{t.rank}</span>
                            <span className="font-medium text-[var(--app-text)] truncate">{t.title}</span>
                          </div>
                          <span className="font-mono font-bold text-[#2563EB] shrink-0">
                            Score {t.priority_score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON Inspector */}
                {selected.summary && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                      Payload Metadata Snapshot
                    </p>
                    <pre className="text-[11px] font-mono bg-[var(--app-muted)] text-[var(--app-text)] p-3.5 rounded-xl overflow-auto max-h-56 border border-[var(--app-border)]">
                      {JSON.stringify(selected.summary, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-12 text-center text-xs text-[var(--app-text-muted)]">
                Select a decision log to inspect details
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

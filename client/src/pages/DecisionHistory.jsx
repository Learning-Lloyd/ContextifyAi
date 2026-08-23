import { useEffect, useState } from 'react';
import { FiClock, FiCpu, FiGitMerge } from 'react-icons/fi';
import DecisionConfidenceBadge from '../components/DecisionConfidenceBadge';
import Layout from '../components/Layout';
import { decisionService } from '../services/decisionService';

export default function DecisionHistory() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    decisionService.getTimeline()
      .then((result) => setTimeline(result.timeline || []))
      .catch(() => setTimeline([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Decision Timeline</h1>
          <p className="page-subtitle">Chronological history of analyses and saved comparisons.</p>
        </div>

        {timeline.length === 0 ? (
          <div className="card p-10 text-center text-[var(--app-text-secondary)]">
            No decision history yet. Run an analysis in Decision Lab to get started.
          </div>
        ) : (
          <div className="relative pl-8 space-y-6">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[var(--app-border)]" />

            {timeline.map((entry) => (
              <div key={`${entry.type}-${entry.id}`} className="relative">
                <div className="absolute -left-5 top-4 w-4 h-4 rounded-full bg-[var(--app-card)] border-2 border-[#2563EB]" />

                <div className="card p-6 ml-2">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={`icon-box ${entry.type === 'analysis' ? 'icon-box-blue' : 'icon-box-teal'}`}>
                        {entry.type === 'analysis' ? <FiCpu size={16} /> : <FiGitMerge size={16} />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{entry.title}</p>
                        <p className="text-xs text-[var(--app-text-muted)] flex items-center gap-1 mt-1">
                          <FiClock size={12} /> {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {entry.confidence && <DecisionConfidenceBadge confidence={entry.confidence} />}
                  </div>

                  {entry.type === 'analysis' && (
                    <div className="mt-4 text-sm space-y-1">
                      <p className="text-[var(--app-text)]">
                        Top priority: <span className="text-[#2563EB] font-medium">{entry.top_task ?? '—'}</span>
                        {entry.top_score != null && <span className="text-[var(--app-text-muted)]"> (score {entry.top_score})</span>}
                      </p>
                      <p className="text-[var(--app-text-secondary)]">{entry.total_selected} tasks analyzed</p>
                      {entry.conflicts > 0 && (
                        <p className="text-[#F59E0B]">{entry.conflicts} deadline conflict(s) detected</p>
                      )}
                    </div>
                  )}

                  {entry.type === 'comparison' && (
                    <div className="mt-4 text-sm space-y-1">
                      <p className="text-[var(--app-text)]">
                        Recommended: <span className="font-medium text-[#2563EB]">{entry.recommended}</span>
                      </p>
                      {entry.score_difference != null && (
                        <p className="text-[var(--app-text-secondary)]">Score difference: {entry.score_difference}</p>
                      )}
                      {entry.explanation && <p className="text-[var(--app-text-muted)] mt-2">{entry.explanation}</p>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

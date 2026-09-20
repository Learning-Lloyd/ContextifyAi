import { useEffect, useState } from 'react';
import { FiClock, FiCpu, FiGitMerge } from 'react-icons/fi';
import DecisionConfidenceBadge from '../components/DecisionConfidenceBadge';
import Layout from '../components/Layout';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { decisionService } from '../services/decisionService';

export default function DecisionHistory() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    decisionService
      .getTimeline()
      .then((result) => setTimeline(result.timeline || []))
      .catch(() => setTimeline([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <LoadingSkeleton variant="card" count={3} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Decision Timeline</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Audited history of all multi-task prioritizations and pairwise comparisons
          </p>
        </div>

        {timeline.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={FiClock}
              title="No Decision Records Found"
              description="When you analyze candidate tasks or compare options in Decision Lab, your decisions are logged here."
            />
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6">
            {/* Timeline Vertical Spine */}
            <div className="absolute left-2.5 sm:left-3 top-3 bottom-3 w-0.5 bg-[var(--app-border)]" />

            {timeline.map((entry) => {
              const isAnalysis = entry.type === 'analysis';
              return (
                <div key={`${entry.type}-${entry.id}`} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-4 sm:-left-4.5 top-5 w-3.5 h-3.5 rounded-full bg-[var(--app-card)] border-2 transition-all ${
                      isAnalysis ? 'border-[#2563EB] group-hover:bg-[#2563EB]' : 'border-[#14B8A6] group-hover:bg-[#14B8A6]'
                    }`}
                  />

                  {/* Timeline Entry Card */}
                  <div className="card p-5 sm:p-6 ml-2 sm:ml-4 card-hover shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`icon-box ${
                            isAnalysis ? 'icon-box-blue' : 'icon-box-teal'
                          } w-10 h-10 rounded-xl shrink-0`}
                        >
                          {isAnalysis ? <FiCpu size={18} /> : <FiGitMerge size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--app-text-muted)]">
                              {isAnalysis ? 'Multi-Task Analysis' : 'Pairwise Comparison'}
                            </span>
                          </div>
                          <p className="font-bold text-sm sm:text-base text-[var(--app-text)] mt-0.5">
                            {entry.title}
                          </p>
                          <p className="text-xs text-[var(--app-text-muted)] flex items-center gap-1.5 mt-1">
                            <FiClock size={12} /> {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {entry.confidence && (
                        <DecisionConfidenceBadge confidence={entry.confidence} showGap />
                      )}
                    </div>

                    {isAnalysis && (
                      <div className="pt-3 border-t border-[var(--app-border)] text-xs sm:text-sm space-y-2">
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--app-muted)]/50">
                          <span className="text-[var(--app-text-secondary)]">Top Prioritized Task:</span>
                          <span className="font-bold text-[#2563EB]">
                            {entry.top_task ?? '—'}
                            {entry.top_score != null && ` (Score ${entry.top_score})`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[var(--app-text-muted)] px-1">
                          <span>{entry.total_selected} tasks evaluated</span>
                          {entry.conflicts > 0 && (
                            <span className="text-[#F59E0B] font-semibold">
                              ⚠️ {entry.conflicts} deadline collision(s) detected
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {!isAnalysis && (
                      <div className="pt-3 border-t border-[var(--app-border)] text-xs sm:text-sm space-y-2">
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--app-muted)]/50">
                          <span className="text-[var(--app-text-secondary)]">Recommended Choice:</span>
                          <span className="font-bold text-[#2563EB]">{entry.recommended}</span>
                        </div>
                        {entry.score_difference != null && (
                          <p className="text-xs text-[var(--app-text-muted)] px-1">
                            Score delta: <strong className="text-[var(--app-text)]">{entry.score_difference} points</strong>
                          </p>
                        )}
                        {entry.explanation && (
                          <p className="text-xs text-[var(--app-text-secondary)] leading-relaxed italic px-1">
                            &ldquo;{entry.explanation}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

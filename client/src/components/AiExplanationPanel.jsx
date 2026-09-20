import { FiCloud, FiCpu, FiInfo, FiZap } from 'react-icons/fi';

export default function AiExplanationPanel({ explanation, weatherContext }) {
  if (!explanation) return null;

  const isAi = explanation.source === 'ai';
  const sourceLabel = isAi ? 'AI-Generated Interpretation' : 'Rule-Based Engine';

  return (
    <div className="card p-6 space-y-5 border-l-4 border-l-[#14B8A6] bg-[var(--app-card)] animate-fade-in shadow-sm">
      {/* Header with clear separation banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[var(--app-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-[#14B8A6] flex items-center justify-center">
            {isAi ? <FiZap size={16} /> : <FiCpu size={16} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)] tracking-tight">
              Why These Tasks Are Prioritized
            </h3>
            <p className="text-[11px] text-[var(--app-text-muted)]">
              Natural-language contextual explanation of your deterministic scores
            </p>
          </div>
        </div>
        <span className="badge badge-secondary text-[11px] font-medium tracking-wide">
          {sourceLabel}
        </span>
      </div>

      {/* Summary Narrative */}
      {explanation.summary && (
        <p className="text-sm text-[var(--app-text)] leading-relaxed font-normal">
          {explanation.summary}
        </p>
      )}

      {/* Top Task Justification */}
      {explanation.top_task_explanation && (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-muted)]/50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--app-text)] uppercase tracking-wider mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
            Top Priority Recommendation
          </div>
          <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed">
            {explanation.top_task_explanation}
          </p>
        </div>
      )}

      {/* Productivity Tips */}
      {explanation.productivity_tips?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
            Contextual Execution Strategy
          </p>
          <div className="grid gap-2">
            {explanation.productivity_tips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--app-text-secondary)] bg-[var(--app-surface)] p-2.5 rounded-lg border border-[var(--app-border)]"
              >
                <FiInfo className="text-[#2563EB] shrink-0 mt-0.5" size={14} />
                <span className="leading-snug">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Advice Advisory */}
      {(explanation.weather_advice || weatherContext) && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-xs">
          <FiCloud className="text-[#14B8A6] shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--app-text)]">Environmental Advisory</span>
              {weatherContext?.location && (
                <span className="text-[var(--app-text-muted)]">({weatherContext.location})</span>
              )}
            </div>
            {explanation.weather_advice && (
              <p className="text-[var(--app-text-secondary)] leading-relaxed">
                {explanation.weather_advice}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formal Architecture Disclaimer */}
      <div className="pt-2 border-t border-[var(--app-border)] flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
        <span>Formula: (Importance × 0.4) + (Urgency × 0.3) + (Time × 0.2) + (Workload × 0.1)</span>
        <span className="font-medium">AI provides explanation only</span>
      </div>
    </div>
  );
}

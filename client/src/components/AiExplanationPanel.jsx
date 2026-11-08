import { FiCloud, FiCpu, FiZap } from 'react-icons/fi';

export default function AiExplanationPanel({ explanation, weatherContext }) {
  if (!explanation) return null;

  const isAi = explanation.source === 'ai';
  const sourceLabel = isAi ? 'AI explanation' : 'Context explanation';

  return (
    <div className="card p-6 space-y-5 border-l-4 border-l-[#14B8A6] bg-[var(--app-card)] animate-fade-in shadow-sm">
      {/* Header with clear separation banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-[var(--app-border)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-[#14B8A6] flex items-center justify-center">
            {isAi ? <FiZap size={16} /> : <FiCpu size={16} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)] tracking-tight">Why this order?</h3>
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

      {/* Optional reasoning details */}
      {(explanation.top_task_explanation || explanation.productivity_tips?.length > 0 || explanation.weather_advice || weatherContext) && (
      <details>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">More details</summary>
      <div className="mt-3 space-y-3">
      {explanation.top_task_explanation && (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-muted)]/50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--app-text)] uppercase tracking-wider mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
            Recommended task
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
            Tips
          </p>
          <div className="grid gap-2">
            {explanation.productivity_tips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--app-text-secondary)] bg-[var(--app-surface)] p-2.5 rounded-lg border border-[var(--app-border)]"
              >
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
              <span className="font-semibold text-[var(--app-text)]">Weather advice</span>
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

      </div>
      </details>
      )}
      <p className="pt-2 border-t border-[var(--app-border)] text-xs text-[var(--app-text-muted)]">AI explains the results; your fixed scoring factors set the scores.</p>
    </div>
  );
}

import PriorityBadge from './PriorityBadge';
import DecisionConfidenceBadge from './DecisionConfidenceBadge';
import WhyNotPanel from './WhyNotPanel';
import ScoreRing from './ScoreRing';
import FactorBar from './FactorBar';
import { weatherIcon } from '../utils/taskUtils';

export default function RankedTaskCard({ task }) {
  const breakdown = task.factor_breakdown || {};
  const factors = breakdown.factors || [];

  const isTopRank = task.rank === 1;

  return (
    <div
      className={`card p-6 space-y-5 animate-fade-in transition-all ${
        isTopRank
          ? 'border-2 border-[#2563EB]/40 shadow-md bg-gradient-to-br from-[var(--app-card)] to-[var(--app-muted)]/30'
          : ''
      }`}
    >
      {/* Top Header: Rank, Title, Badges, Score */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-base shrink-0 shadow-sm ${
              isTopRank
                ? 'bg-[#2563EB] text-white'
                : 'bg-[var(--app-muted)] text-[var(--app-text-secondary)] border border-[var(--app-border)]'
            }`}
          >
            #{task.rank}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-[var(--app-text)] leading-snug">
                {task.title}
              </h3>
              <PriorityBadge level={task.priority_level} score={task.priority_score} />
              {task.rank_confidence && <DecisionConfidenceBadge confidence={task.rank_confidence} />}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-[var(--app-text-muted)]">
              {task.due_date && (
                <span>
                  Due: <strong className="text-[var(--app-text)]">{task.due_date}</strong>
                  {task.due_time ? ` at ${task.due_time}` : ''}
                </span>
              )}
              {task.countdown && (
                <span className="font-semibold text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded-full text-[11px]">
                  {task.countdown}
                </span>
              )}
              {task.location && <span>📍 {task.location}</span>}
            </div>
          </div>
        </div>

        {/* Score Ring Display */}
        <div className="flex flex-col items-center shrink-0">
          <ScoreRing score={task.priority_score} variant="md" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--app-text-muted)] mt-1">
            Score
          </span>
        </div>
      </div>

      {(task.weather_context || task.reason_bullets?.length > 0 || task.overall_explanation) && (
      <details className="border-t border-[var(--app-border)] pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">Why this rank?</summary>
      <div className="mt-3 space-y-3">
      {/* Weather Context (if available) */}
      {task.weather_context && (
        <div className="p-3.5 rounded-xl bg-[var(--app-muted)]/50 border border-[var(--app-border)] text-sm space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--app-text)] flex items-center gap-1.5">
              <span>{weatherIcon(task.weather_context.weather_condition)}</span>
              Weather · {task.weather_context.location}
            </span>
            <span className="text-[var(--app-text-muted)]">
              {task.weather_context.weather_condition}
              {task.weather_context.temperature != null && ` · ${task.weather_context.temperature}°C`}
            </span>
          </div>
          <p className="text-[var(--app-text-secondary)] leading-relaxed">
            {task.weather_context.explanation}
          </p>
        </div>
      )}

      {/* Reason Bullets */}
      {task.reason_bullets?.length > 0 && (
        <div className="space-y-1.5">
          <ul className="space-y-1 text-sm text-[var(--app-text-secondary)]">
            {task.reason_bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#2563EB] font-bold">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overall Explanation */}
      {task.overall_explanation && (
        <div className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] text-sm text-[var(--app-text-secondary)] leading-relaxed">
          {task.overall_explanation}
        </div>
      )}
      </div>
      </details>
      )}

      {/* Contrastive Why-Not Panel */}
      <WhyNotPanel whyNot={task.why_not} />

      {/* Optional score details */}
      {factors.length > 0 && (
        <details className="pt-2 border-t border-[var(--app-border)]">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">View score breakdown</summary>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {factors
              .filter((f) => f.label)
              .map((factor) => {
                const weight =
                  factor.key === 'importance'
                    ? 0.4
                    : factor.key === 'urgency'
                    ? 0.3
                    : factor.key === 'time_availability'
                    ? 0.2
                    : 0.1;
                return (
                  <div
                    key={factor.key}
                    className="p-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-muted)]/30"
                  >
                    <FactorBar
                      label={factor.label}
                      factorKey={factor.key}
                      value={factor.value}
                      weight={weight}
                      showFormula={true}
                    />
                  </div>
                );
              })}
          </div>
        </details>
      )}

      {/* Recommended Action Pill */}
      {task.recommendation && (
        <div className="pt-2 border-t border-[var(--app-border)] flex items-center gap-2 text-xs font-semibold text-[#22C55E]">
          <span>Next step:</span>
          <span className="text-[var(--app-text-secondary)] font-normal">{task.recommendation}</span>
        </div>
      )}
    </div>
  );
}

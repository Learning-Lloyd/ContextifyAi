import { FiCloud, FiInfo, FiZap } from 'react-icons/fi';

export default function AiExplanationPanel({ explanation, weatherContext }) {
  if (!explanation) return null;

  const sourceLabel = explanation.source === 'ai' ? 'AI-generated' : 'Rule-based';

  return (
    <div className="card p-6 space-y-4 border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.03)] animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="section-title flex items-center gap-2">
          <FiZap className="text-[#2563EB]" size={18} />
          AI Explanation
        </h2>
        <span className="badge badge-primary text-xs">{sourceLabel}</span>
      </div>

      <p className="text-sm text-[var(--app-text)] leading-relaxed">{explanation.summary}</p>

      {explanation.top_task_explanation && (
        <div className="card-kpi p-4">
          <p className="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wide mb-1">
            Top-ranked task
          </p>
          <p className="text-sm text-[var(--app-text-secondary)] leading-relaxed">
            {explanation.top_task_explanation}
          </p>
        </div>
      )}

      {explanation.productivity_tips?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[var(--app-text)] mb-2">Productivity tips</p>
          <ul className="space-y-1.5">
            {explanation.productivity_tips.map((tip) => (
              <li key={tip} className="text-sm text-[var(--app-text-secondary)] flex items-start gap-2">
                <FiInfo className="text-[#2563EB] shrink-0 mt-0.5" size={14} />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(explanation.weather_advice || weatherContext) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(20,184,166,0.08)] border border-[rgba(20,184,166,0.2)]">
          <FiCloud className="text-[#14B8A6] shrink-0 mt-0.5" size={16} />
          <div className="text-sm">
            {weatherContext?.location && (
              <p className="font-medium text-[var(--app-text)]">{weatherContext.location}</p>
            )}
            {weatherContext?.weather_condition && (
              <p className="text-[var(--app-text-muted)] text-xs">
                {weatherContext.weather_condition}
                {weatherContext.temperature != null ? ` · ${weatherContext.temperature}°C` : ''}
              </p>
            )}
            {explanation.weather_advice && (
              <p className="text-[var(--app-text-secondary)] mt-1">{explanation.weather_advice}</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--app-text-muted)] border-t border-[var(--app-border)] pt-3">
        Scores and rankings are computed by the deterministic formula. This explanation does not modify them.
      </p>
    </div>
  );
}

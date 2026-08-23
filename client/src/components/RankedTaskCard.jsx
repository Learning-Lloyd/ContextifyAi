import PriorityBadge from './PriorityBadge';
import DecisionConfidenceBadge from './DecisionConfidenceBadge';
import WhyNotPanel from './WhyNotPanel';
import { weatherIcon } from '../utils/taskUtils';

export default function RankedTaskCard({ task }) {
  const breakdown = task.factor_breakdown || {};
  const factors = breakdown.factors || [];

  return (
    <div className="card p-5 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <span className="text-2xl font-bold text-[#2563EB]">#{task.rank}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-[var(--app-text)]">{task.title}</h3>
              <PriorityBadge level={task.priority_level} score={task.priority_score} />
              {task.rank_confidence && <DecisionConfidenceBadge confidence={task.rank_confidence} />}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--app-text-muted)]">
              {task.due_date && (
                <span>Due: {task.due_date}{task.due_time ? ` ${task.due_time}` : ''}</span>
              )}
              {task.countdown && <span className="text-[#2563EB]">{task.countdown}</span>}
              {task.location && <span>{task.location}</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--app-text-secondary)]">Priority Score</p>
          <p className="text-2xl font-bold text-[var(--app-text)]">{task.priority_score}</p>
          <div className="score-bar w-32 mt-2 ml-auto">
            <div className="score-bar-fill" style={{ width: `${task.priority_score * 10}%` }} />
          </div>
        </div>
      </div>

      {task.weather_context && (
        <div className="card-kpi">
          <p className="text-sm font-medium text-[var(--app-text)] mb-2">Weather Context</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{weatherIcon(task.weather_context.weather_condition)}</span>
            <div>
              <p className="font-medium text-sm">{task.weather_context.location}</p>
              <p className="text-sm text-[var(--app-text-secondary)]">
                {task.weather_context.weather_condition}
                {task.weather_context.temperature != null && ` · ${task.weather_context.temperature}°C`}
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--app-text-secondary)]">{task.weather_context.explanation}</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1 italic">{task.weather_context.disclaimer}</p>
        </div>
      )}

      {task.reason_bullets?.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[var(--app-text)] mb-2">Reason</p>
          <ul className="space-y-1 text-sm text-[var(--app-text-secondary)]">
            {task.reason_bullets.map((bullet) => (
              <li key={bullet}>• {bullet}</li>
            ))}
          </ul>
        </div>
      )}

      {task.overall_explanation && (
        <div className="card-kpi">
          <p className="text-sm font-medium text-[var(--app-text)] mb-1">Overall Explanation</p>
          <p className="text-sm text-[var(--app-text-secondary)] leading-relaxed">{task.overall_explanation}</p>
        </div>
      )}

      <WhyNotPanel whyNot={task.why_not} />

      {factors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[var(--app-text)] mb-2">Factor Breakdown</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {factors.filter((f) => f.label).map((factor) => (
              <div key={factor.key} className="card-kpi p-3 text-sm">
                <p className="font-medium">{factor.label}</p>
                <p className="text-[var(--app-text-secondary)]">{factor.formula}</p>
              </div>
            ))}
          </div>
          {breakdown.final_score != null && (
            <div className="mt-3 flex justify-between items-center card-kpi">
              <span className="font-semibold text-sm">Final Score</span>
              <span className="text-xl font-bold text-[#2563EB]">{breakdown.final_score}</span>
            </div>
          )}
        </div>
      )}

      {task.recommendation && (
        <p className="text-sm text-[#22C55E] border-t border-[var(--app-border)] pt-3">
          ✔ {task.recommendation}
        </p>
      )}
    </div>
  );
}

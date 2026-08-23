import { weatherIcon } from '../utils/taskUtils';
import DecisionConfidenceBadge from './DecisionConfidenceBadge';

export default function DecisionSummaryCard({ summary, confidence }) {
  if (!summary) return null;

  const kpis = [
    { label: 'Tasks Selected', value: summary.tasks_analyzed },
    {
      label: 'Highest Priority',
      value: summary.highest_priority?.title ?? '—',
      sub: summary.highest_priority?.score != null ? `Score: ${summary.highest_priority.score}` : null,
    },
    {
      label: 'Weather',
      value: (
        <span className="flex items-center gap-2 text-base font-semibold">
          {weatherIcon(summary.weather)} {summary.weather}
        </span>
      ),
    },
    {
      label: 'Recommendation',
      value: summary.recommendation_summary,
      wide: true,
    },
  ];

  if (confidence) {
    kpis.push({
      label: 'Confidence',
      value: <DecisionConfidenceBadge confidence={confidence} showGap />,
    });
  }

  return (
    <div className="card p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="section-title text-xl">Decision Summary</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`card-kpi ${kpi.wide ? 'sm:col-span-2 lg:col-span-1' : ''}`}
          >
            <p className="card-kpi-label">{kpi.label}</p>
            <div className="mt-1 text-sm font-semibold text-[var(--app-text)] leading-relaxed">
              {kpi.value}
            </div>
            {kpi.sub && <p className="text-xs text-[var(--app-text-muted)] mt-1">{kpi.sub}</p>}
          </div>
        ))}
        <div className="card-kpi">
          <p className="card-kpi-label">Deadline Conflicts</p>
          <p className="card-kpi-value text-[#F59E0B]">{summary.potential_deadline_conflicts}</p>
        </div>
        <div className="card-kpi">
          <p className="card-kpi-label">Lowest Priority</p>
          <p className="font-semibold text-[var(--app-text)]">{summary.lowest_priority?.title ?? '—'}</p>
          <p className="text-xs text-[var(--app-text-muted)] mt-1">
            Score: {summary.lowest_priority?.score ?? '—'}
          </p>
        </div>
      </div>

      {confidence?.explanation && (
        <p className="text-sm text-[var(--app-text-secondary)] border-t border-[var(--app-border)] pt-4">
          {confidence.explanation}
        </p>
      )}
    </div>
  );
}

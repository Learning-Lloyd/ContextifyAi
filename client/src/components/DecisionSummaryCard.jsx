import { FiAlertTriangle, FiAward, FiCheckCircle, FiCloud, FiList } from 'react-icons/fi';
import { weatherIcon } from '../utils/taskUtils';
import DecisionConfidenceBadge from './DecisionConfidenceBadge';

export default function DecisionSummaryCard({ summary, confidence }) {
  if (!summary) return null;

  return (
    <div className="card p-6 space-y-5 animate-fade-in shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--app-border)] pb-3">
        <div>
          <h2 className="text-base font-bold text-[var(--app-text)]">Multi-Task Decision Summary</h2>
          <p className="text-xs text-[var(--app-text-muted)]">
            High-level overview of multi-factor contextual ranking results
          </p>
        </div>
        {confidence && <DecisionConfidenceBadge confidence={confidence} showGap />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Analyzed */}
        <div className="card-kpi p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--app-text-muted)] mb-1">
            <span className="card-kpi-label text-[10px]">Tasks Analyzed</span>
            <FiList size={14} className="text-[#2563EB]" />
          </div>
          <p className="text-2xl font-bold text-[var(--app-text)]">{summary.tasks_analyzed}</p>
        </div>

        {/* Top Priority Task */}
        <div className="card-kpi p-3.5 col-span-2 flex flex-col justify-between border-l-2 border-l-[#2563EB]">
          <div className="flex items-center justify-between text-[var(--app-text-muted)] mb-1">
            <span className="card-kpi-label text-[10px] text-[#2563EB]">Top Priority Task</span>
            <FiAward size={14} className="text-[#2563EB]" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-[var(--app-text)] truncate">
              {summary.highest_priority?.title ?? '—'}
            </p>
            {summary.highest_priority?.score != null && (
              <span className="text-xs font-bold text-[#2563EB] font-mono shrink-0">
                Score {summary.highest_priority.score}
              </span>
            )}
          </div>
        </div>

        {/* Conflicts */}
        <div className="card-kpi p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--app-text-muted)] mb-1">
            <span className="card-kpi-label text-[10px]">Conflicts</span>
            <FiAlertTriangle
              size={14}
              className={summary.potential_deadline_conflicts > 0 ? 'text-[#F59E0B]' : 'text-[var(--app-text-muted)]'}
            />
          </div>
          <p
            className={`text-2xl font-bold ${
              summary.potential_deadline_conflicts > 0 ? 'text-[#F59E0B]' : 'text-[var(--app-text)]'
            }`}
          >
            {summary.potential_deadline_conflicts}
          </p>
        </div>

        {/* Weather */}
        <div className="card-kpi p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--app-text-muted)] mb-1">
            <span className="card-kpi-label text-[10px]">Weather</span>
            <FiCloud size={14} className="text-[#14B8A6]" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text)] truncate">
            <span>{weatherIcon(summary.weather)}</span>
            <span className="truncate">{summary.weather || 'Clear'}</span>
          </div>
        </div>

        {/* Lowest Priority */}
        <div className="card-kpi p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--app-text-muted)] mb-1">
            <span className="card-kpi-label text-[10px]">Lowest Priority</span>
          </div>
          <p className="text-xs font-semibold text-[var(--app-text-secondary)] truncate">
            {summary.lowest_priority?.title ?? '—'}
          </p>
          <span className="text-[10px] text-[var(--app-text-muted)] font-mono">
            Score: {summary.lowest_priority?.score ?? '—'}
          </span>
        </div>
      </div>

      {/* Recommendation & Narrative */}
      {summary.recommendation_summary && (
        <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-[#2563EB]/20 flex items-start gap-2.5 text-xs sm:text-sm">
          <FiCheckCircle className="text-[#2563EB] shrink-0 mt-0.5" size={16} />
          <p className="text-[var(--app-text)] font-medium leading-relaxed">
            {summary.recommendation_summary}
          </p>
        </div>
      )}

      {confidence?.explanation && (
        <p className="text-xs text-[var(--app-text-muted)] pt-2 border-t border-[var(--app-border)]">
          {confidence.explanation}
        </p>
      )}
    </div>
  );
}

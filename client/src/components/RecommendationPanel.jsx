import { FiCheckCircle, FiList } from 'react-icons/fi';

export default function RecommendationPanel({ recommendation }) {
  if (!recommendation) return null;

  return (
    <div className="card p-6 space-y-4 animate-fade-in shadow-sm">
      <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--app-border)]">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 text-[#22C55E] flex items-center justify-center">
          <FiCheckCircle size={16} />
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--app-text)]">Recommended Execution Sequence</h2>
          <p className="text-xs text-[var(--app-text-muted)]">
            Suggested workflow order based on contextual score prioritization
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {recommendation.sequence?.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-xl bg-[var(--app-muted)]/40 border border-[var(--app-border)]"
          >
            <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <span className="text-sm text-[var(--app-text)] font-medium leading-relaxed">
              {step}
            </span>
          </div>
        ))}
      </div>

      {recommendation.reason && (
        <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-[#2563EB]/20 text-xs text-[var(--app-text-secondary)] leading-relaxed">
          <strong className="text-[var(--app-text)] block mb-0.5">Underlying Rationale:</strong>
          {recommendation.reason}
        </div>
      )}
    </div>
  );
}

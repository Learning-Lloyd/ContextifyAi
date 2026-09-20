import { FiHelpCircle } from 'react-icons/fi';

export default function WhyNotPanel({ whyNot }) {
  if (!whyNot) return null;

  return (
    <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/[0.04] p-4 space-y-2.5 text-xs sm:text-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-[#D97706] dark:text-[#FBBF24]">
          <FiHelpCircle size={15} />
          <span>Why Wasn&apos;t This Ranked Higher?</span>
        </div>
        {whyNot.reference_task && (
          <span className="text-xs text-[var(--app-text-muted)] bg-[var(--app-card)] px-2 py-0.5 rounded-full border border-[var(--app-border)]">
            vs #{whyNot.reference_task.rank} {whyNot.reference_task.title} (Score: {whyNot.reference_task.score})
          </span>
        )}
      </div>

      {whyNot.why_not_summary && (
        <p className="text-[var(--app-text-secondary)] leading-relaxed font-medium">
          {whyNot.why_not_summary}
        </p>
      )}

      {whyNot.why_not_bullets?.length > 0 && (
        <ul className="space-y-1 text-xs text-[var(--app-text-secondary)] pl-2">
          {whyNot.why_not_bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-[#F59E0B] font-bold shrink-0">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {whyNot.score_gap != null && (
        <div className="pt-2 border-t border-[#F59E0B]/20 flex items-center justify-between text-[11px] text-[var(--app-text-muted)]">
          <span>Mathematical distance to adjacent rank:</span>
          <span className="font-bold text-[var(--app-text)] font-mono">{whyNot.score_gap} pts</span>
        </div>
      )}
    </div>
  );
}

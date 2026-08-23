export default function WhyNotPanel({ whyNot }) {
  if (!whyNot) return null;

  return (
    <div className="card-kpi border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.04)] space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-[#D97706] dark:text-[#FBBF24]">Why Not Higher?</p>
        {whyNot.reference_task && (
          <span className="text-xs text-[var(--app-text-muted)]">
            vs #{whyNot.reference_task.rank} {whyNot.reference_task.title} ({whyNot.reference_task.score})
          </span>
        )}
      </div>
      {whyNot.why_not_summary && (
        <p className="text-sm text-[var(--app-text-secondary)] leading-relaxed">{whyNot.why_not_summary}</p>
      )}
      {whyNot.why_not_bullets?.length > 0 && (
        <ul className="space-y-1 text-sm text-[var(--app-text-secondary)]">
          {whyNot.why_not_bullets.map((bullet) => (
            <li key={bullet}>• {bullet}</li>
          ))}
        </ul>
      )}
      {whyNot.score_gap != null && (
        <p className="text-xs text-[var(--app-text-muted)]">Score gap to next rank: {whyNot.score_gap} points</p>
      )}
    </div>
  );
}

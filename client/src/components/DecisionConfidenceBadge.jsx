const STYLES = {
  high: 'badge-success',
  medium: 'badge-warning',
  low: 'badge-neutral',
};

export default function DecisionConfidenceBadge({ confidence, showGap = false }) {
  if (!confidence) return null;

  const level = confidence.level || confidence;
  const style = STYLES[level] || STYLES.medium;

  return (
    <span className={`badge ${style} inline-flex items-center gap-1.5 font-medium text-xs`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>Confidence: <strong className="capitalize">{level}</strong></span>
      {showGap && confidence.score_gap != null && (
        <span className="opacity-80 font-mono text-[10px]">({confidence.score_gap} pt gap)</span>
      )}
    </span>
  );
}

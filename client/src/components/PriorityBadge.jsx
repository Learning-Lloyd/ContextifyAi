export default function PriorityBadge({ level, score }) {
  const normalizedLevel = level?.toLowerCase() || 'medium';

  const badgeClass =
    normalizedLevel === 'high'
      ? 'score-badge-high'
      : normalizedLevel === 'medium'
      ? 'score-badge-medium'
      : 'score-badge-low';

  const label =
    normalizedLevel === 'high'
      ? 'High Priority'
      : normalizedLevel === 'medium'
      ? 'Medium Priority'
      : 'Low Priority';

  return (
    <span className={`badge ${badgeClass} inline-flex items-center gap-1.5 font-medium`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      <span>{label}</span>
      {score != null && <span className="opacity-75 font-semibold font-mono">({score})</span>}
    </span>
  );
}

const STYLES = {
  high: 'badge-success',
  medium: 'badge-warning',
  low: 'badge-danger',
};

export default function DecisionConfidenceBadge({ confidence, showGap = false }) {
  if (!confidence) return null;

  const level = confidence.level || confidence;
  const style = STYLES[level] || STYLES.low;

  return (
    <span className={`badge ${style}`}>
      Confidence: {level}
      {showGap && confidence.score_gap != null && (
        <span className="opacity-75">({confidence.score_gap} pt gap)</span>
      )}
    </span>
  );
}

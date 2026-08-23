import { PRIORITY_COLORS } from '../utils/taskUtils';

export default function PriorityBadge({ level, score }) {
  const color = PRIORITY_COLORS[level] || PRIORITY_COLORS.medium;

  return (
    <span className={`badge ${color}`}>
      {level?.charAt(0).toUpperCase()}{level?.slice(1)} Priority
      {score != null && <span className="opacity-75">({score})</span>}
    </span>
  );
}

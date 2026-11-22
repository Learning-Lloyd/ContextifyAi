import PriorityBadge from './PriorityBadge';

export default function PriorityGuide() {
  return (
    <aside className="priority-guide" aria-label="Official priority score guide">
      <span className="priority-guide-title">Official priority levels</span>
      <span className="priority-guide-item"><PriorityBadge level="high" /> <span>8–10</span></span>
      <span className="priority-guide-item"><PriorityBadge level="medium" /> <span>5–&lt;8</span></span>
      <span className="priority-guide-item"><PriorityBadge level="low" /> <span>&lt;5</span></span>
      <span className="priority-guide-note">Level is the score category; rank is the task’s position by score, with earlier deadlines breaking ties.</span>
    </aside>
  );
}

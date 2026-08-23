export function suggestUrgencyFromDueDate(dueDate) {
  if (!dueDate) return 5;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dueDate);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.round((deadline - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 10;
  if (diffDays === 0) return 10;
  if (diffDays === 1) return 8;
  if (diffDays <= 3) return 6;
  if (diffDays <= 7) return 4;
  return 3;
}

export function getDeadlineGroup(dueDate) {
  if (!dueDate) return 'upcoming';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dueDate);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.round((deadline - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return 'upcoming';
}

export function getCountdownLabel(dueDate, dueTime) {
  if (!dueDate) return null;

  const deadline = new Date(`${dueDate}T${dueTime || '23:59'}`);
  const now = new Date();
  if (deadline < now) return 'Overdue';

  const diffMs = deadline - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
  return 'Due soon';
}

export function getPriorityLevel(score) {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

export const PRIORITY_COLORS = {
  high: 'badge badge-danger',
  medium: 'badge badge-warning',
  low: 'badge badge-success',
};

export function weatherIcon(condition = '') {
  const value = condition.toLowerCase();
  if (value.includes('rain') || value.includes('drizzle') || value.includes('thunder')) return '🌧️';
  if (value.includes('snow')) return '❄️';
  if (value.includes('clear')) return '☀️';
  if (value.includes('partly')) return '⛅';
  if (value.includes('fog')) return '🌫️';
  return '☁️';
}

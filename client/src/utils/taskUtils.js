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
  const diffMs = deadline - now;
  if (diffMs < 0) {
    const overdue = Math.abs(diffMs);
    if (overdue >= 86400000) {
      const days = Math.floor(overdue / 86400000);
      return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
    }
    if (overdue >= 3600000) {
      const hours = Math.floor(overdue / 3600000);
      return `Overdue by ${hours} hour${hours === 1 ? '' : 's'}`;
    }
    const minutes = Math.max(1, Math.floor(overdue / 60000));
    return `Overdue by ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  if (diffMs >= 86400000) {
    const days = Math.floor(diffMs / 86400000);
    return days === 1 ? 'Due tomorrow' : days >= 7 ? `Due in ${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}` : `Due in ${days} days`;
  }
  if (diffMs >= 3600000) {
    const hours = Math.ceil(diffMs / 3600000);
    return `Due in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (diffMs >= 60000) {
    const minutes = Math.ceil(diffMs / 60000);
    return `Due in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return 'Due now';
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

export function minutesToHours(value) {
  if (value === null || value === undefined || value === '') return '';
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  return Number((minutes / 60).toFixed(2));
}

export function hoursToMinutes(value) {
  if (value === null || value === undefined || value === '') return null;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(hours * 60);
}

export function formatMinutesAsHours(value, compact = false) {
  if (value === null || value === undefined || value === '') return '—';
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes < 0) return '—';
  const hours = Number((minutes / 60).toFixed(2));
  const amount = String(hours);
  if (compact) return `${amount} h`;
  return `${amount} ${hours === 1 ? 'hour' : 'hours'}`;
}

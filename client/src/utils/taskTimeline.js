export function timelineDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function buildTimelineWeek(weekStart, tasks = []) {
  const firstDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + index);
    const key = timelineDateKey(date);
    const dayTasks = tasks.filter((task) => task.scheduled_start_date === key);
    const withoutTime = dayTasks.filter((task) => !task.scheduled_start_time);
    const timed = dayTasks.filter((task) => task.scheduled_start_time).map((task) => {
      const [hours, minutes] = String(task.scheduled_start_time).slice(0, 5).split(':').map(Number);
      const startMinutes = (hours * 60) + minutes;
      const rawDuration = Number(task.estimated_time_minutes);
      const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null;
      return { task, startMinutes, durationMinutes };
    }).sort((left, right) => left.startMinutes - right.startMinutes || Number(left.task.id) - Number(right.task.id));

    const laneEndMinutes = [];
    const placed = timed.map((item) => {
      let lane = laneEndMinutes.findIndex((end) => end <= item.startMinutes);
      if (lane < 0) lane = laneEndMinutes.length;
      laneEndMinutes[lane] = item.startMinutes + (item.durationMinutes || 30);
      const endMinutes = item.durationMinutes === null ? null : item.startMinutes + item.durationMinutes;
      const visualMinutes = item.durationMinutes || 45;
      const topPercent = (item.startMinutes / 1440) * 100;
      const heightPercent = Math.min((visualMinutes / 1440) * 100, 100 - topPercent);
      const endTime = endMinutes === null ? null : `${String(Math.floor(endMinutes % 1440 / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      return { ...item, lane, endMinutes, endTime, continuesNextDay: endMinutes !== null && endMinutes > 1440, topPercent, heightPercent };
    });
    const laneCount = Math.max(1, laneEndMinutes.length);

    return { date, key, tasks: dayTasks, withoutTime, placed: placed.map((item) => ({ ...item, laneCount })) };
  });

  return { days, unscheduled: tasks.filter((task) => !task.scheduled_start_date) };
}

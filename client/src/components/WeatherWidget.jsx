import { weatherIcon } from '../utils/taskUtils';

export default function WeatherWidget({ weather, compact = false }) {
  if (!weather) {
    return (
      <div className="card p-6">
        <p className="text-sm text-[var(--app-text-secondary)]">
          Save your city in Profile settings to see weather on your dashboard.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xl">{weatherIcon(weather.weather_condition)}</span>
        <div>
          <p className="font-semibold text-sm">{weather.location || 'Current City'}</p>
          <p className="text-sm text-[var(--app-text-secondary)]">
            {weather.temperature}°C · {weather.weather_condition}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--app-text-secondary)]">Today&apos;s Weather</p>
          <p className="text-lg font-semibold">{weather.location || 'Current City'}</p>
        </div>
        <span className="text-3xl">{weatherIcon(weather.weather_condition)}</span>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-[var(--app-text)]">{weather.temperature}°C</p>
        <p className="text-[var(--app-text-secondary)] mb-1 text-sm">{weather.weather_condition}</p>
      </div>
      {weather.rain_probability != null && (
        <p className="text-sm text-[#2563EB]">Chance of Rain: {weather.rain_probability}%</p>
      )}
      {weather.forecast?.length > 0 && (
        <div className="grid grid-cols-5 gap-2 pt-3 border-t border-[var(--app-border)]">
          {weather.forecast.slice(0, 5).map((day) => (
            <div key={day.date} className="text-center text-xs">
              <p className="text-[var(--app-text-muted)]">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </p>
              <p className="text-base my-1">{weatherIcon(day.weather_condition)}</p>
              <p className="font-medium text-[var(--app-text)]">{day.temperature_max}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

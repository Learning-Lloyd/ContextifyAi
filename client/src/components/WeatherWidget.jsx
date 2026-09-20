import { FiInfo, FiMapPin } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { weatherIcon } from '../utils/taskUtils';

export default function WeatherWidget({ weather, compact = false }) {
  if (!weather) {
    return (
      <div className="card p-5 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--app-muted)] flex items-center justify-center text-[var(--app-text-muted)] shrink-0">
            <FiMapPin size={16} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--app-text)]">Weather Context</h4>
            <p className="text-xs text-[var(--app-text-secondary)] mt-1">
              Set your city in{' '}
              <Link to="/profile" className="text-[#2563EB] hover:underline font-medium">
                Profile
              </Link>{' '}
              to receive location-based weather advisories.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-[var(--app-text-secondary)]">
        <span className="text-base">{weatherIcon(weather.weather_condition)}</span>
        <span className="font-medium text-[var(--app-text)]">{weather.location || 'Current City'}</span>
        <span className="text-[var(--app-text-muted)]">·</span>
        <span>{weather.temperature}°C</span>
        <span className="text-[var(--app-text-muted)]">·</span>
        <span>{weather.weather_condition}</span>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4 animate-fade-in relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
            Weather Context
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FiMapPin size={13} className="text-[#2563EB]" />
            <h4 className="text-base font-bold text-[var(--app-text)]">
              {weather.location || 'Current City'}
            </h4>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-[var(--app-muted)] flex items-center justify-center text-2xl shrink-0 shadow-inner">
          {weatherIcon(weather.weather_condition)}
        </div>
      </div>

      {/* Main Temperature Display */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-extrabold tracking-tight text-[var(--app-text)]">
          {weather.temperature}°C
        </span>
        <span className="text-sm font-medium text-[var(--app-text-secondary)]">
          {weather.weather_condition}
        </span>
        {weather.rain_probability != null && (
          <span className="ml-auto text-xs font-semibold text-[#2563EB] bg-blue-500/10 px-2 py-0.5 rounded-full">
            💧 {weather.rain_probability}% rain
          </span>
        )}
      </div>

      {/* 5-day forecast mini-strip */}
      {weather.forecast?.length > 0 && (
        <div className="pt-3 border-t border-[var(--app-border)]">
          <div className="grid grid-cols-5 gap-1.5 text-center">
            {weather.forecast.slice(0, 5).map((day) => (
              <div
                key={day.date}
                className="p-1.5 rounded-lg hover:bg-[var(--app-hover)] transition-colors text-xs"
              >
                <p className="text-[11px] text-[var(--app-text-muted)] font-medium">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </p>
                <p className="text-base my-1">{weatherIcon(day.weather_condition)}</p>
                <p className="font-semibold text-[11px] text-[var(--app-text)]">
                  {day.temperature_max}°
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advisory disclaimer */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--app-text-muted)] pt-1">
        <FiInfo size={12} className="text-[var(--app-text-muted)] shrink-0" />
        <span>Advisory only — does not alter deterministic task priority scores.</span>
      </div>
    </div>
  );
}

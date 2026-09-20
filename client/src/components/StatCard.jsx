import { FiCheckCircle, FiClock, FiList, FiStar, FiTrendingUp } from 'react-icons/fi';

const icons = {
  total: FiList,
  completed: FiCheckCircle,
  pending: FiClock,
  average: FiTrendingUp,
  highest: FiStar,
};

const iconBoxes = {
  total: 'icon-box-blue',
  completed: 'icon-box-green',
  pending: 'icon-box-amber',
  average: 'icon-box-teal',
  highest: 'icon-box-blue',
};

export default function StatCard({
  title,
  value,
  type = 'total',
  subtitle,
  trend,
  accent = false,
  compact = false,
  onClick,
}) {
  const Icon = icons[type] || FiList;
  const iconBox = iconBoxes[type] || iconBoxes.total;

  return (
    <div
      onClick={onClick}
      className={`card card-hover animate-fade-in ${
        compact ? 'p-4' : 'p-5'
      } ${accent ? 'card-accent-left' : ''} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="card-kpi-label text-xs uppercase tracking-wider text-[var(--app-text-muted)] font-semibold">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight text-[var(--app-text)]`}>
              {value}
            </p>
            {trend && (
              <span
                className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                  trend.direction === 'up'
                    ? 'text-[#22C55E]'
                    : trend.direction === 'down'
                    ? 'text-[#EF4444]'
                    : 'text-[var(--app-text-muted)]'
                }`}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '•'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--app-text-secondary)] mt-1.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`icon-box ${iconBox} shrink-0 ${compact ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg'}`}>
          <Icon />
        </div>
      </div>
    </div>
  );
}

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

export default function StatCard({ title, value, type = 'total', subtitle }) {
  const Icon = icons[type] || FiList;
  const iconBox = iconBoxes[type] || iconBoxes.total;

  return (
    <div className="card-kpi card-hover animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="card-kpi-label">{title}</p>
          <p className="card-kpi-value">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--app-text-muted)] mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`icon-box ${iconBox} shrink-0`}>
          <Icon />
        </div>
      </div>
    </div>
  );
}

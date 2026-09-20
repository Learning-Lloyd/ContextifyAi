const WEIGHT_LABELS = {
  0.4: '40%',
  0.3: '30%',
  0.2: '20%',
  0.1: '10%',
};

const FACTOR_COLORS = {
  importance: '#2563EB',
  urgency: '#F59E0B',
  time_availability: '#14B8A6',
  current_workload: '#64748B',
};

export default function FactorBar({ label, factorKey, value, weight, showFormula = false }) {
  const numValue = Number(value) || 0;
  const numWeight = Number(weight) || 0;
  const weighted = (numValue * numWeight).toFixed(2);
  const fillPercent = (numValue / 10) * 100;
  const color = FACTOR_COLORS[factorKey] || '#2563EB';
  const weightLabel = WEIGHT_LABELS[numWeight] || `${(numWeight * 100).toFixed(0)}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--app-text)]">{label}</span>
        <div className="flex items-center gap-2 text-xs">
          {showFormula && (
            <span className="text-[var(--app-text-muted)]">
              {numValue} × {weightLabel} = <span className="font-semibold text-[var(--app-text)]">{weighted}</span>
            </span>
          )}
          {!showFormula && (
            <span className="font-semibold" style={{ color }}>{numValue}<span className="text-[var(--app-text-muted)] font-normal">/10</span></span>
          )}
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--app-muted)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${fillPercent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

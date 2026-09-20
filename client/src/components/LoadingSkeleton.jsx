function Bone({ className = '', style }) {
  return (
    <div
      className={`rounded bg-[var(--app-muted)] animate-pulse ${className}`}
      style={style}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card-kpi animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Bone className="h-3 w-20" />
          <Bone className="h-7 w-16" />
        </div>
        <Bone className="h-10 w-10 rounded-lg shrink-0" />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start gap-4">
        <Bone className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-14 rounded-full" />
          </div>
          <Bone className="h-5 w-3/4" />
          <Bone className="h-4 w-1/2" />
          <div className="flex gap-3 mt-2">
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <Bone className="h-4 w-full" style={{ maxWidth: `${60 + Math.random() * 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card p-6 animate-fade-in">
      <Bone className="h-5 w-40 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <Bone
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function LoadingSkeleton({ variant = 'card', count = 1, cols }) {
  const items = Array.from({ length: count });

  if (variant === 'stat-card') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }

  if (variant === 'task-card') {
    return (
      <div className="space-y-4">
        {items.map((_, i) => <TaskCardSkeleton key={i} />)}
      </div>
    );
  }

  if (variant === 'table-row') {
    return items.map((_, i) => <TableRowSkeleton key={i} cols={cols} />);
  }

  if (variant === 'chart') {
    return <ChartSkeleton />;
  }

  return (
    <div className="space-y-4">
      {items.map((_, i) => (
        <div key={i} className="card p-5 animate-fade-in">
          <Bone className="h-5 w-1/3 mb-3" />
          <Bone className="h-4 w-full mb-2" />
          <Bone className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

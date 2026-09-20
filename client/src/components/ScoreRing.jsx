const SIZES = {
  sm: { size: 40, stroke: 3, fontSize: '0.75rem', fontWeight: 700 },
  md: { size: 56, stroke: 3.5, fontSize: '1rem', fontWeight: 700 },
  lg: { size: 80, stroke: 4, fontSize: '1.5rem', fontWeight: 700 },
};

function getScoreColor(score) {
  if (score >= 8) return { ring: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' };
  if (score >= 5) return { ring: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
  return { ring: '#94A3B8', bg: 'rgba(148, 163, 184, 0.1)' };
}

export default function ScoreRing({ score, variant = 'md', className = '' }) {
  const numScore = Number(score) || 0;
  const config = SIZES[variant] || SIZES.md;
  const { ring, bg } = getScoreColor(numScore);

  const radius = (config.size - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(numScore / 10, 1);
  const dashOffset = circumference * (1 - progress);
  const center = config.size / 2;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: config.size, height: config.size }}
      role="img"
      aria-label={`Priority score ${numScore}`}
    >
      <svg
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={bg}
          stroke="var(--app-border)"
          strokeWidth={config.stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ring}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span
        className="absolute"
        style={{
          fontSize: config.fontSize,
          fontWeight: config.fontWeight,
          color: ring,
          lineHeight: 1,
        }}
      >
        {numScore}
      </span>
    </div>
  );
}

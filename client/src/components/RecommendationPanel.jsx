export default function RecommendationPanel({ recommendation }) {
  if (!recommendation) return null;

  return (
    <div className="card p-6 animate-fade-in">
      <h2 className="section-title mb-4">Recommended Action</h2>
      <ol className="space-y-2 mb-4">
        {recommendation.sequence?.map((step, index) => (
          <li key={index} className="text-sm text-[var(--app-text)] flex gap-2">
            <span className="text-[#2563EB] font-semibold shrink-0">{index + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
      <div className="card-kpi">
        <p className="text-sm text-[var(--app-text-secondary)] mb-1">Reason</p>
        <p className="text-sm text-[var(--app-text)]">{recommendation.reason}</p>
      </div>
    </div>
  );
}

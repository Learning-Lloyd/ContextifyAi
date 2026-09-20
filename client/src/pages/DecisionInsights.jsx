import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiAward } from 'react-icons/fi';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { decisionService } from '../services/decisionService';

const COLORS = ['#2563EB', '#14B8A6', '#F59E0B'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="card p-2.5 shadow-xl text-xs border border-[var(--app-border)]">
        <p className="font-bold text-[var(--app-text)]">{label || payload[0].name}</p>
        <p className="text-[#2563EB] font-mono font-semibold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function DecisionInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    decisionService
      .getInsights()
      .then((res) => setInsights(res.insights))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="h-10 w-48 bg-[var(--app-muted)] rounded animate-pulse" />
          <LoadingSkeleton variant="stat-card" count={4} />
          <div className="grid lg:grid-cols-2 gap-6">
            <LoadingSkeleton variant="chart" />
            <LoadingSkeleton variant="chart" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!insights) {
    return (
      <Layout>
        <EmptyState
          title="Insights Unavailable"
          description="Unable to load decision trends. Run some analyses in Decision Lab to generate data."
        />
      </Layout>
    );
  }

  const confidenceData = Object.entries(insights.confidence_distribution || {}).map(([level, count]) => ({
    level,
    count,
  }));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div className="pb-2 border-b border-[var(--app-border)]">
          <h1 className="page-title">Decision Insights & Patterns</h1>
          <p className="page-subtitle text-xs sm:text-sm">
            Aggregated patterns, confidence ratios, and frequency trends across past decisions
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Analyses" value={insights.total_analyses} type="total" accent />
          <StatCard title="A/B Comparisons" value={insights.total_comparisons} type="average" />
          <StatCard title="Avg Tasks / Run" value={insights.avg_tasks_per_analysis} type="pending" />
          <StatCard
            title="Conflicts Flagged"
            value={insights.total_conflicts_detected}
            type={insights.total_conflicts_detected > 0 ? 'highest' : 'completed'}
          />
        </div>

        {/* Highlight Banner: Frequent Top Task */}
        {insights.most_frequent_top_task && (
          <div className="card p-5 bg-blue-500/[0.04] border-l-4 border-l-[#2563EB] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center shrink-0">
                <FiAward size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                  Most Frequently Top-Ranked Priority
                </p>
                <p className="text-base font-bold text-[var(--app-text)] mt-0.5">
                  {insights.most_frequent_top_task}
                </p>
              </div>
            </div>
            <span className="badge badge-primary text-xs font-semibold shrink-0">
              Top Priority
            </span>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Analyses by Month
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Frequency of decision analyses conducted over time
              </p>
            </div>
            <div className="pt-2">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={insights.monthly_analyses || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--app-text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--app-text-muted)" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Comparison Confidence Distribution
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Confidence levels calculated from score distance thresholds
              </p>
            </div>
            {confidenceData.length > 0 ? (
              <div className="pt-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={confidenceData}
                      dataKey="count"
                      nameKey="level"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {confidenceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-16">
                No confidence distribution data available
              </p>
            )}
          </div>
        </div>

        {/* Recent Analyses Card */}
        {insights.recent_analyses?.length > 0 && (
          <div className="card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--app-border)]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--app-text)]">
                Recent Analysis Logs
              </h3>
              <span className="text-xs text-[var(--app-text-muted)]">Last 10 records</span>
            </div>
            <div className="space-y-2">
              {insights.recent_analyses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--app-border)] hover:bg-[var(--app-hover)] transition-colors text-xs"
                >
                  <div>
                    <p className="font-bold text-sm text-[var(--app-text)]">{item.top_task ?? '—'}</p>
                    <p className="text-[var(--app-text-muted)] mt-0.5">
                      {new Date(item.created_at).toLocaleString()} · {item.total_selected} tasks evaluated
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[#2563EB] font-mono">
                      Score {item.top_score ?? '—'}
                    </span>
                    {item.conflicts > 0 && (
                      <p className="text-[#F59E0B] font-semibold text-[11px]">
                        {item.conflicts} conflict(s)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

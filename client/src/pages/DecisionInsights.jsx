import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import { decisionService } from '../services/decisionService';

const COLORS = ['#2563EB', '#14B8A6', '#F59E0B'];

export default function DecisionInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    decisionService.getInsights()
      .then((res) => setInsights(res.insights))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="spinner" />
        </div>
      </Layout>
    );
  }

  if (!insights) {
    return (
      <Layout>
        <p className="text-[var(--app-text-secondary)] text-center py-16">Unable to load decision insights.</p>
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
        <div>
          <h1 className="page-title">Decision Insights</h1>
          <p className="page-subtitle">Patterns and trends from your decision analyses.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Analyses" value={insights.total_analyses} type="total" />
          <StatCard title="A/B Comparisons" value={insights.total_comparisons} type="average" />
          <StatCard title="Avg Tasks / Analysis" value={insights.avg_tasks_per_analysis} type="pending" />
          <StatCard title="Conflicts Detected" value={insights.total_conflicts_detected} type="highest" />
        </div>

        {insights.most_frequent_top_task && (
          <div className="card p-6 border-[rgba(37,99,235,0.2)]">
            <p className="text-sm text-[var(--app-text-secondary)]">Most Frequently Top-Ranked Task</p>
            <p className="text-xl font-semibold text-[#2563EB] mt-1">{insights.most_frequent_top_task}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="section-title mb-4">Analyses by Month</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insights.monthly_analyses || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                <XAxis dataKey="month" stroke="var(--app-text-muted)" fontSize={12} />
                <YAxis stroke="var(--app-text-muted)" />
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h3 className="section-title mb-4">Comparison Confidence</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={confidenceData} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={70} label>
                  {confidenceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {insights.recent_analyses?.length > 0 && (
          <div className="card p-6">
            <h3 className="section-title mb-4">Recent Analyses</h3>
            <div className="space-y-2">
              {insights.recent_analyses.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 card-kpi text-sm">
                  <div>
                    <p className="font-medium">{item.top_task ?? '—'}</p>
                    <p className="text-[var(--app-text-muted)]">{new Date(item.created_at).toLocaleString()} · {item.total_selected} tasks</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#2563EB] font-bold">{item.top_score ?? '—'}</p>
                    {item.conflicts > 0 && <p className="text-[#F59E0B] text-xs">{item.conflicts} conflict(s)</p>}
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

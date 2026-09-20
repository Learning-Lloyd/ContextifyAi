import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiSave,
  FiSliders,
  FiZap,
} from 'react-icons/fi';
import AiExplanationPanel from '../components/AiExplanationPanel';
import DecisionSummaryCard from '../components/DecisionSummaryCard';
import Layout from '../components/Layout';
import PriorityBadge from '../components/PriorityBadge';
import RankedTaskCard from '../components/RankedTaskCard';
import RecommendationPanel from '../components/RecommendationPanel';
import WhatIfSimulator from '../components/WhatIfSimulator';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/useToast';
import { decisionService } from '../services/decisionService';
import { taskService } from '../services/taskService';
import { weatherIcon } from '../utils/taskUtils';

export default function DecisionLab() {
  const [tasks, setTasks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');
  const { showToast } = useToast();

  const fetchTasks = () => {
    taskService
      .getAll()
      .then((result) => setTasks(result.tasks || []))
      .catch(() => setTasks([]));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTask = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(tasks.map((t) => t.id));
  const clearAll = () => {
    setSelectedIds([]);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (selectedIds.length === 0) {
      showToast('Select at least one task to analyze', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await decisionService.analyzeMultiple(selectedIds);
      setAnalysis(result.analysis);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch {
      showToast('Failed to analyze tasks', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysis?.ranked_tasks || analysis.ranked_tasks.length < 2) {
      showToast('Need at least 2 tasks to save a comparison', 'error');
      return;
    }

    setSaving(true);
    try {
      const [first, second] = analysis.ranked_tasks;
      await decisionService.saveDecision(first, second);
      showToast('Decision saved to history', 'success');
    } catch {
      showToast('Failed to save decision', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Page Title & Main Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="page-title">Decision Lab</h1>
            </div>
            <p className="page-subtitle text-xs sm:text-sm">
              Multi-factor contextual task prioritization engine and comparative analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'analyze' && (
              <>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || selectedIds.length === 0}
                  className="btn btn-primary text-xs sm:text-sm shadow-sm"
                >
                  <FiZap size={15} />
                  {analyzing ? 'Evaluating Factors...' : `Analyze ${selectedIds.length} Tasks`}
                </button>
                {analysis && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-secondary text-xs sm:text-sm"
                  >
                    <FiSave size={15} />
                    {saving ? 'Saving...' : 'Save Decision'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--app-border)] gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('analyze')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'analyze'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            }`}
          >
            <FiCpu size={16} />
            Prioritization Analysis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('what-if')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'what-if'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            }`}
          >
            <FiSliders size={16} />
            What-If Scenario Simulator
          </button>
        </div>

        {activeTab === 'what-if' ? (
          <WhatIfSimulator tasks={tasks} onTasksUpdated={fetchTasks} />
        ) : (
          <div className="space-y-6">
            {/* Task Selector Card */}
            <div className="card p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-[var(--app-text)]">
                    Select Candidate Tasks ({selectedIds.length} of {tasks.length} selected)
                  </h2>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    Choose which tasks you want to rank with multi-factor contextual analysis
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="btn btn-secondary btn-sm text-xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="btn btn-ghost btn-sm text-xs"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {tasks.length === 0 ? (
                <EmptyState
                  title="No tasks available"
                  description="Create some tasks on the Dashboard or Tasks page first before analyzing decisions."
                />
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {tasks.map((task) => {
                    const isSelected = selectedIds.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        className={`flex items-center gap-4 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#2563EB]/40 bg-blue-500/[0.04] shadow-sm'
                            : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-text-muted)]/40'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTask(task.id)}
                          className="w-4 h-4 rounded text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[var(--app-text)] truncate">
                              {task.title}
                            </span>
                            <PriorityBadge level={task.priority_level} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--app-text-muted)]">
                            {task.due_date && <span>📅 Due: {task.due_date}</span>}
                            {task.location && <span>📍 {task.location}</span>}
                            {task.weather_condition && (
                              <span>
                                {weatherIcon(task.weather_condition)} {task.weather_condition}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                            Score
                          </span>
                          <span className="text-base font-extrabold text-[#2563EB] font-mono">
                            {task.priority_score}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Analysis Output Sections */}
            {analysis && (
              <>
                <DecisionSummaryCard summary={analysis.summary} confidence={analysis.confidence} />

                {analysis.ai_explanation && (
                  <AiExplanationPanel
                    explanation={analysis.ai_explanation}
                    weatherContext={analysis.weather_context}
                  />
                )}

                {/* Deadline Collision Warnings */}
                {analysis.conflicts?.length > 0 && (
                  <div className="space-y-3">
                    {analysis.conflicts.map((conflict) => (
                      <div
                        key={conflict.date}
                        className="card p-5 border-l-4 border-l-[#F59E0B] bg-[#F59E0B]/[0.03] space-y-2.5"
                      >
                        <div className="flex items-center gap-2 text-[#D97706] dark:text-[#FBBF24] font-bold text-sm">
                          <FiAlertTriangle size={16} />
                          <span>Deadline Conflict: {conflict.count} tasks due on {conflict.date}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed">
                          {conflict.warning}
                        </p>
                        <div className="pt-2 border-t border-[#F59E0B]/20">
                          <p className="text-xs font-semibold text-[var(--app-text)] mb-1">
                            Recommended execution order based on priority score:
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5 text-xs text-[var(--app-text-secondary)]">
                            {conflict.execution_order.map((title) => (
                              <li key={title} className="font-medium">{title}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <RecommendationPanel recommendation={analysis.recommendation} />

                {/* Ranked List */}
                {analysis.ranked_tasks?.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-1">
                      <FiCheckCircle className="text-[#2563EB]" size={18} />
                      <h2 className="text-base font-bold text-[var(--app-text)]">
                        Ranked Priority Order ({analysis.total_selected} tasks evaluated)
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {analysis.ranked_tasks.map((task) => (
                        <RankedTaskCard key={task.id || task.title} task={task} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

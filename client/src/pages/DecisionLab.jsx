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

  const fetchTasks = async () => {
    try {
      const result = await taskService.getAll({ sort: 'due_date', direction: 'asc' });
      setTasks(result.tasks || []);
    } catch {
      setTasks([]);
    }
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
  const unanalyzedTaskCount = tasks.filter((task) => !task.analyzed).length;
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
      await fetchTasks();
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
      <div className="decision-lab-workspace animate-fade-in">
        {/* Page Title & Main Actions */}
        <div className="decision-lab-header">
          <div>
            <h1 className="page-title">Decision Lab</h1>
            <p className="page-subtitle text-sm">Select tasks to compare their priorities.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {activeTab === 'analyze' && (
              <>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || selectedIds.length === 0}
                  className="btn btn-primary text-sm shadow-sm w-full sm:w-auto"
                >
                  <FiZap size={15} />
                  {analyzing ? 'Analyzing…' : selectedIds.length ? `Analyze ${selectedIds.length} tasks` : 'Analyze tasks'}
                </button>
                {analysis && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-secondary text-sm w-full sm:w-auto"
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
        <div className="decision-lab-tabs" role="tablist" aria-label="Decision Lab tools">
          <button
            type="button"
            onClick={() => setActiveTab('analyze')}
            role="tab"
            aria-selected={activeTab === 'analyze'}
            className={`decision-tab ${
              activeTab === 'analyze'
                ? 'is-active'
                : ''
            }`}
          >
            <FiCpu size={16} />
            Analyze
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('what-if')}
            role="tab"
            aria-selected={activeTab === 'what-if'}
            className={`decision-tab ${
              activeTab === 'what-if'
                ? 'is-active'
                : ''
            }`}
          >
            <FiSliders size={16} />
            What if?
          </button>
        </div>

        {activeTab === 'what-if' ? (
          <WhatIfSimulator tasks={tasks} onTasksUpdated={fetchTasks} />
        ) : (
          <div className="space-y-6">
            {/* Task Selector Card */}
            <div className="candidate-selection-panel">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-[var(--app-text)]">
                    Select tasks <span className="text-sm font-medium text-[var(--app-text-muted)]">{selectedIds.length} of {tasks.length} selected</span>
                  </h2>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    Compare the tasks you select.
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
                    Clear
                  </button>
                </div>
              </div>

              {tasks.length === 0 ? (
                <EmptyState
                  title="No tasks available"
                  description="Add a task to get started."
                />
              ) : (
                <>
                {unanalyzedTaskCount > 0 && (
                  <p className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-[var(--app-text-secondary)]">
                    {unanalyzedTaskCount} task{unanalyzedTaskCount === 1 ? '' : 's'} need analysis.
                  </p>
                )}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 mt-3">
                  {tasks.map((task) => {
                    const isSelected = selectedIds.includes(task.id);
                    return (
                      <label
                        key={task.id}
                        className={`candidate-task-row ${
                          isSelected
                            ? 'is-selected'
                            : ''
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
                            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${task.analyzed ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                              {task.analyzed ? 'Analyzed' : 'Needs analysis'}
                            </span>
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
                      </label>
                    );
                  })}
                </div>
                </>
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
                          Priority order · {analysis.total_selected} tasks
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

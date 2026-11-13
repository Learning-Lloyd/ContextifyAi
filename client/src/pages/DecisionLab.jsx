import { useEffect, useRef, useState } from 'react';
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
import PriorityBadge from '../components/PriorityBadge';
import { getCountdownLabel, weatherIcon } from '../utils/taskUtils';

export default function DecisionLab() {
  const [tasks, setTasks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [priorityModelResult, setPriorityModelResult] = useState(null);
  const [priorityModelError, setPriorityModelError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [predictingPriority, setPredictingPriority] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');
  const rankedResultsRef = useRef(null);
  const { showToast } = useToast();

  const fetchTasks = async () => {
    try {
      const result = await taskService.getAll({ sort: 'priority_score', direction: 'desc' });
      setTasks(result.tasks || []);
    } catch {
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTask = (id) => {
    setPriorityModelResult(null);
    setPriorityModelError('');
    setAnalysis(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(tasks.filter((task) => task.status === 'pending' && !task.is_archived).map((task) => task.id));
    setPriorityModelResult(null);
    setPriorityModelError('');
    setAnalysis(null);
  };
  const pendingTasks = tasks.filter((task) => task.status === 'pending' && !task.is_archived);
  // The API returns tasks ordered by the existing fixed weighted score. This
  // preview rank is informational; it does not save an analysis or alter scores.
  const pendingRankById = new Map(pendingTasks.map((task, index) => [Number(task.id), index + 1]));
  const unanalyzedTaskCount = pendingTasks.filter((task) => !task.analyzed).length;
  const clearAll = () => {
    setSelectedIds([]);
    setAnalysis(null);
    setPriorityModelResult(null);
    setPriorityModelError('');
  };

  const handleExperimentalPrediction = async () => {
    if (selectedIds.length === 0) {
      showToast('Select at least one task first', 'error');
      return;
    }

    setPredictingPriority(true);
    setPriorityModelError('');
    try {
      const result = await decisionService.predictExperimentalPriority(selectedIds);
      setPriorityModelResult(result);
    } catch (error) {
      const message = error.response?.data?.message
        || 'The experimental model service is unavailable. Start the local Contextify ML service and try again.';
      setPriorityModelResult(null);
      setPriorityModelError(message);
    } finally {
      setPredictingPriority(false);
    }
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
      window.requestAnimationFrame(() => rankedResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
                  onClick={handleExperimentalPrediction}
                  disabled={predictingPriority || selectedIds.length === 0}
                  className="btn btn-secondary text-sm shadow-sm w-full sm:w-auto"
                  title="Run a separate experimental model trained on synthetic sample data"
                >
                  <FiCpu size={15} />
                  {predictingPriority ? 'Predicting…' : 'Synthetic ML preview'}
                </button>
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
                    Select tasks <span className="text-sm font-medium text-[var(--app-text-muted)]">{selectedIds.length} of {pendingTasks.length} pending tasks selected</span>
                  </h2>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    Completed tasks stay visible but are excluded from unfinished-task recommendations.
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
                  <p className="mt-4 rounded-lg border border-zinc-500/20 bg-zinc-500/[0.05] px-3 py-2 text-xs text-[var(--app-text-secondary)]">
                    {unanalyzedTaskCount} task{unanalyzedTaskCount === 1 ? '' : 's'} not analyzed yet. Preliminary ranks use the existing 40/30/20/10 formula; analyze a task to save its result and explanation.
                  </p>
                )}
                <div className="decision-selection-scroll mt-3">
                  <table className="decision-selection-board" aria-label="Tasks available for analysis">
                    <thead>
                      <tr>
                        <th scope="col">Select</th>
                        <th scope="col">Task</th>
                        <th scope="col">Deadline</th>
                        <th scope="col">Time remaining</th>
                        <th scope="col">Status</th>
                        <th scope="col">Rank / priority</th>
                        <th scope="col">Context</th>
                      </tr>
                    </thead>
                    <tbody>
                  {tasks.map((task) => {
                    const isSelected = selectedIds.includes(task.id);
                    const countdown = getCountdownLabel(task.due_date, task.due_time);
                    const overdue = task.status !== 'completed' && countdown?.startsWith('Overdue');
                    const context = [task.category, task.location].filter(Boolean).join(' · ');
                    return (
                      <tr
                        key={task.id}
                        className={`decision-selection-row ${
                          isSelected
                            ? 'is-selected'
                            : ''
                        }`}
                      >
                        <td><input type="checkbox" checked={isSelected} disabled={task.status === 'completed' || task.is_archived} onChange={() => toggleTask(task.id)} aria-label={`Select ${task.title} for analysis`} /></td>
                        <td>
                          <strong className="decision-selection-title">{task.title}</strong>
                          {task.description && <span className="decision-selection-description">{task.description}</span>}
                        </td>
                        <td>{task.due_date ? new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}{task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ''}</td>
                        <td><span className={`task-countdown ${overdue ? 'is-overdue' : ''}`}>{countdown || '—'}</span></td>
                        <td><span className={`task-status-tag ${task.status === 'completed' ? 'is-complete' : overdue ? 'is-overdue' : 'is-pending'}`}>{task.status === 'completed' ? 'Completed' : overdue ? 'Overdue' : 'Pending'}</span><span className="decision-selection-analysis-state">{task.status === 'completed' ? 'Not included' : task.analyzed ? 'Analyzed' : 'Needs analysis'}</span></td>
                        <td>
                          {task.status === 'pending' && pendingRankById.has(Number(task.id)) && (
                            <span className="mr-2 font-semibold text-[var(--app-text-secondary)]">#{pendingRankById.get(Number(task.id))}</span>
                          )}
                          {task.analyzed ? <PriorityBadge level={task.priority_level} /> : task.status === 'pending' ? <span className="text-xs text-[var(--app-text-muted)]">Preliminary</span> : '—'}
                        </td>
                        <td>{task.weather_condition ? <span>{weatherIcon(task.weather_condition)} {task.weather_condition}</span> : null}{context && <span className="decision-selection-context">{context}</span>}{!context && !task.weather_condition ? '—' : null}</td>
                      </tr>
                    );
                  })}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>

            {(priorityModelResult || priorityModelError) && (
              <section className="card p-5 border-l-4 border-l-amber-500" aria-live="polite">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FiCpu className="text-amber-600" size={17} />
                      <h2 className="text-base font-bold text-[var(--app-text)]">Experimental predictions and suggestions</h2>
                    </div>
                    <p className="mt-1 text-xs text-[var(--app-text-secondary)]">
                      Experimental prediction trained on synthetic sample data. It does not change the official formula score or ranking; confidence is not shown because calibration was not evaluated.
                    </p>
                  </div>
                  {priorityModelResult?.model?.version && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                      Model v{priorityModelResult.model.version}
                    </span>
                  )}
                </div>

                {priorityModelError ? (
                  <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600" role="alert">
                    {priorityModelError}
                  </p>
                ) : (
                  <>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-text-muted)]">
                            <th scope="col" className="py-2 pr-4">Selected task</th>
                            <th scope="col" className="py-2 pr-4">Official Contextify result</th>
                            <th scope="col" className="py-2 pr-4">Experimental prediction</th>
                            <th scope="col" className="py-2 pr-4">Comparison</th>
                            <th scope="col" className="py-2">Suggested next step</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(priorityModelResult?.predictions || []).map((prediction) => {
                            const official = analysis?.ranked_tasks?.find((task) => Number(task.id) === Number(prediction.task_id));
                            const task = tasks.find((item) => Number(item.id) === Number(prediction.task_id));
                            const rank = official?.rank ?? pendingRankById.get(Number(prediction.task_id));
                            const officialCategory = (official?.priority_level ?? task?.priority_level)?.toLowerCase();
                            const hasPrediction = prediction.prediction_status === 'predicted';
                            const agrees = hasPrediction && officialCategory && officialCategory === prediction.priority_category?.toLowerCase();
                            return (
                              <tr key={prediction.task_id} className="border-b border-[var(--app-border)] last:border-0">
                                <td className="py-3 pr-4 font-medium text-[var(--app-text)]">{prediction.title}</td>
                                <td className="py-3 pr-4">{rank ? `#${rank}${official ? ` · ${official.priority_score}/10 · ${officialCategory}` : ' · preliminary rank; analyze to save the score'}` : '—'}</td>
                                <td className="py-3 pr-4 font-semibold text-amber-700 dark:text-amber-300">
                                  {!hasPrediction ? (
                                    <span className="text-[var(--app-text-muted)]">{prediction.prediction_status === 'insufficient_inputs' ? 'Not predicted' : 'No result'}</span>
                                  ) : (
                                    <>
                                      {prediction.priority_category}
                                      {prediction.review_required && (
                                        <span className="mt-1 block text-xs font-normal text-amber-700 dark:text-amber-300">
                                          Review inputs: {[...(prediction.missing_optional_inputs || []), ...(prediction.importance_source === 'legacy' ? ['importance source unknown'] : []), ...((prediction.unverified_input_sources || []).map((factor) => `${factor} source not recorded`))].join(', ')}
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {prediction.missing_inputs?.length > 0 && (
                                    <span className="mt-1 block text-xs font-normal text-[var(--app-text-secondary)]">Missing/invalid: {prediction.missing_inputs.join(', ')}</span>
                                  )}
                                </td>
                                <td className="py-3 pr-4 font-semibold">{hasPrediction && officialCategory ? (agrees ? 'Agrees' : 'Differs') : 'Not compared'}</td>
                                <td className="py-3 text-[var(--app-text-secondary)]">{prediction.suggested_next_step}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Analysis Output Sections */}
            {analysis && (
              <>
                {analysis.ranked_tasks?.length > 0 && (
                  <section ref={rankedResultsRef} className="decision-ranked-results" aria-labelledby="decision-ranked-title">
                    <div className="flex items-center justify-between gap-3 pb-1">
                      <div className="flex items-center gap-2">
                        <FiCheckCircle className="text-blue-600 dark:text-blue-300" size={17} />
                        <h2 id="decision-ranked-title" className="text-base font-bold text-[var(--app-text)]">Recommended order</h2>
                      </div>
                      <span className="text-xs text-[var(--app-text-muted)]">{analysis.ranked_tasks.length} tasks</span>
                    </div>
                    <div className="space-y-2">
                      {analysis.ranked_tasks.map((task) => (
                        <RankedTaskCard key={task.id || task.title} task={task} />
                      ))}
                    </div>
                  </section>
                )}

                <details className="card p-3 decision-extra-context">
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--app-text)]">Additional analysis context</summary>
                  <div className="mt-3 space-y-4">
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
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiSave, FiZap } from 'react-icons/fi';
import AiExplanationPanel from '../components/AiExplanationPanel';
import DecisionSummaryCard from '../components/DecisionSummaryCard';
import Layout from '../components/Layout';
import PriorityBadge from '../components/PriorityBadge';
import RankedTaskCard from '../components/RankedTaskCard';
import RecommendationPanel from '../components/RecommendationPanel';
import WhatIfSimulator from '../components/WhatIfSimulator';
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

  useEffect(() => {
    taskService.getAll()
      .then((result) => setTasks(result.tasks || []))
      .catch(() => setTasks([]));
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Decision Lab</h1>
            <p className="page-subtitle">
              Select multiple tasks for explainable, deterministic priority analysis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'analyze' && (
              <>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || selectedIds.length === 0}
                  className="btn btn-secondary"
                >
                  <FiZap size={16} />
                  {analyzing ? 'Analyzing...' : 'Analyze Decision'}
                </button>
                {analysis && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save Decision'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {['analyze', 'what-if'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            >
              {tab === 'analyze' ? 'Analyze' : 'What-If Simulator'}
            </button>
          ))}
        </div>

        {activeTab === 'what-if' ? (
          <WhatIfSimulator tasks={tasks} />
        ) : (
        <>
        {analysis && (
          <DecisionSummaryCard summary={analysis.summary} confidence={analysis.confidence} />
        )}

        {analysis?.ai_explanation && (
          <AiExplanationPanel
            explanation={analysis.ai_explanation}
            weatherContext={analysis.weather_context}
          />
        )}

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Task Selection ({selectedIds.length} selected)</h2>
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={selectAll} className="text-[#2563EB] hover:underline font-medium">Select All</button>
              <span className="text-[var(--app-text-muted)]">|</span>
              <button type="button" onClick={clearAll} className="text-[var(--app-text-secondary)] hover:underline">Clear</button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <p className="text-[var(--app-text-secondary)] text-center py-8">No saved tasks. Create tasks on the dashboard first.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasks.map((task) => (
                <label
                  key={task.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedIds.includes(task.id)
                      ? 'border-[rgba(37,99,235,0.35)] bg-[rgba(37,99,235,0.05)]'
                      : 'border-[var(--app-border)] hover:border-[rgba(37,99,235,0.2)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(task.id)}
                    onChange={() => toggleTask(task.id)}
                    className="w-4 h-4 accent-[#2563EB]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{task.title}</span>
                      <PriorityBadge level={task.priority_level} score={task.priority_score} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-[var(--app-text-muted)]">
                      {task.due_date && <span>Due: {task.due_date}</span>}
                      {task.location && <span>{task.location}</span>}
                      {task.weather_condition && (
                        <span>{weatherIcon(task.weather_condition)} {task.weather_condition}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-base font-bold text-[#2563EB]">{task.priority_score}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {analysis && (
          <RecommendationPanel recommendation={analysis.recommendation} />
        )}

        {analysis?.conflicts?.length > 0 && (
          <div className="space-y-4">
            {analysis.conflicts.map((conflict) => (
              <div key={conflict.date} className="card p-5 border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.04)]">
                <div className="flex items-center gap-2 text-[#D97706] dark:text-[#FBBF24] font-semibold mb-2 text-sm">
                  <FiAlertTriangle size={16} />
                  Conflict Detected — {conflict.count} tasks due on {conflict.date}
                </div>
                <p className="text-sm text-[var(--app-text-secondary)] mb-3">{conflict.warning}</p>
                <p className="text-sm text-[var(--app-text-muted)] mb-2">Recommended execution order:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--app-text)]">
                  {conflict.execution_order.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ol>
                <p className="text-xs text-[var(--app-text-muted)] mt-3">{conflict.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {analysis?.ranked_tasks && (
          <div className="card p-6">
            <div className="flex items-center gap-2 font-semibold mb-5 text-[var(--app-text)]">
              <FiCheckCircle className="text-[#2563EB]" size={18} />
              Priority Ranking ({analysis.total_selected} tasks)
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
    </Layout>
  );
}

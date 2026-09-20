import { useMemo, useState } from 'react';
import {
  FiArrowDown,
  FiArrowRight,
  FiArrowUp,
  FiCheckCircle,
  FiCheckSquare,
  FiMinus,
  FiRefreshCw,
  FiRotateCcw,
  FiSave,
  FiSliders,
  FiZap,
} from 'react-icons/fi';
import ConfirmDialog from './ConfirmDialog';
import DecisionConfidenceBadge from './DecisionConfidenceBadge';
import EmptyState from './EmptyState';
import FactorBar from './FactorBar';
import PriorityBadge from './PriorityBadge';
import { useToast } from '../hooks/useToast';
import { decisionService } from '../services/decisionService';
import { taskService } from '../services/taskService';

// Fixed weights strictly defined by the manuscript
const FACTORS = [
  { key: 'importance', label: 'Importance', weight: '40%', weightNum: 0.40, color: '#2563EB' },
  { key: 'urgency', label: 'Urgency', weight: '30%', weightNum: 0.30, color: '#F59E0B' },
  { key: 'time_availability', label: 'Time Availability', weight: '20%', weightNum: 0.20, color: '#14B8A6' },
  { key: 'current_workload', label: 'Current Workload', weight: '10%', weightNum: 0.10, color: '#64748B' },
];

export default function WhatIfSimulator({ tasks = [], onTasksUpdated }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [savingScenario, setSavingScenario] = useState(false);
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [applying, setApplying] = useState(false);
  const { showToast } = useToast();

  const selectedTasks = useMemo(
    () => tasks.filter((t) => selectedIds.includes(t.id)),
    [tasks, selectedIds]
  );

  // Original score calculation using the deterministic formula
  const getOriginalScore = (task) => {
    return Number(task.priority_score) || decisionService.calculateScore(task);
  };

  // Simulated score calculation with overrides applied
  const getSimulatedScore = (task) => {
    const taskOverrides = overrides[task.id] || {};
    const merged = {
      importance: taskOverrides.importance ?? task.importance ?? 5,
      urgency: taskOverrides.urgency ?? task.urgency ?? 5,
      time_availability: taskOverrides.time_availability ?? task.time_availability ?? 5,
      current_workload: taskOverrides.current_workload ?? task.current_workload ?? 5,
    };
    return Number(decisionService.calculateScore(merged));
  };

  // Check if a task has any factor modifications
  const hasTaskOverrides = (taskId) => {
    const taskOv = overrides[taskId];
    if (!taskOv) return false;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;
    return (
      (taskOv.importance !== undefined && taskOv.importance !== task.importance) ||
      (taskOv.urgency !== undefined && taskOv.urgency !== task.urgency) ||
      (taskOv.time_availability !== undefined && taskOv.time_availability !== task.time_availability) ||
      (taskOv.current_workload !== undefined && taskOv.current_workload !== task.current_workload)
    );
  };

  const hasAnyOverrides = useMemo(() => {
    return selectedIds.some((id) => hasTaskOverrides(id));
  }, [selectedIds, overrides, tasks]);

  // Baseline ranking among selected tasks
  const baselineRanking = useMemo(() => {
    return [...selectedTasks]
      .map((t) => ({ ...t, origScore: getOriginalScore(t) }))
      .sort((a, b) => b.origScore - a.origScore)
      .map((t, idx) => ({ ...t, origRank: idx + 1 }));
  }, [selectedTasks]);

  // Real-time simulated ranking among selected tasks
  const liveSimulatedRanking = useMemo(() => {
    return [...selectedTasks]
      .map((t) => {
        const origScore = getOriginalScore(t);
        const simScore = getSimulatedScore(t);
        const baseline = baselineRanking.find((b) => b.id === t.id);
        const origRank = baseline?.origRank || 1;
        return {
          ...t,
          origScore,
          simScore,
          origRank,
          scoreDiff: Number((simScore - origScore).toFixed(2)),
          factors: {
            importance: overrides[t.id]?.importance ?? t.importance ?? 5,
            urgency: overrides[t.id]?.urgency ?? t.urgency ?? 5,
            time_availability: overrides[t.id]?.time_availability ?? t.time_availability ?? 5,
            current_workload: overrides[t.id]?.current_workload ?? t.current_workload ?? 5,
          },
        };
      })
      .sort((a, b) => b.simScore - a.simScore)
      .map((t, idx) => {
        const simRank = idx + 1;
        const rankDiff = t.origRank - simRank; // positive = moved up
        return { ...t, simRank, rankDiff };
      });
  }, [selectedTasks, overrides, baselineRanking]);

  // Selection handlers
  const toggleTask = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    setSimulation(null);
  };

  const selectAll = () => {
    setSelectedIds(tasks.map((t) => t.id));
    setSimulation(null);
  };

  const clearAll = () => {
    setSelectedIds([]);
    setOverrides({});
    setSimulation(null);
  };

  // Factor slider change
  const updateFactor = (taskId, factor, value) => {
    setOverrides((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [factor]: Number(value),
      },
    }));
    setSimulation(null);
  };

  // Reset factors for a single task
  const resetTaskFactors = (taskId) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setSimulation(null);
  };

  // Global reset
  const resetAll = () => {
    setOverrides({});
    setSimulation(null);
    showToast('All simulation factor adjustments reset to baseline', 'info');
  };

  // Run full backend simulation
  const handleSimulate = async () => {
    if (selectedIds.length === 0) {
      showToast('Select at least one task to simulate', 'error');
      return;
    }

    setSimulating(true);
    try {
      const scenarios = selectedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        due_time: task.due_time,
        location: task.location,
        weather_condition: task.weather_condition,
        temperature: task.temperature,
        rain_probability: task.rain_probability,
        importance: overrides[task.id]?.importance ?? task.importance ?? 5,
        urgency: overrides[task.id]?.urgency ?? task.urgency ?? 5,
        time_availability: overrides[task.id]?.time_availability ?? task.time_availability ?? 5,
        current_workload: overrides[task.id]?.current_workload ?? task.current_workload ?? 5,
      }));

      const result = await decisionService.simulateWhatIf(scenarios);
      setSimulation(result.analysis);
      showToast('What-If simulation calculated successfully', 'success');
    } catch {
      showToast('Failed to run simulation engine', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Save What-If scenario
  const handleSaveScenario = async () => {
    if (selectedIds.length === 0) return;

    setSavingScenario(true);
    try {
      const scenarios = selectedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        due_time: task.due_time,
        location: task.location,
        weather_condition: task.weather_condition,
        temperature: task.temperature,
        rain_probability: task.rain_probability,
        importance: overrides[task.id]?.importance ?? task.importance ?? 5,
        urgency: overrides[task.id]?.urgency ?? task.urgency ?? 5,
        time_availability: overrides[task.id]?.time_availability ?? task.time_availability ?? 5,
        current_workload: overrides[task.id]?.current_workload ?? task.current_workload ?? 5,
      }));

      const title = scenarioTitle.trim() || `What-If Scenario (${selectedTasks.length} tasks)`;
      await decisionService.saveSimulation(scenarios, title);
      showToast('What-If scenario saved to Decision History', 'success');
      setShowSaveModal(false);
      setScenarioTitle('');
    } catch {
      showToast('Failed to save scenario', 'error');
    } finally {
      setSavingScenario(false);
    }
  };

  // Apply scenario to actual tasks
  const handleApplyScenario = async () => {
    setApplying(true);
    try {
      let updatedCount = 0;
      for (const task of selectedTasks) {
        if (hasTaskOverrides(task.id)) {
          const taskOv = overrides[task.id];
          await taskService.update(task.id, {
            importance: taskOv.importance ?? task.importance,
            urgency: taskOv.urgency ?? task.urgency,
            time_availability: taskOv.time_availability ?? task.time_availability,
            current_workload: taskOv.current_workload ?? task.current_workload,
          });
          updatedCount++;
        }
      }

      showToast(`Successfully applied simulated factors to ${updatedCount} task(s)`, 'success');
      setOverrides({});
      setSimulation(null);
      setShowApplyConfirm(false);
      onTasksUpdated?.();
    } catch {
      showToast('Failed to apply simulated factors to tasks', 'error');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Workflow Flow Banner */}
      <div className="card p-5 bg-[var(--app-card)] border-l-4 border-l-[#2563EB]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
              <FiSliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--app-text)]">What-If Decision Simulator</h2>
              <p className="text-xs text-[var(--app-text-secondary)]">
                Hypothetical sensitivity analysis: adjust contextual variables to observe ranking shifts before applying changes
              </p>
            </div>
          </div>

          {/* Workflow Sequence Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[var(--app-text-muted)]">
            <span className="bg-[var(--app-muted)] px-2.5 py-1 rounded-full text-[var(--app-text)]">
              1. Select Tasks
            </span>
            <FiArrowRight size={11} />
            <span className="bg-[var(--app-muted)] px-2.5 py-1 rounded-full text-[var(--app-text)]">
              2. Inspect Baseline
            </span>
            <FiArrowRight size={11} />
            <span className="bg-[var(--app-muted)] px-2.5 py-1 rounded-full text-[var(--app-text)]">
              3. Adjust Factors
            </span>
            <FiArrowRight size={11} />
            <span className="bg-blue-500/10 text-[#2563EB] px-2.5 py-1 rounded-full">
              4. Compare & Apply
            </span>
          </div>
        </div>
      </div>

      {/* 2. Fixed Weights & Deterministic Formula Banner */}
      <div className="card p-4 bg-slate-50 dark:bg-slate-900/50 border border-[var(--app-border)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                Deterministic Scoring Formula (Fixed Weights)
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-[#2563EB]">
                Strictly Non-Editable
              </span>
            </div>
            <p className="text-xs font-mono text-[var(--app-text-secondary)]">
              Priority Score = (Importance × 0.40) + (Urgency × 0.30) + (Time Availability × 0.20) + (Current Workload × 0.10)
            </p>
          </div>

          {/* Factor Weight Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {FACTORS.map((f) => (
              <span
                key={f.key}
                className="px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 border border-[var(--app-border)] bg-[var(--app-card)]"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                <span className="text-[var(--app-text)]">{f.label}:</span>
                <span className="font-mono font-bold" style={{ color: f.color }}>
                  {f.weight}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Task Selection & Interactive Factor Adjustments */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-[var(--app-text)]">
              Select Tasks to Simulate ({selectedIds.length} of {tasks.length} selected)
            </h3>
            <p className="text-xs text-[var(--app-text-muted)]">
              Check candidate tasks below to inspect original values and test hypothetical factor modifications
            </p>
          </div>

          <div className="flex items-center gap-2">
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
            description="Create tasks on your Dashboard or Tasks page first to run What-If simulations."
          />
        ) : (
          <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isSelected = selectedIds.includes(task.id);
              const origScore = getOriginalScore(task);
              const simScore = getSimulatedScore(task);
              const scoreDiff = Number((simScore - origScore).toFixed(2));
              const isModified = hasTaskOverrides(task.id);

              // Find baseline rank among selected tasks
              const baseline = baselineRanking.find((b) => b.id === task.id);
              const liveRankItem = liveSimulatedRanking.find((r) => r.id === task.id);

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? isModified
                        ? 'border-[#2563EB] bg-blue-500/[0.04] shadow-sm'
                        : 'border-[#2563EB]/40 bg-blue-500/[0.02]'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)] hover:border-[var(--app-text-muted)]/40'
                  }`}
                >
                  {/* Task Header & Summary */}
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <label className="flex items-start gap-3 cursor-pointer min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTask(task.id)}
                        className="w-4 h-4 mt-0.5 rounded text-[#2563EB] focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-[var(--app-text)] truncate">
                            {task.title}
                          </span>
                          <PriorityBadge level={task.priority_level} />
                          {isModified && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-[#D97706] dark:text-[#FBBF24]">
                              Simulated Override
                            </span>
                          )}
                        </div>

                        {/* Baseline Factors Row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--app-text-muted)]">
                          <span>
                            Original: I:{task.importance ?? 5} · U:{task.urgency ?? 5} · T:{task.time_availability ?? 5} · W:{task.current_workload ?? 5}
                          </span>
                          {task.due_date && <span>📅 Due: {task.due_date}</span>}
                        </div>
                      </div>
                    </label>

                    {/* Scores Comparison Display */}
                    <div className="flex items-center gap-3 shrink-0 ml-7 sm:ml-0">
                      {/* Original Score */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                          Original
                        </span>
                        <div className="flex items-center gap-1.5 justify-end">
                          {isSelected && baseline && (
                            <span className="text-[11px] font-bold text-[var(--app-text-muted)] bg-[var(--app-muted)] px-1.5 py-0.5 rounded">
                              #{baseline.origRank}
                            </span>
                          )}
                          <span className="text-xs font-bold text-[var(--app-text-secondary)] font-mono">
                            {origScore.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Simulated Result Indicator */}
                      {isSelected && (
                        <>
                          <FiArrowRight size={12} className="text-[var(--app-text-muted)]" />
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-[#2563EB] block">
                              Simulated
                            </span>
                            <div className="flex items-center gap-1.5 justify-end">
                              {liveRankItem && (
                                <span className="text-[11px] font-bold text-[#2563EB] bg-blue-500/10 px-1.5 py-0.5 rounded">
                                  #{liveRankItem.simRank}
                                </span>
                              )}
                              <span className="text-sm font-extrabold text-[#2563EB] font-mono">
                                {simScore.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Delta Badge */}
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-0.5 ${
                              scoreDiff > 0
                                ? 'bg-green-500/10 text-[#22C55E]'
                                : scoreDiff < 0
                                ? 'bg-red-500/10 text-[#EF4444]'
                                : 'bg-[var(--app-muted)] text-[var(--app-text-muted)]'
                            }`}
                          >
                            {scoreDiff > 0 && <FiArrowUp size={11} />}
                            {scoreDiff < 0 && <FiArrowDown size={11} />}
                            {scoreDiff === 0 && <FiMinus size={11} />}
                            {scoreDiff > 0 ? `+${scoreDiff.toFixed(2)}` : scoreDiff.toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive Sliders (Visible when task is selected) */}
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-[var(--app-border)]/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--app-text-secondary)]">
                          Adjust Hypothetical Factors (1 to 10):
                        </span>
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => resetTaskFactors(task.id)}
                            className="text-xs text-[var(--app-text-muted)] hover:text-[#2563EB] flex items-center gap-1 font-medium transition-colors"
                          >
                            <FiRotateCcw size={11} /> Reset Task
                          </button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        {FACTORS.map(({ key, label, weight, weightNum, color }) => {
                          const currentVal = overrides[task.id]?.[key] ?? task[key] ?? 5;
                          const originalVal = task[key] ?? 5;
                          const factorDiff = currentVal - originalVal;

                          return (
                            <div key={key} className="space-y-1 p-2 rounded-lg bg-[var(--app-card)] border border-[var(--app-border)]/40">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-medium text-[var(--app-text)] flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                  {label} <span className="text-[var(--app-text-muted)] font-normal">({weight})</span>
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {factorDiff !== 0 && (
                                    <span className={`text-[10px] font-bold ${factorDiff > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                      {factorDiff > 0 ? `+${factorDiff}` : factorDiff}
                                    </span>
                                  )}
                                  <span className="font-bold font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--app-muted)] text-[var(--app-text)]">
                                    {currentVal}/10
                                  </span>
                                </div>
                              </div>

                              <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={currentVal}
                                onChange={(e) => updateFactor(task.id, key, e.target.value)}
                                className="w-full h-1.5 bg-[var(--app-muted)] rounded-lg appearance-none cursor-pointer"
                                style={{ accentColor: color }}
                              />

                              <div className="flex justify-between text-[10px] text-[var(--app-text-muted)] font-mono">
                                <span>1</span>
                                <span>Contribution: {(currentVal * weightNum).toFixed(2)} pts</span>
                                <span>10</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Action Controls Bar */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-[var(--app-border)] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={simulating || selectedIds.length === 0}
                className="btn btn-primary text-xs sm:text-sm shadow-sm"
              >
                <FiZap size={15} />
                {simulating ? 'Evaluating Engine...' : `Run Full Engine Simulation (${selectedIds.length})`}
              </button>

              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                disabled={selectedIds.length === 0}
                className="btn btn-secondary text-xs sm:text-sm"
              >
                <FiSave size={15} /> Save Scenario
              </button>

              <button
                type="button"
                onClick={() => setShowApplyConfirm(true)}
                disabled={!hasAnyOverrides || applying}
                className="btn btn-secondary text-xs sm:text-sm border-[#2563EB]/40 text-[#2563EB] hover:bg-blue-500/10"
              >
                <FiCheckCircle size={15} /> Apply Scenario to Tasks
              </button>
            </div>

            <button
              type="button"
              onClick={resetAll}
              disabled={!hasAnyOverrides && !simulation}
              className="btn btn-ghost text-xs text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
            >
              <FiRefreshCw size={13} /> Reset Simulation
            </button>
          </div>
        )}
      </div>

      {/* 5. Original vs Simulated Comparative Ranking Board */}
      {selectedIds.length > 0 && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-[var(--app-border)]">
            <div>
              <h3 className="text-base font-bold text-[var(--app-text)] flex items-center gap-2">
                <FiCheckSquare className="text-[#2563EB]" size={18} />
                Original vs. Simulated Comparative Ranking
              </h3>
              <p className="text-xs text-[var(--app-text-muted)]">
                Live comparison showing how hypothetical factor adjustments affect the final execution order
              </p>
            </div>

            {hasAnyOverrides && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-[#2563EB]">
                Simulation Active
              </span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Column 1: Baseline Original Ranking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider pb-1">
                <span>Original Baseline Ranking</span>
                <span>Priority Score</span>
              </div>

              <div className="space-y-2.5">
                {baselineRanking.map((task) => (
                  <div
                    key={`base-${task.id}`}
                    className="p-3.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-[var(--app-muted)] text-[var(--app-text-secondary)] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        #{task.origRank}
                      </span>
                      <span className="text-sm font-semibold text-[var(--app-text)] truncate">
                        {task.title}
                      </span>
                    </div>

                    <span className="font-mono font-bold text-sm text-[var(--app-text-secondary)] shrink-0">
                      {task.origScore.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Simulated Ranking */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#2563EB] uppercase tracking-wider pb-1">
                <span>Simulated What-If Ranking</span>
                <span>Simulated Score & Shift</span>
              </div>

              <div className="space-y-2.5">
                {liveSimulatedRanking.map((task) => {
                  const isRank1 = task.simRank === 1;
                  const rankChanged = task.rankDiff !== 0;

                  return (
                    <div
                      key={`sim-${task.id}`}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isRank1
                          ? 'border-[#2563EB] bg-blue-500/[0.05] shadow-sm'
                          : 'border-[var(--app-border)] bg-[var(--app-card)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                            isRank1
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-blue-500/10 text-[#2563EB]'
                          }`}
                        >
                          #{task.simRank}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-[var(--app-text)] truncate block">
                            {task.title}
                          </span>
                          {isRank1 && (
                            <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                              ★ Top Recommended Task
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Rank Shift Indicator */}
                        {rankChanged ? (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                              task.rankDiff > 0
                                ? 'bg-green-500/10 text-[#22C55E]'
                                : 'bg-red-500/10 text-[#EF4444]'
                            }`}
                          >
                            {task.rankDiff > 0 ? (
                              <>
                                <FiArrowUp size={10} /> +{task.rankDiff}
                              </>
                            ) : (
                              <>
                                <FiArrowDown size={10} /> {task.rankDiff}
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--app-muted)] text-[var(--app-text-muted)]">
                            = Unchanged
                          </span>
                        )}

                        <span className="font-mono font-extrabold text-sm text-[#2563EB]">
                          {task.simScore.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Detailed Task Factor Comparison Breakdown */}
      {selectedIds.length > 0 && hasAnyOverrides && (
        <div className="card p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--app-text)]">
            Detailed Factor Delta Breakdown
          </h3>

          <div className="space-y-3">
            {liveSimulatedRanking
              .filter((task) => hasTaskOverrides(task.id))
              .map((task) => (
                <div
                  key={`delta-${task.id}`}
                  className="p-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-bold text-sm text-[var(--app-text)]">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-[var(--app-text-muted)]">
                        Original: {task.origScore.toFixed(2)} (Rank #{task.origRank})
                      </span>
                      <FiArrowRight size={11} className="text-[var(--app-text-muted)]" />
                      <span className="font-bold text-[#2563EB]">
                        Simulated: {task.simScore.toFixed(2)} (Rank #{task.simRank})
                      </span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded ${
                          task.scoreDiff > 0
                            ? 'bg-green-500/10 text-[#22C55E]'
                            : task.scoreDiff < 0
                            ? 'bg-red-500/10 text-[#EF4444]'
                            : 'bg-[var(--app-muted)] text-[var(--app-text-muted)]'
                        }`}
                      >
                        {task.scoreDiff > 0 ? `+${task.scoreDiff.toFixed(2)}` : task.scoreDiff.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Factor Comparison Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--app-border)]/40 text-xs">
                    {FACTORS.map(({ key, label, weightNum }) => {
                      const origVal = task[key] ?? 5;
                      const simVal = task.factors[key];
                      const diff = simVal - origVal;
                      const contributionDiff = (diff * weightNum).toFixed(2);

                      return (
                        <div key={key} className="p-2 rounded-lg bg-[var(--app-card)] border border-[var(--app-border)]/40 space-y-1">
                          <span className="text-[11px] font-medium text-[var(--app-text-muted)] block truncate">
                            {label}
                          </span>
                          <div className="flex items-center justify-between font-mono">
                            <span className="text-[var(--app-text-secondary)]">{origVal} → {simVal}</span>
                            {diff !== 0 && (
                              <span className={`font-bold text-[11px] ${diff > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                {contributionDiff > 0 ? `+${contributionDiff}` : contributionDiff}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 7. Full Engine Output (AI Justification & Recommendation) */}
      {simulation && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--app-text)]">
                Engine Simulation Results
              </h3>
              <DecisionConfidenceBadge confidence={simulation.confidence} showGap />
            </div>
            <p className="text-xs text-[var(--app-text-muted)]">
              Tasks reordered purely by deterministic scoring logic
            </p>
          </div>

          {/* AI Explanation Callout (Visually & logically separated from scoring) */}
          {simulation.ai_explanation && (
            <div className="card p-5 border-l-4 border-l-[#14B8A6] bg-[#14B8A6]/[0.03] space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-[#0D9488] dark:text-[#2DD4BF] font-bold text-sm">
                  <FiZap size={16} />
                  <span>Explainable AI Narrative Justification</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#14B8A6]/10 text-[#0D9488] dark:text-[#2DD4BF]">
                  Advisory Only · Does Not Alter Scores
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed">
                {typeof simulation.ai_explanation === 'string'
                  ? simulation.ai_explanation
                  : simulation.ai_explanation?.summary || 'The simulation re-ordered tasks according to the modified factor weights.'}
              </p>
            </div>
          )}

          {/* Ranked Task Cards from Engine */}
          <div className="space-y-4">
            {simulation.ranked_tasks.map((task) => (
              <div key={task.id || task.title} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-xl font-bold font-mono text-sm flex items-center justify-center shrink-0 ${
                        task.rank === 1
                          ? 'bg-[#2563EB] text-white shadow-sm'
                          : 'bg-blue-500/10 text-[#2563EB]'
                      }`}
                    >
                      #{task.rank}
                    </span>
                    <div>
                      <h4 className="font-bold text-base text-[var(--app-text)] truncate">
                        {task.title}
                      </h4>
                      {task.rank === 1 && (
                        <span className="text-xs font-semibold text-[#2563EB]">
                          ★ Recommended First Priority
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                      Simulated Score
                    </span>
                    <span className="text-lg font-extrabold text-[#2563EB] font-mono">
                      {task.priority_score}
                    </span>
                  </div>
                </div>

                {/* Factor Contribution Progress Bars */}
                {task.breakdown && (
                  <div className="space-y-2 pt-2 border-t border-[var(--app-border)]/60">
                    <span className="text-xs font-semibold text-[var(--app-text-muted)] block">
                      Mathematical Contribution:
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {FACTORS.map(({ key, label, color }) => {
                        const factorInfo = task.breakdown[key];
                        if (!factorInfo) return null;
                        return (
                          <FactorBar
                            key={key}
                            label={label}
                            value={factorInfo.value}
                            weight={factorInfo.weight}
                            weighted={factorInfo.weighted}
                            color={color}
                            compact
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 modal-overlay"
            onClick={() => setShowSaveModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md card p-6 space-y-4 z-10 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
                <FiSave size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--app-text)]">Save What-If Scenario</h3>
                <p className="text-xs text-[var(--app-text-secondary)]">
                  Persist this simulation for history and timeline tracking without altering actual tasks
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--app-text)]">
                Scenario Title:
              </label>
              <input
                type="text"
                placeholder="e.g. Exam Week High Urgency Simulation"
                value={scenarioTitle}
                onChange={(e) => setScenarioTitle(e.target.value)}
                className="input w-full text-sm"
              />
            </div>

            <div className="text-xs text-[var(--app-text-muted)] p-3 rounded-lg bg-[var(--app-surface)]">
              This will save {selectedTasks.length} task scenario(s) to your Decision History. Real tasks in your schedule will remain completely unchanged.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="btn btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScenario}
                disabled={savingScenario}
                className="btn btn-primary text-xs"
              >
                <FiSave size={14} />
                {savingScenario ? 'Saving Scenario...' : 'Save Scenario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog to Apply Scenario to Actual Tasks */}
      <ConfirmDialog
        isOpen={showApplyConfirm}
        title="Apply Simulated Factors to Actual Tasks?"
        message={`Are you sure you want to permanently update the actual task records for ${selectedTasks.filter((t) => hasTaskOverrides(t.id)).length} task(s)? This will replace their original Importance, Urgency, Time Availability, and Workload values with your simulated values.`}
        confirmLabel={applying ? 'Applying...' : 'Yes, Apply to Tasks'}
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleApplyScenario}
        onCancel={() => setShowApplyConfirm(false)}
      />
    </div>
  );
}

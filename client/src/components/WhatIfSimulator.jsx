import { useMemo, useState } from 'react';
import { FiRefreshCw, FiSliders } from 'react-icons/fi';
import DecisionConfidenceBadge from './DecisionConfidenceBadge';
import RankedTaskCard from './RankedTaskCard';
import { decisionService } from '../services/decisionService';

const FACTORS = [
  { key: 'importance', label: 'Importance', weight: '40%' },
  { key: 'urgency', label: 'Urgency', weight: '30%' },
  { key: 'time_availability', label: 'Time Availability', weight: '20%' },
  { key: 'current_workload', label: 'Current Workload', weight: '10%' },
];

export default function WhatIfSimulator({ tasks }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const selectedTasks = useMemo(
    () => tasks.filter((t) => selectedIds.includes(t.id)),
    [tasks, selectedIds]
  );

  const toggleTask = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    setSimulation(null);
  };

  const updateFactor = (taskId, factor, value) => {
    setOverrides((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], [factor]: Number(value) },
    }));
    setSimulation(null);
  };

  const livePreview = (task) => {
    const merged = { ...task, ...overrides[task.id] };
    return decisionService.calculateScore(merged);
  };

  const handleSimulate = async () => {
    if (selectedIds.length === 0) return;

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
        importance: overrides[task.id]?.importance ?? task.importance,
        urgency: overrides[task.id]?.urgency ?? task.urgency,
        time_availability: overrides[task.id]?.time_availability ?? task.time_availability,
        current_workload: overrides[task.id]?.current_workload ?? task.current_workload,
      }));

      const result = await decisionService.simulateWhatIf(scenarios);
      setSimulation(result.analysis);
    } finally {
      setSimulating(false);
    }
  };

  const reset = () => {
    setOverrides({});
    setSimulation(null);
  };

  return (
    <div className="card p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FiSliders className="text-[#2563EB]" />
          <h2 className="section-title">What-If Analysis</h2>
        </div>
        <p className="text-xs text-[var(--app-text-muted)]">
          Adjust factors to preview ranking changes. Weather does not affect scores.
        </p>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-4 rounded-lg border transition-all ${
              selectedIds.includes(task.id)
                ? 'border-[rgba(37,99,235,0.3)] bg-[rgba(37,99,235,0.04)]'
                : 'border-[var(--app-border)] bg-[var(--app-muted)]'
            }`}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.includes(task.id)}
                onChange={() => toggleTask(task.id)}
                className="accent-[#2563EB]"
              />
              <span className="font-medium flex-1 text-sm">{task.title}</span>
              <span className="text-[#2563EB] font-bold text-sm">{livePreview(task)}</span>
            </label>

            {selectedIds.includes(task.id) && (
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                {FACTORS.map(({ key, label, weight }) => (
                  <div key={key}>
                    <label className="text-xs text-[var(--app-text-secondary)] flex justify-between">
                      <span>{label} ({weight})</span>
                      <span>{overrides[task.id]?.[key] ?? task[key]}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={overrides[task.id]?.[key] ?? task[key]}
                      onChange={(e) => updateFactor(task.id, key, e.target.value)}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSimulate}
          disabled={simulating || selectedIds.length === 0}
          className="btn btn-primary"
        >
          {simulating ? 'Simulating...' : 'Run Simulation'}
        </button>
        <button type="button" onClick={reset} className="btn btn-secondary">
          <FiRefreshCw size={16} /> Reset
        </button>
      </div>

      {simulation && (
        <div className="space-y-4 border-t border-[var(--app-border)] pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-semibold text-[var(--app-text)]">Simulated Ranking</p>
            <DecisionConfidenceBadge confidence={simulation.confidence} showGap />
          </div>
          {simulation.ranked_tasks.map((task) => (
            <RankedTaskCard key={task.id || task.title} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

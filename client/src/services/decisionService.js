import api from './api';

const WEIGHTS = {
  importance: 0.4,
  urgency: 0.3,
  time_availability: 0.2,
  current_workload: 0.1,
};

const FACTORS = [
  { key: 'importance', label: 'Importance' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'time_availability', label: 'Time Availability' },
  { key: 'current_workload', label: 'Current Workload' },
];

function round(value) {
  return Number(value.toFixed(2));
}

function normalizeTask(task = {}) {
  return {
    title: task.title?.trim() || 'Untitled Task',
    description: task.description?.trim() || '',
    importance: Number(task.importance) || 1,
    urgency: Number(task.urgency) || 1,
    time_availability: Number(task.time_availability) || 1,
    current_workload: Number(task.current_workload) || 1,
  };
}

function confidenceFromDifference(difference) {
  if (difference >= 2) return 'high';
  if (difference >= 1) return 'medium';
  return 'low';
}

function buildComparison(taskA, taskB) {
  return FACTORS.reduce((result, factor) => {
    const valueA = taskA[factor.key];
    const valueB = taskB[factor.key];
    result[factor.key] = {
      task_a: valueA,
      task_b: valueB,
      winner: valueA === valueB ? 'tie' : valueA > valueB ? 'task_a' : 'task_b',
    };
    return result;
  }, {});
}

function getAdvantageBullets(winnerBreakdown, loserBreakdown) {
  const weightedAdvantages = FACTORS
    .map((factor) => ({
      factor,
      diff: round(winnerBreakdown[factor.key].weighted - loserBreakdown[factor.key].weighted),
    }))
    .filter((item) => item.diff > 0)
    .sort((a, b) => b.diff - a.diff);

  const bullets = weightedAdvantages.slice(0, 2).map((item) => {
    if (item.factor.key === 'time_availability') return 'Better time availability';
    if (item.factor.key === 'current_workload') return 'Higher workload-driven priority';
    return `Higher ${item.factor.label.toLowerCase()}`;
  });

  bullets.push('Better overall weighted score');
  return bullets;
}

function buildExplanation({
  recommendedTask,
  scoreDifference,
  winnerTitle,
  winnerScore,
  loserScore,
  reasonBullets,
}) {
  if (scoreDifference < 0.5 || recommendedTask === 'tie') {
    return 'Both tasks have very similar priority scores. Either choice is reasonable. Consider personal preference or external factors before deciding.';
  }

  const topReasons = reasonBullets
    .filter((reason) => reason !== 'Better overall weighted score')
    .slice(0, 2)
    .map((reason) => reason.toLowerCase())
    .join(' and ');

  const reasonSentence = topReasons
    ? ` Its ${topReasons} drive the stronger weighted outcome.`
    : '';

  return `${winnerTitle} has the higher priority score (${winnerScore}) compared to ${loserScore}.${reasonSentence} This makes it the better choice to complete first.`;
}

export const decisionService = {
  calculateScore(task) {
    return round(
      task.importance * WEIGHTS.importance
      + task.urgency * WEIGHTS.urgency
      + task.time_availability * WEIGHTS.time_availability
      + task.current_workload * WEIGHTS.current_workload
    );
  },

  getBreakdown(task) {
    const normalized = normalizeTask(task);
    return {
      importance: {
        value: normalized.importance,
        weight: WEIGHTS.importance,
        weighted: round(normalized.importance * WEIGHTS.importance),
      },
      urgency: {
        value: normalized.urgency,
        weight: WEIGHTS.urgency,
        weighted: round(normalized.urgency * WEIGHTS.urgency),
      },
      time_availability: {
        value: normalized.time_availability,
        weight: WEIGHTS.time_availability,
        weighted: round(normalized.time_availability * WEIGHTS.time_availability),
      },
      current_workload: {
        value: normalized.current_workload,
        weight: WEIGHTS.current_workload,
        weighted: round(normalized.current_workload * WEIGHTS.current_workload),
      },
      final_score: this.calculateScore(normalized),
    };
  },

  compareTasks(taskA, taskB) {
    const normalizedA = normalizeTask(taskA);
    const normalizedB = normalizeTask(taskB);
    const breakdownA = this.getBreakdown(normalizedA);
    const breakdownB = this.getBreakdown(normalizedB);
    const scoreA = breakdownA.final_score;
    const scoreB = breakdownB.final_score;
    const scoreDifference = round(Math.abs(scoreA - scoreB));
    const confidence = confidenceFromDifference(scoreDifference);

    const recommendedTask = scoreA === scoreB ? 'tie' : scoreA > scoreB ? 'task_a' : 'task_b';
    const winnerTask = recommendedTask === 'task_a' ? normalizedA : normalizedB;
    const winnerBreakdown = recommendedTask === 'task_a' ? breakdownA : breakdownB;
    const loserBreakdown = recommendedTask === 'task_a' ? breakdownB : breakdownA;
    const reasonBullets = recommendedTask === 'tie' ? [] : getAdvantageBullets(winnerBreakdown, loserBreakdown);
    const explanation = buildExplanation({
      recommendedTask,
      scoreDifference,
      winnerTitle: winnerTask.title,
      winnerScore: recommendedTask === 'task_a' ? scoreA : scoreB,
      loserScore: recommendedTask === 'task_a' ? scoreB : scoreA,
      reasonBullets,
    });

    return {
      task_a: normalizedA,
      task_b: normalizedB,
      score_a: scoreA,
      score_b: scoreB,
      recommended_task: recommendedTask,
      score_difference: scoreDifference,
      confidence,
      explanation,
      reason_bullets: reasonBullets,
      breakdown: {
        task_a: breakdownA,
        task_b: breakdownB,
      },
      comparison: buildComparison(normalizedA, normalizedB),
    };
  },

  async saveDecision(taskA, taskB) {
    const response = await api.post('/decision-lab/save', {
      task_a: normalizeTask(taskA),
      task_b: normalizeTask(taskB),
    });
    return response.data;
  },

  async getHistory() {
    const response = await api.get('/decision-lab/history');
    return response.data;
  },

  async analyzeMultiple(taskIds) {
    const response = await api.post('/decision-lab/analyze', { task_ids: taskIds });
    return response.data;
  },

  async simulateWhatIf(scenarios) {
    const response = await api.post('/decision-lab/simulate', { scenarios });
    return response.data;
  },

  async getInsights() {
    const response = await api.get('/decision-lab/insights');
    return response.data;
  },

  async getTimeline() {
    const response = await api.get('/decision-lab/timeline');
    return response.data;
  },

  async getAnalysisHistory(params = {}) {
    const response = await api.get('/decision-lab/analyses', { params });
    return response.data;
  },
};

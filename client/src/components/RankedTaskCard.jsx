import { FiChevronDown } from 'react-icons/fi';
import PriorityBadge from './PriorityBadge';
import FactorBar from './FactorBar';
import WhyNotPanel from './WhyNotPanel';
import { weatherIcon } from '../utils/taskUtils';

function ordinal(value) {
  if (value % 100 >= 11 && value % 100 <= 13) return `${value}th`;
  return `${value}${({ 1: 'st', 2: 'nd', 3: 'rd' })[value % 10] || 'th'}`;
}

export default function RankedTaskCard({ task }) {
  const factors = task.factor_breakdown?.factors || [];

  return (
    <article className={`ranked-result-card ${task.rank === 1 ? 'is-first' : ''}`}>
      <span className="ranked-result-number" aria-label={`Rank ${task.rank}`}>{task.rank}</span>
      <div className="ranked-result-main">
        <div className="ranked-result-heading">
          <h3 title={task.title}>{task.title}</h3>
          <PriorityBadge level={task.priority_level} score={task.priority_score} />
        </div>
        <div className="ranked-result-meta">
          <span>{ordinal(task.rank)} priority</span>
          {task.due_date && <span>Due {task.due_date}{task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ''}</span>}
          {task.countdown && <span className={task.countdown.startsWith('Overdue') ? 'is-overdue' : ''}>{task.countdown}</span>}
          {task.location && <span>📍 {task.location}</span>}
        </div>
        {task.task_card_explanation && (
          <p className="ranked-result-explanation" title={task.task_card_explanation}>
            <strong>{task.explanation_source === 'ai' ? 'Gemini explanation' : 'Basic guidance'}:</strong> {task.task_card_explanation}
          </p>
        )}
        {task.recommendation && <p className="ranked-result-next"><strong>Next:</strong> {task.recommendation}</p>}
        {(task.reason_bullets?.length > 0 || task.overall_explanation || task.weather_context || task.why_not || factors.length > 0) && (
          <details className="ranked-result-details">
            <summary><FiChevronDown size={13} /> More details</summary>
            <div className="ranked-result-detail-content">
              {task.reason_bullets?.length > 0 && <ul>{task.reason_bullets.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
              {task.overall_explanation && <p>{task.overall_explanation}</p>}
              {task.weather_context && <p>{weatherIcon(task.weather_context.weather_condition)} Weather in {task.weather_context.location}: {task.weather_context.explanation}</p>}
              {task.why_not && <WhyNotPanel whyNot={task.why_not} />}
              {factors.length > 0 && (
                <div className="ranked-result-factors">
                  {factors.filter((factor) => factor.label).map((factor) => {
                    const weight = factor.key === 'importance' ? 0.4 : factor.key === 'urgency' ? 0.3 : factor.key === 'time_availability' ? 0.2 : 0.1;
                    return <FactorBar key={factor.key} label={factor.label} factorKey={factor.key} value={factor.value} weight={weight} showFormula />;
                  })}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </article>
  );
}

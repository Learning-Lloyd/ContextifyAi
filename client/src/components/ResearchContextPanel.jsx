import { useState } from 'react';
import { FiMapPin, FiZap } from 'react-icons/fi';
import { researchContextService } from '../services/researchContextService';

function readable(value) {
  return String(value).replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function LabelList({ values, empty }) {
  if (!values?.length) return <span className="text-sm text-[var(--app-text-muted)]">{empty}</span>;
  return <div className="mt-2 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-medium text-[var(--app-text-secondary)]">{readable(value)}</span>)}</div>;
}

export default function ResearchContextPanel({ tasks }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    if (!tasks.length) return;
    setLoading(true);
    setError('');
    try {
      setResult(await researchContextService.predict(tasks.map(({ id, title }) => ({ id, title }))));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load the research model.');
    } finally {
      setLoading(false);
    }
  };

  const predictions = new Map((result?.predictions || []).map((item) => [item.task_id, item]));

  return (
    <section className="card space-y-4 p-5" aria-labelledby="research-context-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">SUPPLEMENTARY MODEL</p>
          <h2 id="research-context-heading" className="mt-1 text-lg font-semibold text-[var(--app-text)]">Research context suggestions</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--app-text-secondary)]">The evaluated location model looks for patterns in MS-LaTTE human annotations. It does not change task details, weather, or the weighted priority score. Time predictions remain available in the research report only because rare time labels performed poorly.</p>
        </div>
        <button type="button" onClick={analyze} disabled={!tasks.length || loading} className="btn btn-secondary btn-sm">
          <FiZap />{loading ? 'Analyzing…' : `Analyze ${tasks.length} selected task${tasks.length === 1 ? '' : 's'}`}
        </button>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!tasks.length && <p className="rounded-lg bg-[var(--app-surface)] p-4 text-sm text-[var(--app-text-muted)]">Select tasks in the Analyze tab first.</p>}
      {!!result && <p className="text-xs text-[var(--app-text-muted)]">{result.model?.algorithm} · {result.model?.dataset} · version {result.model?.model_version || '1.0.0'} · trained {result.model?.trained_at ? new Date(result.model.trained_at).toLocaleDateString() : 'date unavailable'}. Experimental predictions from external annotations, not verified outcomes for your tasks.</p>}
      {!!result && tasks.map((task) => {
        const prediction = predictions.get(task.id);
        return (
          <article key={task.id} className="rounded-xl border border-[var(--app-border)] p-4">
            <h3 className="font-semibold text-[var(--app-text)]">{task.title}</h3>
            <div className="mt-3"><p className="flex items-center gap-2 text-xs font-semibold text-[var(--app-text-secondary)]"><FiMapPin /> Suggested locations</p><LabelList values={prediction?.likely_locations} empty="No location label suggested" /></div>
          </article>
        );
      })}
    </section>
  );
}

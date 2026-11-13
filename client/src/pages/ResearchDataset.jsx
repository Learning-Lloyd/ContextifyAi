import { useEffect, useState } from 'react';
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiDatabase, FiInfo } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { researchDatasetService } from '../services/researchDatasetService';

const FIELDS = {
  contextify_scoring_validation: [
    ['test_case_id', 'Test case'], ['title', 'Task example'], ['category', 'Category'],
    ['importance', 'Importance (1-10)'], ['urgency', 'Urgency (1-10)'],
    ['time_availability', 'Time availability (1-10)'], ['current_workload', 'Current workload (1-10)'],
    ['importance_points', 'Importance points'], ['urgency_points', 'Urgency points'],
    ['time_availability_points', 'Time points'], ['current_workload_points', 'Workload points'],
    ['expected_priority_score', 'Expected score'], ['expected_priority_level', 'Expected priority'],
    ['record_type', 'Data type'],
  ],
  ms_latte: [
    ['source_id', 'Source ID'], ['title', 'Task title'], ['list_title', 'Original list title'],
    ['location_labels', 'Annotated locations'], ['known_location_judgements', 'Known location judgements'],
    ['time_labels', 'Annotated times'], ['known_time_judgements', 'Known time judgements'],
  ],
};

function display(value) {
  if (Array.isArray(value)) return value.join(' · ') || '—';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default function ResearchDataset() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [source, setSource] = useState(() => {
    const initialSource = searchParams.get('source');
    return ['contextify_scoring_validation', 'ms_latte'].includes(initialSource)
      ? initialSource
      : 'contextify_scoring_validation';
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ datasets: [], records: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const querySource = searchParams.get('source');
    if (!['contextify_scoring_validation', 'ms_latte'].includes(querySource)) {
      setSource('contextify_scoring_validation');
      setSearchParams({ source: 'contextify_scoring_validation' }, { replace: true });
    }
  }, [searchParams, setSearchParams, source]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    researchDatasetService.getRecords({ source, page, per_page: 15 })
      .then((result) => { if (active) setData(result); })
      .catch(() => { if (active) setError('Could not load the dataset. Check that the server is running and the dataset file is installed.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [source, page]);

  const changeSource = (key) => {
    setSource(key);
    setPage(1);
    setSearchParams({ source: key }, { replace: true });
  };
  const activeDataset = (data.datasets || []).find((dataset) => dataset.key === source);
  const pagination = data.pagination || { page, last_page: 1 };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
        <div>
          <Link to="/decision-lab" className="text-action mb-3 inline-flex"><FiArrowLeft /> Back to Decision Lab</Link>
          <p className="eyebrow">RESEARCH DATA</p>
          <h1 className="page-title mt-1">Dataset browser</h1>
          <p className="page-subtitle">Review external research data and model experiments. These records stay separate from your task queue, personal analytics, and priority recommendations.</p>
        </div>
<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data.datasets || []).map((dataset) => (
            <button key={dataset.key} type="button" onClick={() => changeSource(dataset.key)} className={`text-left card p-4 transition-colors ${source === dataset.key ? 'ring-1 ring-[var(--app-text)]' : 'hover:bg-[var(--app-hover)]'}`}>
              <span className="flex items-center justify-between text-[var(--app-text-muted)]"><FiDatabase /><span className="text-xs">{Number(dataset.record_count).toLocaleString()} records</span></span>
              <strong className="block mt-3 text-sm text-[var(--app-text)]">{dataset.name}</strong>
              <span className="block mt-1 text-xs leading-5 text-[var(--app-text-secondary)]">{dataset.description}</span>
            </button>
          ))}
        </div>

        {Object.keys(data.experiments || {}).length > 0 && (
          <section className="card p-4 sm:p-5" aria-labelledby="model-results-heading">
            <div className="mb-3">
              <p className="eyebrow">FIXED 20% HOLDOUT</p>
              <h2 id="model-results-heading" className="mt-1 text-lg font-semibold text-[var(--app-text)]">Supplementary model experiments</h2>
              <p className="mt-1 text-xs text-[var(--app-text-secondary)]">Macro F1 compares the trained model with a most-frequent-label baseline. These are external dataset results, not Contextify user validation.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['likely_location', 'Likely location labels'],
                ['likely_time', 'Likely time labels · research only'],
              ].map(([key, label]) => {
                const result = data.experiments[key];
                if (!result) return null;
                return <div key={key} className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3">
                  <strong className="text-sm text-[var(--app-text)]">{label}</strong>
                  <p className="mt-2 text-xs text-[var(--app-text-secondary)]">Model macro F1: {Number(result.model_macro_f1).toFixed(3)} · Baseline: {Number(result.baseline_macro_f1).toFixed(3)}</p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">{Number(result.training_records || 0).toLocaleString()} training records · {Number(result.test_records).toLocaleString()} held-out records · {Number(result.eligible_records).toLocaleString()} usable records</p>
                  <p className="mt-1 text-xs text-[var(--app-text-muted)]">Version {result.model_version || '—'} · trained {result.trained_at ? new Date(result.trained_at).toLocaleDateString() : 'date unavailable'} · {result.deployment === 'integrated_supplementary' ? 'supplementary in Decision Lab' : 'research only'}</p>
                  {result.algorithm && <p className="mt-1 text-xs text-[var(--app-text-muted)]">{result.algorithm}</p>}
                </div>;
              })}
            </div>
          </section>
        )}

        {activeDataset && (
          <section className="card overflow-hidden" aria-labelledby="dataset-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] p-4 sm:p-5">
              <div><p className="eyebrow">{Number(activeDataset.record_count).toLocaleString()} RECORDS</p><h2 id="dataset-heading" className="mt-1 text-lg font-bold text-[var(--app-text)]">{activeDataset.name}</h2></div>
              <span className="flex items-center gap-2 text-xs text-[var(--app-text-muted)]"><FiInfo /> Read-only dataset</span>
            </div>
            {error ? <p role="alert" className="p-5 text-sm text-red-600">{error}</p> : loading ? <p className="p-8 text-center text-sm text-[var(--app-text-muted)]">Loading records…</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--app-surface)] text-xs uppercase tracking-wide text-[var(--app-text-muted)]"><tr>{FIELDS[source]?.map(([key, label]) => <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
                  <tbody className="divide-y divide-[var(--app-border)]">
                    {(data.records || []).map((record) => <tr key={`${source}-${record.record_id}`} className="text-[var(--app-text-secondary)] hover:bg-[var(--app-hover)]">{FIELDS[source]?.map(([key]) => <td key={key} className={key === 'description' ? 'max-w-sm whitespace-normal px-4 py-3 text-xs leading-5' : 'whitespace-nowrap px-4 py-3'}>{display(record[key])}</td>)}</tr>)}
                    {!data.records?.length && <tr><td colSpan={FIELDS[source]?.length || 1} className="px-4 py-10 text-center text-[var(--app-text-muted)]">No records in this dataset.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[var(--app-border)] p-4 text-sm">
              <span className="text-[var(--app-text-muted)]">Page {pagination.page || page} of {pagination.last_page || 1}</span>
              <div className="flex gap-2">
                <button type="button" disabled={(pagination.page || page) <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="btn btn-secondary btn-sm"><FiChevronLeft /> Previous</button>
                <button type="button" disabled={(pagination.page || page) >= (pagination.last_page || 1) || loading} onClick={() => setPage((current) => current + 1)} className="btn btn-secondary btn-sm">Next <FiChevronRight /></button>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}

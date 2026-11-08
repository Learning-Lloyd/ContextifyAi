import { FiArrowRight, FiCalendar, FiCheckCircle, FiCpu, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const steps = [
  { number: '01', title: 'Add tasks', description: 'Add a title and deadline. A duration helps Contextify plan your time.', icon: FiPlus },
  { number: '02', title: 'Analyze tasks', description: 'Select tasks in Decision Lab to compare their priorities.', icon: FiCpu },
  { number: '03', title: 'Choose what’s next', description: 'Review the recommendation and its reasons.', icon: FiCheckCircle },
  { number: '04', title: 'Plan your day', description: 'Set your available time in Profile to get schedule suggestions.', icon: FiCalendar },
];

export default function Help() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-7 animate-fade-in">
        <div className="pb-3 border-b border-[var(--app-border)]"><h1 className="page-title">How to use Contextify</h1></div>
        <div className="grid gap-3">{steps.map(({ number, title, description, icon: Icon }) => <article key={number} className="card p-5 flex gap-4"><span className="text-sm font-mono text-[var(--app-text-muted)] mt-1">{number}</span><Icon className="text-[#285E4D] mt-0.5 shrink-0" /><div><h2 className="font-bold text-[var(--app-text)]">{title}</h2><p className="text-sm text-[var(--app-text-secondary)] mt-1">{description}</p></div></article>)}</div>
        <details className="card p-5"><summary className="cursor-pointer font-bold text-[var(--app-text)]">How priority is calculated</summary><p className="text-sm text-[var(--app-text-secondary)] mt-2">Importance 40% · Urgency 30% · Available time 20% · Workload 10%. AI can help with descriptions and explanations, but it cannot change the formula or scores.</p></details>
        <div className="flex flex-wrap gap-2"><Link to="/tasks?new=1" className="btn btn-primary"><FiPlus /> Add task</Link><Link to="/decision-lab" className="btn btn-secondary">Decision Lab <FiArrowRight /></Link><Link to="/profile" className="btn btn-ghost">Profile</Link></div>
      </div>
    </Layout>
  );
}

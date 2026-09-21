import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCornerDownRight,
  FiInbox,
  FiMessageSquare,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSliders,
  FiStar,
  FiThumbsUp,
  FiTrash2,
  FiX,
  FiZap,
} from 'react-icons/fi';
import AdminLayout from '../../components/AdminLayout';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import StatCard from '../../components/StatCard';
import { useToast } from '../../hooks/useToast';
import { feedbackService } from '../../services/feedbackService';

const CATEGORIES = [
  { key: 'general', label: 'General Feedback', icon: FiMessageSquare },
  { key: 'bug', label: 'Bug Report', icon: FiAlertTriangle },
  { key: 'feature', label: 'Feature Request', icon: FiZap },
  { key: 'usability', label: 'Usability & UX', icon: FiThumbsUp },
  { key: 'prioritization', label: 'Prioritization Accuracy', icon: FiSliders },
];

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: FiClock,
  },
  reviewed: {
    label: 'Reviewed',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: FiMessageSquare,
  },
  resolved: {
    label: 'Resolved',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: FiCheckCircle,
  },
};

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    resolved: 0,
    avg_rating: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal Detail & Response State
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [modalStatus, setModalStatus] = useState('reviewed');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await feedbackService.getAdminFeedback(params);
      setFeedbacks(res.feedbacks?.data || []);
      if (res.stats) setStats(res.stats);
    } catch {
      showToast('Failed to load user feedback.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFeedback();
  };

  const openDetailModal = (item) => {
    setActiveFeedback(item);
    setResponseText(item.admin_response || '');
    setModalStatus(item.status === 'pending' ? 'reviewed' : item.status);
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim()) {
      showToast('Please enter a response message.', 'error');
      return;
    }

    setSubmittingResponse(true);
    try {
      const res = await feedbackService.respondToFeedback(
        activeFeedback.id,
        responseText.trim(),
        modalStatus
      );

      showToast(res.message || 'Response sent successfully!', 'success');
      setActiveFeedback(null);
      fetchFeedback();
    } catch (err) {
      showToast(
        err.response?.data?.message || 'Failed to submit response.',
        'error'
      );
    } finally {
      setSubmittingResponse(false);
    }
  };

  const _handleQuickStatusChange = async (feedbackId, newStatus) => {
    try {
      await feedbackService.updateAdminFeedback(feedbackId, { status: newStatus });
      showToast(`Status updated to ${newStatus}.`, 'success');
      fetchFeedback();
    } catch {
      showToast('Failed to update status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await feedbackService.deleteAdminFeedback(deleteTarget.id);
      showToast('Feedback deleted successfully.', 'success');
      setDeleteTarget(null);
      if (activeFeedback?.id === deleteTarget.id) {
        setActiveFeedback(null);
      }
      fetchFeedback();
    } catch {
      showToast('Failed to delete feedback.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[var(--app-border)]">
          <div>
            <h1 className="page-title">User Feedback Management</h1>
            <p className="page-subtitle text-xs sm:text-sm">
              Review user ratings, triage bug reports, and respond to feature suggestions
            </p>
          </div>

          <button
            type="button"
            onClick={fetchFeedback}
            className="btn btn-secondary btn-sm text-xs self-start sm:self-auto"
          >
            <FiRefreshCw size={13} /> Refresh List
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={FiInbox}
            label="Total Feedback"
            value={stats.total}
            color="#2563EB"
          />
          <StatCard
            icon={FiClock}
            label="Pending Review"
            value={stats.pending}
            color="#F59E0B"
          />
          <StatCard
            icon={FiMessageSquare}
            label="Reviewed"
            value={stats.reviewed}
            color="#3B82F6"
          />
          <StatCard
            icon={FiCheckCircle}
            label="Resolved"
            value={stats.resolved}
            color="#10B981"
          />
          <StatCard
            icon={FiStar}
            label="Average Rating"
            value={`${stats.avg_rating || 0} / 5`}
            color="#8B5CF6"
          />
        </div>

        {/* Filters & Search Toolbar */}
        <div className="card p-4 space-y-3 bg-[var(--app-card)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {['all', 'pending', 'reviewed', 'resolved'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-muted)]'
                  }`}
                >
                  {st === 'all' ? 'All Feedback' : st}
                </button>
              ))}
            </div>

            {/* Category Dropdown & Search Form */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input text-xs py-1.5 h-9"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>

              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
                <div className="relative">
                  <FiSearch
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)]"
                    size={14}
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search user or message..."
                    className="input text-xs pl-8 h-9 w-48 sm:w-60"
                  />
                </div>
                <button type="submit" className="btn btn-secondary btn-sm h-9 text-xs">
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Feedback List Table */}
        <div className="card overflow-hidden bg-[var(--app-card)]">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton count={5} height="h-16" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={FiInbox}
                title="No feedback found"
                description="There is no feedback matching your filter criteria."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--app-surface)] border-b border-[var(--app-border)] text-[var(--app-text-muted)] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--app-border)]">
                  {feedbacks.map((item) => {
                    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    const StatusIcon = statusInfo.icon;
                    const catInfo = CATEGORIES.find((c) => c.key === item.type);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[var(--app-surface)]/60 transition-colors"
                      >
                        {/* User */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                              {item.user?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--app-text)]">
                                {item.user?.name || 'Anonymous'}
                              </p>
                              <p className="text-[11px] text-[var(--app-text-muted)]">
                                {item.user?.email || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--app-muted)] text-[var(--app-text)] font-medium">
                            {catInfo?.label || item.type}
                          </span>
                        </td>

                        {/* Rating */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {item.rating ? (
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[...Array(item.rating)].map((_, i) => (
                                <FiStar key={i} size={11} className="fill-amber-400" />
                              ))}
                              <span className="ml-1 text-[11px] text-[var(--app-text-muted)] font-mono">
                                ({item.rating})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[var(--app-text-muted)] italic">None</span>
                          )}
                        </td>

                        {/* Message Preview */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="truncate text-[var(--app-text)] font-normal">
                            {item.message}
                          </p>
                          {item.admin_response && (
                            <div className="flex items-center gap-1 text-[10px] text-[#2563EB] font-semibold mt-0.5">
                              <FiCornerDownRight size={10} />
                              <span>Responded</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold inline-flex items-center gap-1 ${statusInfo.badge}`}
                          >
                            <StatusIcon size={10} />
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* Submitted Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-[var(--app-text-muted)]">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetailModal(item)}
                              className="btn btn-secondary btn-sm text-xs px-2.5 py-1"
                            >
                              View & Respond
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                              title="Delete Feedback"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail & Response Modal */}
        {activeFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 modal-overlay"
              onClick={() => setActiveFeedback(null)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-2xl card p-6 space-y-5 z-10 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
                    <FiMessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--app-text)]">
                      Feedback Details & Response
                    </h3>
                    <p className="text-xs text-[var(--app-text-secondary)]">
                      Submitted on {new Date(activeFeedback.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveFeedback(null)}
                  className="p-1.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] rounded-lg"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* User Meta Card */}
              <div className="p-3.5 rounded-xl bg-[var(--app-surface)] border border-[var(--app-border)] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                    User
                  </span>
                  <span className="font-semibold text-[var(--app-text)]">
                    {activeFeedback.user?.name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                    Email
                  </span>
                  <span className="font-semibold text-[var(--app-text)] truncate block">
                    {activeFeedback.user?.email || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                    Category
                  </span>
                  <span className="font-semibold text-[var(--app-text)] capitalize">
                    {activeFeedback.type}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--app-text-muted)] block">
                    Rating
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {activeFeedback.rating ? (
                      [...Array(activeFeedback.rating)].map((_, i) => (
                        <FiStar key={i} size={11} className="fill-amber-400" />
                      ))
                    ) : (
                      <span className="text-[var(--app-text-muted)] italic">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Block */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] block">
                  User Feedback Message:
                </label>
                <div className="p-4 rounded-xl bg-[var(--app-card)] border border-[var(--app-border)] text-xs sm:text-sm text-[var(--app-text)] leading-relaxed whitespace-pre-line">
                  {activeFeedback.message}
                </div>
              </div>

              {/* Response Form */}
              <form onSubmit={handleSendResponse} className="space-y-4 pt-2 border-t border-[var(--app-border)]">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] block">
                    Administrator Response
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--app-text-muted)]">Set Status:</span>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                      className="input text-xs py-1 h-8"
                    >
                      <option value="pending">Pending</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Type an official response to the user's feedback or report..."
                  className="input w-full text-xs sm:text-sm leading-relaxed"
                />

                {activeFeedback.responder && (
                  <p className="text-[11px] text-[var(--app-text-muted)] italic">
                    Last responded by {activeFeedback.responder.name} on{' '}
                    {new Date(activeFeedback.responded_at).toLocaleString()}
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(activeFeedback);
                    }}
                    className="btn btn-ghost text-xs text-red-500 hover:bg-red-500/10"
                  >
                    <FiTrash2 size={13} /> Delete Feedback
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveFeedback(null)}
                      className="btn btn-ghost text-xs"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={submittingResponse}
                      className="btn btn-primary text-xs"
                    >
                      <FiSend size={13} />
                      {submittingResponse ? 'Sending Response...' : 'Save & Send Response'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={!!deleteTarget}
          title="Delete User Feedback?"
          message="Are you sure you want to delete this feedback submission? This action cannot be undone."
          confirmLabel={deleting ? 'Deleting...' : 'Yes, Delete Feedback'}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCornerDownRight,
  FiInbox,
  FiMessageSquare,
  FiSend,
  FiSliders,
  FiStar,
  FiThumbsUp,
  FiZap,
} from 'react-icons/fi';
import EmptyState from '../components/EmptyState';
import Layout from '../components/Layout';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../hooks/useToast';
import { feedbackService } from '../services/feedbackService';

const CATEGORIES = [
  { key: 'general', label: 'General Feedback', icon: FiMessageSquare },
  { key: 'bug', label: 'Bug Report', icon: FiAlertTriangle },
  { key: 'feature', label: 'Feature Request', icon: FiZap },
  { key: 'usability', label: 'Usability & UX', icon: FiThumbsUp },
  { key: 'prioritization', label: 'Prioritization Accuracy', icon: FiSliders },
];

const RATING_LABELS = {
  1: 'Poor — Significant issues encountered',
  2: 'Fair — Needs noticeable improvement',
  3: 'Good — Works as expected',
  4: 'Very Good — Smooth and helpful experience',
  5: 'Excellent — Exceeded expectations',
};

const STATUS_CONFIG = {
  pending: {
    label: 'Pending Review',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: FiClock,
  },
  reviewed: {
    label: 'Reviewed',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: FiMessageSquare,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: FiCheckCircle,
  },
};

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState('general');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const { showToast } = useToast();

  const fetchUserFeedback = async () => {
    try {
      setLoading(true);
      const res = await feedbackService.getUserFeedback();
      setFeedbacks(res.data || []);
    } catch {
      showToast('Failed to load past feedback submissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserFeedback();
  }, []);

  const validate = () => {
    const errs = {};
    if (!message.trim()) {
      errs.message = 'Please provide your feedback message.';
    } else if (message.trim().length < 3) {
      errs.message = 'Message must be at least 3 characters long.';
    } else if (message.length > 2000) {
      errs.message = 'Message cannot exceed 2000 characters.';
    }

    if (rating < 1 || rating > 5) {
      errs.rating = 'Please provide a rating between 1 and 5 stars.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await feedbackService.submitFeedback({
        type,
        rating,
        message: message.trim(),
      });

      showToast(res.message || 'Feedback submitted successfully!', 'success');
      setMessage('');
      setRating(5);
      setType('general');
      setErrors({});

      // Refresh list
      fetchUserFeedback();
    } catch (err) {
      const validationErrors = err.response?.data?.errors;
      if (validationErrors) {
        setErrors(
          Object.fromEntries(
            Object.entries(validationErrors).map(([k, v]) => [k, v[0]])
          )
        );
      }
      showToast(
        err.response?.data?.message || 'Failed to submit feedback. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Page Header */}
        <div className="pb-2 border-b border-[var(--app-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
              <FiMessageSquare size={20} />
            </div>
            <div>
              <h1 className="page-title">Feedback & Suggestions</h1>
              <p className="page-subtitle text-xs sm:text-sm">
                Share your experience, feature requests, or report issues to help continuously improve Contextify
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left / Top Form: Submit Feedback */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 space-y-5 bg-[var(--app-card)]">
              <div className="border-b border-[var(--app-border)] pb-3">
                <h2 className="text-base font-bold text-[var(--app-text)]">
                  Submit Feedback
                </h2>
                <p className="text-xs text-[var(--app-text-muted)]">
                  Your feedback goes directly to the project administrators.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] block">
                    Feedback Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = type === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => setType(cat.key)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                            isSelected
                              ? 'border-[#2563EB] bg-blue-500/[0.08] text-[#2563EB] shadow-xs'
                              : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:border-[var(--app-text-muted)]/40 hover:text-[var(--app-text)]'
                          }`}
                        >
                          <Icon size={14} className={isSelected ? 'text-[#2563EB]' : 'text-[var(--app-text-muted)]'} />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Star Rating */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] block">
                      Overall Rating
                    </label>
                    <span className="text-xs font-mono font-bold text-[#2563EB]">
                      {hoverRating || rating} / 5 Stars
                    </span>
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-colors"
                        aria-label={`Rate ${star} star`}
                      >
                        <FiStar
                          size={24}
                          className={`${
                            star <= (hoverRating || rating)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          } transition-all`}
                        />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-[var(--app-text-muted)] italic">
                    {RATING_LABELS[hoverRating || rating]}
                  </p>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)] block">
                      Message / Details
                    </label>
                    <span
                      className={`text-[11px] font-mono ${
                        message.length > 2000 ? 'text-red-500 font-bold' : 'text-[var(--app-text-muted)]'
                      }`}
                    >
                      {message.length} / 2000
                    </span>
                  </div>

                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your suggestion, the bug you encountered, or thoughts on the decision prioritization results..."
                    className={`input w-full text-sm leading-relaxed ${
                      errors.message ? 'border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {errors.message && (
                    <p className="text-xs text-red-500 mt-1">{errors.message}</p>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary w-full justify-center py-2.5 text-sm font-semibold shadow-sm"
                >
                  <FiSend size={15} />
                  {submitting ? 'Submitting Feedback...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>

          {/* Right / Bottom Section: Past Feedback History */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between gap-3 pb-1">
              <div>
                <h2 className="text-base font-bold text-[var(--app-text)]">
                  My Feedback Submissions
                </h2>
                <p className="text-xs text-[var(--app-text-muted)]">
                  Track status updates and responses from the system administrator
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--app-muted)] text-[var(--app-text-secondary)]">
                {feedbacks.length} Submissions
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                <LoadingSkeleton height="h-28" count={3} />
              </div>
            ) : feedbacks.length === 0 ? (
              <EmptyState
                icon={FiInbox}
                title="No feedback submitted yet"
                description="Your submitted feedback and administrator replies will be archived and displayed here."
              />
            ) : (
              <div className="space-y-4">
                {feedbacks.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo.icon;
                  const categoryItem = CATEGORIES.find((c) => c.key === item.type);
                  const CategoryIcon = categoryItem?.icon || FiMessageSquare;

                  return (
                    <div
                      key={item.id}
                      className="card p-5 space-y-3.5 bg-[var(--app-card)] border border-[var(--app-border)] hover:border-[var(--app-text-muted)]/30 transition-all"
                    >
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Category Badge */}
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-[var(--app-muted)] text-[var(--app-text)]">
                            <CategoryIcon size={12} className="text-[#2563EB]" />
                            <span>{categoryItem?.label || item.type}</span>
                          </span>

                          {/* Star Rating Display */}
                          {item.rating && (
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[...Array(item.rating)].map((_, i) => (
                                <FiStar key={i} size={13} className="fill-amber-400" />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Status Badge & Timestamp */}
                        <div className="flex items-center gap-2.5 text-xs">
                          <span
                            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1.5 ${statusInfo.color}`}
                          >
                            <StatusIcon size={11} />
                            {statusInfo.label}
                          </span>
                          <span className="text-[var(--app-text-muted)] text-[11px]">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* User's Message */}
                      <p className="text-xs sm:text-sm text-[var(--app-text)] leading-relaxed whitespace-pre-line">
                        {item.message}
                      </p>

                      {/* Administrator Response Callout */}
                      {item.admin_response && (
                        <div className="mt-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#2563EB]">
                            <FiCornerDownRight size={14} />
                            <span>Admin Response</span>
                            {item.responder && (
                              <span className="text-[var(--app-text-muted)] font-normal text-[11px]">
                                by {item.responder.name}
                              </span>
                            )}
                            {item.responded_at && (
                              <span className="text-[var(--app-text-muted)] font-normal text-[11px]">
                                · {new Date(item.responded_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] leading-relaxed whitespace-pre-line pl-5">
                            {item.admin_response}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

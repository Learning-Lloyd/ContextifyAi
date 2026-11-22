import {
  FiActivity,
  FiAward,
  FiBell,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiFileText,
  FiGrid,
  FiList,
  FiMessageCircle,
  FiPlay,
  FiTrello,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from 'react-icons/fi';

export default function AuthDecorations() {
  return (
    <div className="auth-decorations" aria-hidden="true">
      <div className="auth-ghost auth-ghost-calendar" />
      <div className="auth-ghost auth-ghost-target" />
      <div className="auth-ghost auth-ghost-chart" />

      <div className="auth-float auth-schedule">
        <div className="auth-widget-title"><FiCalendar /><b>Schedule</b></div>
        <span /><span /><span /><span /><span /><span /><span /><span />
      </div>
      <div className="auth-float auth-complete"><FiCheckCircle /><span /></div>
      <div className="auth-float auth-grid"><i /><i /><i /><i /></div>
      <div className="auth-float auth-checklist"><FiCheckSquare /><span /><i /><span /></div>
      <div className="auth-float auth-notification"><FiBell /><i /></div>
      <div className="auth-float auth-team"><FiUsers /><i /><i /></div>
      <div className="auth-float auth-task-card"><i /><b /><span /><span /></div>
      <div className="auth-float auth-due"><FiZap /> Due Today</div>
      <div className="auth-float auth-velocity">
        <div className="auth-widget-title"><FiTrendingUp /><b>Velocity</b></div>
        <svg viewBox="0 0 100 42"><polyline points="2,34 22,24 42,29 61,11 78,18 98,3" /><circle cx="98" cy="3" r="3" /></svg>
      </div>
      <div className="auth-float auth-blocked">BLOCKED</div>
      <div className="auth-float auth-timer"><FiClock /><b>25:00</b><FiPlay /></div>
      <div className="auth-float auth-terminal">
        <div><i /><i /><i /></div><span>›</span><b /><span>›</span><b />
      </div>
      <div className="auth-float auth-progress">
        <FiActivity /><b>75% Done</b><span />
      </div>
      <div className="auth-float auth-status">IN PROGRESS</div>
      <div className="auth-float auth-chat"><FiMessageCircle /><span /></div>
      <div className="auth-float auth-ai"><FiZap /> AI Optimized</div>
      <div className="auth-float auth-board"><FiTrello /></div>
      <div className="auth-float auth-mini-grid"><FiList /></div>
      <div className="auth-float auth-trophy"><FiAward /></div>
      <div className="auth-float auth-brief"><FiFileText /> brief.pdf</div>
      <div className="auth-float auth-done"><FiCheck /></div>
      <div className="auth-float auth-settings"><FiGrid /><span /></div>
    </div>
  );
}

import { FiInbox } from 'react-icons/fi';

export default function EmptyState({ icon: Icon = FiInbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[var(--app-muted)] flex items-center justify-center mb-5">
        <Icon size={28} className="text-[var(--app-text-muted)]" />
      </div>
      {title && (
        <h3 className="text-lg font-semibold text-[var(--app-text)] mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-[var(--app-text-secondary)] max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn btn-primary"
        >
          {action.icon && <action.icon size={16} />}
          {action.label}
        </button>
      )}
    </div>
  );
}

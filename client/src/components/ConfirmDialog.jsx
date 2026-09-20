import { useEffect, useRef } from 'react';
import { FiAlertTriangle, FiInfo, FiTrash2 } from 'react-icons/fi';

const VARIANTS = {
  danger: {
    icon: FiTrash2,
    iconColor: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.1)',
    confirmBtn: 'btn btn-danger',
  },
  warning: {
    icon: FiAlertTriangle,
    iconColor: '#F59E0B',
    iconBg: 'rgba(245, 158, 11, 0.1)',
    confirmBtn: 'btn btn-primary',
  },
  info: {
    icon: FiInfo,
    iconColor: '#2563EB',
    iconBg: 'rgba(37, 99, 235, 0.1)',
    confirmBtn: 'btn btn-primary',
  },
};

export default function ConfirmDialog({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      confirmRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 modal-overlay" onClick={onCancel} aria-hidden="true" />
      <div
        className="relative card w-full max-w-sm p-6 animate-fade-in text-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: v.iconBg }}
        >
          <Icon size={22} style={{ color: v.iconColor }} />
        </div>
        <h3 id="confirm-title" className="text-lg font-semibold text-[var(--app-text)] mb-2">
          {title}
        </h3>
        <p id="confirm-message" className="text-sm text-[var(--app-text-secondary)] mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-1">
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className={`${v.confirmBtn} flex-1`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

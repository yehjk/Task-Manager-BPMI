// /client/src/components/ModalDialogs.jsx
import React from "react";

export function TextInputModal({
  show,
  title,
  label,
  value,
  placeholder = "",
  onChange,
  onCancel,
  onSubmit,
  submitLabel = "OK",
  submitting = false,
  error,
}) {
  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
      tabIndex="-1"
      role="dialog"
      onClick={onCancel}
    >
      <div
        className="modal-dialog modal-sm modal-dialog-centered"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title">{title}</h6>
            <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
          </div>

          <div className="modal-body">
            {label && (
              <label className="form-label small" htmlFor="text-input-modal">
                {label}
              </label>
            )}

            <input
              id="text-input-modal"
              type="text"
              className="form-control form-control-sm"
              value={value}
              placeholder={placeholder}
              autoFocus
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />

            {error && <div className="text-danger small mt-2">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onSubmit} disabled={submitting}>
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  show,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
}) {
  if (!show) return null;

  const confirmClass = `btn btn-${confirmVariant} btn-sm`;

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
      tabIndex="-1"
      role="dialog"
      onClick={onCancel}
    >
      <div
        className="modal-dialog modal-sm modal-dialog-centered"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h6 className="modal-title">{title}</h6>
            <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
          </div>

          <div className="modal-body small">{message}</div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="button" className={confirmClass} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

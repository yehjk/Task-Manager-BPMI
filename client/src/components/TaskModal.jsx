// /client/src/components/TaskModal.jsx
// Modal that shows task details and audit log.
// Allows:
// - editing task title (PATCH /tasks/:id via board-store)
// - deleting task via onDelete callback from parent.

import React, { useEffect, useState } from "react";
import { apiClient } from "../api/api-client.js";
import { useBoardStore } from "../store/board-store.js";

export function TaskModal({ task, onClose, onDelete }) {
  const [audit, setAudit] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);

  // local editable title
  const [title, setTitle] = useState(task.title);
  const [saving, setSaving] = useState(false);

  const updateTask = useBoardStore((s) => s.updateTask);

  // keep local title in sync when user opens another task
  useEffect(() => {
    setTitle(task.title);
  }, [task.id, task.title]);

  useEffect(() => {
    let cancelled = false;

    async function loadAudit() {
      setLoadingAudit(true);
      setAuditError(null);
      try {
        const entries = await apiClient.get(
          `/audit?entity=task&entityId=${encodeURIComponent(task.id)}`
        );
        if (!cancelled) setAudit(entries);
      } catch (err) {
        console.error(err);
        if (!cancelled) setAuditError(err.message || "Failed to load audit");
      } finally {
        if (!cancelled) setLoadingAudit(false);
      }
    }

    loadAudit();
    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      alert("Title cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      await updateTask(task.id, { title: trimmed });
      // после успешного апдейта карточка обновится из store,
      // модалку можно оставить открытой
    } catch (err) {
      console.error(err);
      alert("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
      tabIndex="-1"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-lg modal-dialog-centered"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="mdi mdi-clipboard-text-outline me-2" />
              Task details
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          <div className="modal-body">
            {/* Editable title */}
            <div className="mb-3">
              <label className="form-label small fw-semibold">Title</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <hr />

            <h6 className="small text-uppercase text-muted mb-2">
              Audit log
            </h6>
            {loadingAudit ? (
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm me-2" />
                <span className="small">Loading audit…</span>
              </div>
            ) : auditError ? (
              <div className="alert alert-danger py-1 px-2 small">
                {auditError}
              </div>
            ) : audit.length === 0 ? (
              <div className="text-muted small">
                No audit entries for this task yet.
              </div>
            ) : (
              <ul className="list-unstyled small mb-0">
                {audit.map((entry) => (
                  <li key={entry.id} className="mb-1">
                    <span className="badge bg-light text-dark me-2">
                      {entry.action}
                    </span>
                    <span className="text-muted">
                      {entry.actor} at{" "}
                      {new Date(entry.ts).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm me-auto"
              onClick={onDelete}
            >
              <i className="mdi mdi-delete-outline me-1" />
              Delete task
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

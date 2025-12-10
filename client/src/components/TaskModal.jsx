// /client/src/components/TaskModal.jsx
// Modal that shows ticket details and its audit log.

import React, { useEffect, useState } from "react";
import { apiClient } from "../api/api-client.js";
import { useBoardStore } from "../store/board-store.js";
import { ConfirmModal } from "./ModalDialogs.jsx";

export function TaskModal({ task, boardId, onClose, onDelete }) {
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [ticketError, setTicketError] = useState(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [audit, setAudit] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [showAudit, setShowAudit] = useState(false); // collapsed by default

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadBoardDetails = useBoardStore((s) => s.loadBoardDetails);

  useEffect(() => {
    let cancelled = false;

    async function loadTicket() {
      setLoadingTicket(true);
      setTicketError(null);
      try {
        const t = await apiClient.get(`/tickets/${task.id}`);
        if (cancelled) return;
        setTitle(t.title);
        setDescription(t.description || "");
        setAssigneeId(t.assigneeId || "");
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setTicketError(err.message || "Failed to load ticket");
        }
      } finally {
        if (!cancelled) setLoadingTicket(false);
      }
    }

    async function loadAuditData() {
      setLoadingAudit(true);
      setAuditError(null);
      try {
        const ticketEntries = await apiClient.get(
          `/audit?entity=ticket&entityId=${encodeURIComponent(task.id)}`
        );
        const taskEntries = await apiClient.get(
          `/audit?entity=task&entityId=${encodeURIComponent(task.id)}`
        );

        if (cancelled) return;

        const all = [...ticketEntries, ...taskEntries].sort((a, b) => {
          return new Date(a.ts).getTime() - new Date(b.ts).getTime();
        });
        setAudit(all);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setAuditError(err.message || "Failed to load audit");
        }
      } finally {
        if (!cancelled) setLoadingAudit(false);
      }
    }

    loadTicket();
    loadAuditData();

    return () => {
      cancelled = true;
    };
  }, [task.id]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("Title cannot be empty.");
      return;
    }

    const body = {
      title: trimmedTitle,
      description,
      assigneeId: assigneeId || null,
    };

    try {
      setSaving(true);
      setFormError("");
      await apiClient.patch(`/tickets/${task.id}`, body);

      if (boardId) {
        await loadBoardDetails(boardId);
      }

      // Refresh audit log after saving
      try {
        const ticketEntries = await apiClient.get(
          `/audit?entity=ticket&entityId=${encodeURIComponent(task.id)}`
        );
        const taskEntries = await apiClient.get(
          `/audit?entity=task&entityId=${encodeURIComponent(task.id)}`
        );
        const all = [...ticketEntries, ...taskEntries].sort((a, b) => {
          return new Date(a.ts).getTime() - new Date(b.ts).getTime();
        });
        setAudit(all);
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.payload?.message || err.message || "Failed to update ticket";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
                Ticket details
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>

            <div className="modal-body">
              {loadingTicket ? (
                <div className="d-flex align-items-center mb-3">
                  <div className="spinner-border spinner-border-sm me-2" />
                  <span className="small">Loading ticket…</span>
                </div>
              ) : ticketError ? (
                <div className="alert alert-danger py-2 px-3 small">
                  {ticketError}
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Title
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Description
                    </label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Assignee
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="demo@example.com"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    />
                  </div>

                  {formError && (
                    <div className="alert alert-danger py-2 px-3 small">
                      {formError}
                    </div>
                  )}

                  <hr />

                  {/* Audit log with toggle */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="small text-uppercase text-muted mb-0">
                      Audit log
                    </h6>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      onClick={() => setShowAudit((v) => !v)}
                    >
                      {showAudit ? "Hide" : "Show"}
                    </button>
                  </div>

                  {showAudit && (
                    <>
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
                          No audit entries for this ticket yet.
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
                    </>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm me-auto"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <i className="mdi mdi-delete-outline me-1" />
                Delete task
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving || loadingTicket}
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

      {/* Confirmation dialog for task deletion */}
      <ConfirmModal
        show={showDeleteConfirm}
        title="Delete task"
        message={`Delete task "${title}"?`}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          if (onDelete) onDelete();
        }}
        confirmVariant="danger"
        confirmLabel="Delete"
      />
    </>
  );
}

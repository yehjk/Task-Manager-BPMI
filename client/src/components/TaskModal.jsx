// /client/src/components/TaskModal.jsx
import React, { useEffect, useState } from "react";
import { apiClient } from "../api/api-client.js";
import { useBoardStore } from "../store/board-store.js";
import { ConfirmModal } from "./ModalDialogs.jsx";
import { useToast } from "./ToastProvider.jsx";

function pretty(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function humanAction(action) {
  const map = {
    TASK_CREATED: "Created",
    TASK_MOVED: "Moved",
    TASK_UPDATED: "Updated",
    TASK_DELETED: "Deleted",
  };
  if (map[action]) return map[action];
  return String(action || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function actionBadge(action) {
  if (action === "TASK_CREATED") return "bg-success";
  if (action === "TASK_MOVED") return "bg-primary";
  if (action === "TASK_UPDATED") return "bg-secondary";
  if (action === "TASK_DELETED") return "bg-danger";
  return "bg-light text-dark";
}

export function TaskModal({ task, boardId, onClose, onDelete }) {
  const { showToast } = useToast();

  const [loadingTicket, setLoadingTicket] = useState(true);
  const [ticketError, setTicketError] = useState(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const [createdAt, setCreatedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [audit, setAudit] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [showAudit, setShowAudit] = useState(false);

  const [rawAuditOpen, setRawAuditOpen] = useState({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadBoardDetails = useBoardStore((s) => s.loadBoardDetails);
  const columns = useBoardStore((s) => s.columns);

  const colName = (id) => {
    const c = (columns || []).find((x) => String(x.id) === String(id));
    return c?.title || (id ? String(id).slice(0, 8) : "unknown");
  };

  const describeAudit = (entry) => {
    const a = entry?.action || "";
    const d = entry?.details || {};

    if (a === "TASK_CREATED") {
      const t = d.title ? `"${d.title}"` : "task";
      const col = d.columnId ? colName(d.columnId) : null;
      const pos = d.position != null ? `#${d.position}` : null;
      return `Created ${t}${col ? ` in "${col}"` : ""}${pos ? ` at ${pos}` : ""}.`;
    }

    if (a === "TASK_MOVED") {
      const from = d.from || {};
      const to = d.to || {};
      const fromCol = from.columnId ? colName(from.columnId) : "unknown";
      const toCol = to.columnId ? colName(to.columnId) : "unknown";
      const fromPos = from.position != null ? `#${from.position}` : null;
      const toPos = to.position != null ? `#${to.position}` : null;
      return `Moved from "${fromCol}"${fromPos ? ` (${fromPos})` : ""} to "${toCol}"${
        toPos ? ` (${toPos})` : ""
      }.`;
    }

    if (a === "TASK_UPDATED") {
      const patch = d.patch || d.changes || d;
      const parts = [];

      if (patch && typeof patch === "object") {
        if ("title" in patch) parts.push(`title → "${patch.title}"`);
        if ("description" in patch) parts.push("description updated");
        if ("assigneeId" in patch)
          parts.push(patch.assigneeId ? `assignee → ${patch.assigneeId}` : "assignee removed");
        if ("columnId" in patch) parts.push(`column → "${colName(patch.columnId)}"`);
        if ("position" in patch) parts.push(`position → #${patch.position}`);
      }

      return parts.length ? `Updated: ${parts.join(", ")}.` : "Updated task.";
    }

    if (a === "TASK_DELETED") {
      return "Deleted task.";
    }

    return "";
  };

  const loadAuditData = async () => {
    setLoadingAudit(true);
    setAuditError(null);
    try {
      const entries = await apiClient.get(`/audit?entity=task&entityId=${encodeURIComponent(task.id)}`);

      const all = (Array.isArray(entries) ? entries : []).sort(
        (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );
      setAudit(all);
    } catch (err) {
      setAuditError(err.message || "Failed to load audit");
    } finally {
      setLoadingAudit(false);
    }
  };

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
        setCreatedAt(t.createdAt || null);
        setUpdatedAt(t.updatedAt || null);
      } catch (err) {
        if (!cancelled) setTicketError(err.message || "Failed to load ticket");
      } finally {
        if (!cancelled) setLoadingTicket(false);
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
      const updated = await apiClient.patch(`/tasks/${task.id}`, body);

      setUpdatedAt(updated.updatedAt || null);

      if (boardId) {
        await loadBoardDetails(boardId);
      }

      showToast("Ticket updated", { variant: "success" });
      await loadAuditData();
    } catch (err) {
      const msg = err.payload?.message || err.message || "Failed to update ticket";
      setFormError(msg);
      showToast(msg, { variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const createdText = createdAt ? new Date(createdAt).toLocaleString() : "—";
  const updatedText = updatedAt ? new Date(updatedAt).toLocaleString() : "—";

  return (
    <>
      <div
        className="modal fade show"
        style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
        tabIndex="-1"
        role="dialog"
        onClick={onClose}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="mdi mdi-clipboard-text-outline me-2" />
                Ticket details
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>

            <div className="modal-body">
              {loadingTicket ? (
                <div className="d-flex align-items-center mb-3">
                  <div className="spinner-border spinner-border-sm me-2" />
                  <span className="small">Loading ticket…</span>
                </div>
              ) : ticketError ? (
                <div className="alert alert-danger py-2 px-3 small">{ticketError}</div>
              ) : (
                <>
                  <div className="d-flex gap-3 flex-wrap mb-3">
                    <span className="badge bg-light text-dark">
                      <i className="mdi mdi-calendar-outline me-1" />
                      Created: {createdText}
                    </span>
                    <span className="badge bg-light text-dark">
                      <i className="mdi mdi-update me-1" />
                      Updated: {updatedText}
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Title</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Description</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Assignee (email)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="demo@example.com"
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                    />
                  </div>

                  {formError && <div className="alert alert-danger py-2 px-3 small">{formError}</div>}

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="small text-uppercase text-muted mb-0">Audit log</h6>
                    <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setShowAudit((v) => !v)}>
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
                        <div className="alert alert-danger py-1 px-2 small">{auditError}</div>
                      ) : audit.length === 0 ? (
                        <div className="text-muted small">No audit entries for this task yet.</div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {audit.map((entry) => {
                            const id = entry.id || `${entry.action}-${entry.ts}`;
                            const text = describeAudit(entry);

                            return (
                              <div key={id} className="border rounded p-2">
                                <div className="d-flex justify-content-between flex-wrap gap-2 align-items-center">
                                  <span className={"badge " + actionBadge(entry.action)}>{humanAction(entry.action)}</span>
                                  <span className="small text-muted">
                                    {entry.actor} • {new Date(entry.ts).toLocaleString()}
                                  </span>
                                </div>

                                {text ? <div className="small mt-2">{text}</div> : null}

                                {entry.details != null ? (
                                  <button
                                    type="button"
                                    className="btn btn-link btn-sm p-0 mt-1"
                                    onClick={() => setRawAuditOpen((s) => ({ ...s, [id]: !s[id] }))}
                                  >
                                    {rawAuditOpen[id] ? "Hide raw" : "Show raw"}
                                  </button>
                                ) : null}

                                {rawAuditOpen[id] && entry.details != null ? (
                                  <pre
                                    className="small mt-2 mb-0"
                                    style={{
                                      background: "#f8f9fa",
                                      borderRadius: 8,
                                      padding: 10,
                                      overflow: "auto",
                                      maxHeight: 220,
                                    }}
                                  >
{pretty(entry.details)}
                                  </pre>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
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

              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

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

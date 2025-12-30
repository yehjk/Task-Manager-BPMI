// /client/src/pages/BoardPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useBoardStore } from "../store/board-store.js";
import ColumnsSection from "../components/ColumnsSection.jsx";
import { TaskModal } from "../components/TaskModal.jsx";
import { TextInputModal, ConfirmModal } from "../components/ModalDialogs.jsx";
import { useAuthStore } from "../store/auth-store.js";
import { apiClient } from "../api/api-client.js";
import { useToast } from "../components/ToastProvider.jsx";

export function BoardPage() {
  const { showToast } = useToast();

  const { boardId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((s) => s.user);

  const storeBoard = useBoardStore((s) => s.board);
  const boards = useBoardStore((s) => s.boards);
  const loadBoards = useBoardStore((s) => s.loadBoards);
  const loadBoardDetails = useBoardStore((s) => s.loadBoardDetails);
  const loadingBoard = useBoardStore((s) => s.loadingBoard);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const labels = useBoardStore((s) => s.labels);
  const createLabel = useBoardStore((s) => s.createLabel);
  const updateLabel = useBoardStore((s) => s.updateLabel);

  const prefetchedBoard = location.state?.board || null;

  const [selectedTask, setSelectedTask] = useState(null);
  const [initialDone, setInitialDone] = useState(false);

  const board = useMemo(() => {
    if (storeBoard?.id === boardId) return storeBoard;
    const fromList = boards.find((b) => b.id === boardId);
    return fromList || (prefetchedBoard?.id === boardId ? prefetchedBoard : null);
  }, [storeBoard, boards, boardId, prefetchedBoard]);

  const boardLabel = (board?.labels?.[0]?.name || labels[0]?.name || null) ?? null;

  const [labelModal, setLabelModal] = useState({ show: false, name: "", error: "" });
  const [inviteModal, setInviteModal] = useState({ show: false, email: "", error: "", submitting: false });

  const [membersModal, setMembersModal] = useState({
    show: false,
    loading: false,
    error: "",
    owner: null,
    members: [],
  });

  const [kickConfirm, setKickConfirm] = useState({
    show: false,
    emailLower: "",
    label: "",
  });

  useEffect(() => {
    let cancelled = false;
    setInitialDone(false);

    (async () => {
      try {
        const st = useBoardStore.getState();
        if (!st.boards?.length) {
          await loadBoards();
        }
        await loadBoardDetails(boardId);
      } finally {
        if (!cancelled) setInitialDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardId, loadBoards, loadBoardDetails]);

  const emailLower = (user?.email || "").toLowerCase();
  const isOwner = useMemo(() => {
    return ((board?.ownerEmailLower || "") + "").toLowerCase() === emailLower;
  }, [board?.ownerEmailLower, emailLower]);

  if ((!initialDone || loadingBoard) && !board) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="alert alert-danger mt-3">
        Board not found{" "}
        <button className="btn btn-link p-0 align-baseline" onClick={() => navigate("/boards")}>
          Back to boards
        </button>
      </div>
    );
  }

  const handleTaskClick = (task) => setSelectedTask(task);

  const handleTaskDelete = async () => {
    if (!selectedTask) return;
    try {
      await deleteTask(selectedTask.id);
      showToast("Task deleted", { variant: "info" });
    } catch {}
    setSelectedTask(null);
  };

  const openEditLabelModal = () => {
    const current = boardLabel || "";
    setLabelModal({ show: true, name: current, error: "" });
  };

  const handleLabelSubmit = async () => {
    const name = labelModal.name.trim();
    if (!name) {
      setLabelModal((s) => ({ ...s, error: "Label cannot be empty." }));
      return;
    }

    try {
      const existingLabel = board.labels && board.labels[0];
      if (existingLabel) {
        await updateLabel(board.id, existingLabel.id, name);
      } else {
        await createLabel(board.id, name);
      }
      await loadBoardDetails(boardId);
      setLabelModal({ show: false, name: "", error: "" });
      showToast("Label updated", { variant: "success" });
    } catch (err) {
      setLabelModal((s) => ({ ...s, error: err.message || "Failed to update board label." }));
    }
  };

  const openInvite = () => setInviteModal({ show: true, email: "", error: "", submitting: false });

  const sendInvite = async () => {
    const email = inviteModal.email.trim();
    if (!email || !email.includes("@")) {
      setInviteModal((s) => ({ ...s, error: "Valid email is required." }));
      return;
    }

    try {
      setInviteModal((s) => ({ ...s, submitting: true, error: "" }));
      await apiClient.post(`/boards/${boardId}/invites`, { email });
      setInviteModal({ show: false, email: "", error: "", submitting: false });
      showToast("Invite sent", { variant: "success" });
    } catch (e) {
      setInviteModal((s) => ({ ...s, submitting: false, error: e.message || "Invite failed" }));
      showToast(e.message || "Invite failed", { variant: "danger" });
    }
  };

  const loadMembers = async () => {
    try {
      setMembersModal((s) => ({ ...s, show: true, loading: true, error: "" }));
      const data = await apiClient.get(`/boards/${boardId}/members`);
      const owner = data?.owner || null;
      const members = Array.isArray(data?.members) ? data.members : [];
      setMembersModal({ show: true, loading: false, error: "", owner, members });
    } catch (e) {
      setMembersModal((s) => ({
        ...s,
        show: true,
        loading: false,
        error: e?.message || "Failed to load members",
        owner: null,
        members: [],
      }));
    }
  };

  const closeMembers = () => setMembersModal({ show: false, loading: false, error: "", owner: null, members: [] });

  const requestKick = (m) => {
    const label = (m?.name || m?.email || m?.emailLower || "").trim();
    setKickConfirm({ show: true, emailLower: m.emailLower, label });
  };

  const doKick = async () => {
    const emailLowerToKick = kickConfirm.emailLower;
    if (!emailLowerToKick) return;
    try {
      await apiClient.del(`/boards/${boardId}/members/${encodeURIComponent(emailLowerToKick)}`);
      showToast("Member removed", { variant: "info" });
      setKickConfirm({ show: false, emailLower: "", label: "" });
      await loadMembers();
      await loadBoardDetails(boardId);
    } catch (e) {
      showToast(e?.message || "Failed to remove member", { variant: "danger" });
      setKickConfirm({ show: false, emailLower: "", label: "" });
    }
  };

  const ownerDisplay = board.ownerName ? board.ownerName : board.ownerEmail || "Unknown owner";
  const createdAtText = board.createdAt ? new Date(board.createdAt).toLocaleString() : "Unknown date";

  return (
    <>
      <div className="text-center mb-4">
        <h4 className="mb-1 d-flex justify-content-center align-items-center">
          <i className="mdi mdi-view-kanban-outline me-2" />
          {board.name}
        </h4>

        <div className="small text-muted mb-2 d-flex justify-content-center align-items-center flex-wrap gap-2">
          <span>
            <i className="mdi mdi-account-outline me-1" />
            Owner: {ownerDisplay}
          </span>

          <span className="text-muted">•</span>

          <span>
            <i className="mdi mdi-calendar-clock-outline me-1" />
            Created: {createdAtText}
          </span>

          <span className="text-muted">•</span>

          <span className="d-flex align-items-center">
            <span className="me-1">Label:</span>
            {boardLabel ? (
              <span className="badge bg-secondary mb-0">{boardLabel}</span>
            ) : (
              <span className="text-muted">No label</span>
            )}
          </span>

          <span className="text-muted">•</span>

          <span className="d-flex align-items-center">
            <span className="me-1">Role:</span>
            <span className={"badge " + (isOwner ? "bg-primary" : "bg-light text-dark")}>
              {isOwner ? "owner" : "member"}
            </span>
          </span>
        </div>

        <div className="d-flex justify-content-center align-items-center gap-2 mt-1 flex-wrap">
          {isOwner && (
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={openEditLabelModal}>
                <i className="mdi mdi-pencil-outline me-1" />
                Edit label
              </button>

              <button type="button" className="btn btn-outline-primary btn-sm" onClick={openInvite}>
                <i className="mdi mdi-account-plus-outline me-1" />
                Invite member
              </button>
            </>
          )}

          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={loadMembers}>
            <i className="mdi mdi-account-multiple-outline me-1" />
            Members
          </button>

          <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate("/boards")}>
            <i className="mdi mdi-view-dashboard-outline me-1" />
            Boards
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-md-12 mb-3">
          <ColumnsSection boardId={boardId} onTaskClick={handleTaskClick} canManageColumns={isOwner} canAddTask={true} />
        </div>
      </div>

      {selectedTask && (
        <TaskModal task={selectedTask} boardId={boardId} onClose={() => setSelectedTask(null)} onDelete={handleTaskDelete} />
      )}

      <TextInputModal
        show={labelModal.show}
        title="Edit board label"
        label="Board label"
        value={labelModal.name}
        onChange={(val) => setLabelModal((s) => ({ ...s, name: val, error: "" }))}
        onCancel={() => setLabelModal({ show: false, name: "", error: "" })}
        onSubmit={handleLabelSubmit}
        submitLabel="Save"
        error={labelModal.error}
      />

      <TextInputModal
        show={inviteModal.show}
        title="Invite member"
        label="Email"
        value={inviteModal.email}
        onChange={(val) => setInviteModal((s) => ({ ...s, email: val, error: "" }))}
        onCancel={() => setInviteModal({ show: false, email: "", error: "", submitting: false })}
        onSubmit={sendInvite}
        submitLabel={inviteModal.submitting ? "Sending..." : "Send invite"}
        submitting={inviteModal.submitting}
        error={inviteModal.error}
      />

      {membersModal.show ? (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
          tabIndex="-1"
          role="dialog"
          onClick={closeMembers}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="mdi mdi-account-multiple-outline me-2" />
                  Members
                </h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeMembers} />
              </div>

              <div className="modal-body">
                {membersModal.loading ? (
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" />
                    <span className="small">Loading…</span>
                  </div>
                ) : membersModal.error ? (
                  <div className="alert alert-danger py-2 px-3 small">{membersModal.error}</div>
                ) : (
                  <>
                    <div className="mb-3">
                      <div className="small text-uppercase text-muted">Owner</div>
                      <div className="d-flex align-items-center justify-content-between gap-2 border rounded p-2">
                        <div className="d-flex align-items-center gap-2">
                          <i className="mdi mdi-crown-outline" />
                          <div>
                            <div className="fw-semibold">
                              {(membersModal.owner?.name || membersModal.owner?.email || ownerDisplay) + ""}
                            </div>
                            <div className="small text-muted">{membersModal.owner?.email || board.ownerEmail}</div>
                          </div>
                        </div>
                        <span className="badge bg-primary">owner</span>
                      </div>
                    </div>

                    <div className="small text-uppercase text-muted mb-2">Members</div>

                    {membersModal.members.length === 0 ? (
                      <div className="text-muted small">No members yet.</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {membersModal.members.map((m) => (
                          <div
                            key={m.emailLower || m.email}
                            className="d-flex align-items-center justify-content-between gap-2 border rounded p-2"
                          >
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <i className="mdi mdi-account-outline" />
                              <div style={{ minWidth: 0 }}>
                                <div className="fw-semibold text-truncate">{(m.name || m.email || m.emailLower) + ""}</div>
                                <div className="small text-muted text-truncate">{m.email}</div>
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-light text-dark border">{m.role || "member"}</span>
                              {isOwner ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => requestKick(m)}
                                  title="Kick member"
                                >
                                  <i className="mdi mdi-account-remove-outline" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeMembers}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        show={kickConfirm.show}
        title="Remove member"
        message={`Remove "${kickConfirm.label}" from this board?`}
        onCancel={() => setKickConfirm({ show: false, emailLower: "", label: "" })}
        onConfirm={doKick}
        confirmVariant="danger"
        confirmLabel="Remove"
      />
    </>
  );
}

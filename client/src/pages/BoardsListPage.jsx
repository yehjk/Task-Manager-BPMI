// /client/src/pages/BoardsListPage.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/api-client.js";
import { TextInputModal, ConfirmModal } from "../components/ModalDialogs.jsx";
import { useToast } from "../components/ToastProvider.jsx";

function getCurrentUser() {
  try {
    const raw = window.localStorage.getItem("tm_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForBoardReadable(boardId, { attempts = 8, delayMs = 120 } = {}) {
  let lastErr = null;

  for (let i = 0; i < attempts; i++) {
    try {
      await apiClient.get(`/boards/${boardId}`);
      return true;
    } catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      if (status && status !== 404) throw e;
      await sleep(delayMs);
    }
  }

  if (lastErr) throw lastErr;
  return false;
}

export default function BoardsListPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const currentUser = getCurrentUser();
  const emailLower = (currentUser?.email || currentUser?.emailLower || "").toLowerCase();

  const [boards, setBoards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = useState("");

  const [onlyOwned, setOnlyOwned] = useState(false);
  const [onlyMember, setOnlyMember] = useState(false);

  const [labelFilter, setLabelFilter] = useState("all");

  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

  const [createModal, setCreateModal] = useState({
    show: false,
    name: "",
    error: "",
    submitting: false,
  });

  const [renameModal, setRenameModal] = useState({
    show: false,
    boardId: null,
    name: "",
    error: "",
    submitting: false,
  });

  const [deleteModal, setDeleteModal] = useState({
    show: false,
    boardId: null,
    name: "",
  });

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiClient.get("/boards");
        if (cancelled) return;
        setBoards(Array.isArray(data) ? data : []);
      } catch (e) {
        if (cancelled) return;
        setBoards([]);
        setError(e?.message || "Failed to load boards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const labelOptions = useMemo(() => {
    const set = new Set();
    for (const b of boards) {
      const label = (b.labels?.[0]?.name || "").trim();
      if (label) set.add(label);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [boards]);

  const filteredBoards = useMemo(() => {
    const byRole = boards.filter((b) => {
      const ownerLower = (b.ownerEmailLower || b.ownerEmail || "").toLowerCase();
      const isOwner = ownerLower === emailLower;
      if (onlyOwned) return isOwner;
      if (onlyMember) return !isOwner;
      return true;
    });

    const byLabel =
      labelFilter === "all"
        ? byRole
        : byRole.filter((b) => (b.labels?.[0]?.name || "").toLowerCase() === labelFilter);

    const list = [...byLabel];

    list.sort((a, b) => {
      if (sortBy === "name") {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
      }

      const getTime = (x) => {
        const v = sortBy === "createdAt" ? x.createdAt : x.lastActivityAt || x.updatedAt;
        return v ? new Date(v).getTime() : 0;
      };

      const ad = getTime(a);
      const bd = getTime(b);
      return sortDir === "asc" ? ad - bd : bd - ad;
    });

    return list;
  }, [boards, emailLower, labelFilter, onlyOwned, onlyMember, sortBy, sortDir]);

  function toggleSort(next) {
    if (sortBy === next) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(next);
      setSortDir("desc");
    }
  }

  function renderSortIcon(key) {
    if (sortBy !== key) return null;
    return (
      <span className="ms-1">
        <i className={sortDir === "asc" ? "mdi mdi-arrow-up" : "mdi mdi-arrow-down"} />
      </span>
    );
  }

  const openCreate = () => setCreateModal({ show: true, name: "", error: "", submitting: false });

  const submitCreate = async () => {
    const name = createModal.name.trim();
    if (!name) {
      setCreateModal((s) => ({ ...s, error: "Board name cannot be empty" }));
      return;
    }

    try {
      setCreateModal((s) => ({ ...s, submitting: true, error: "" }));
      const created = await apiClient.post("/boards", { name });

      setBoards((prev) => [created, ...prev]);
      showToast("Board created", { variant: "success" });

      await waitForBoardReadable(created.id, { attempts: 10, delayMs: 120 });

      setCreateModal({ show: false, name: "", error: "", submitting: false });
      navigate(`/boards/${created.id}`);
    } catch (e) {
      const msg = e?.message || "Create failed";
      setCreateModal((s) => ({ ...s, submitting: false, error: msg }));
      showToast(msg, { variant: "danger" });
    }
  };

  const openRename = (b) => {
    setRenameModal({
      show: true,
      boardId: b.id,
      name: b.name || "",
      error: "",
      submitting: false,
    });
  };

  const submitRename = async () => {
    const name = renameModal.name.trim();
    if (!name) {
      setRenameModal((s) => ({ ...s, error: "Board name cannot be empty" }));
      return;
    }

    try {
      setRenameModal((s) => ({ ...s, submitting: true, error: "" }));
      const updated = await apiClient.patch(`/boards/${renameModal.boardId}`, { name });
      setBoards((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      setRenameModal({ show: false, boardId: null, name: "", error: "", submitting: false });
      showToast("Board renamed", { variant: "success" });
    } catch (e) {
      const msg = e?.message || "Rename failed";
      setRenameModal((s) => ({ ...s, submitting: false, error: msg }));
      showToast(msg, { variant: "danger" });
    }
  };

  const openDelete = (b) => {
    setDeleteModal({ show: true, boardId: b.id, name: b.name || "Untitled board" });
  };

  const confirmDelete = async () => {
    const id = deleteModal.boardId;
    if (!id) return;

    try {
      await apiClient.del(`/boards/${id}`);
      setBoards((prev) => prev.filter((x) => x.id !== id));
      setDeleteModal({ show: false, boardId: null, name: "" });
      showToast("Board deleted", { variant: "info" });
    } catch (e) {
      showToast(e?.message || "Delete failed", { variant: "danger" });
    }
  };

  return (
    <div className="container py-3" style={{ maxWidth: "100%" }}>
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <h3 className="m-0">Boards</h3>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="btn-group btn-group-sm" role="group">
            <button
              type="button"
              className={"btn " + (sortBy === "name" ? "btn-secondary" : "btn-outline-secondary")}
              onClick={() => toggleSort("name")}
            >
              Name{renderSortIcon("name")}
            </button>
            <button
              type="button"
              className={"btn " + (sortBy === "createdAt" ? "btn-secondary" : "btn-outline-secondary")}
              onClick={() => toggleSort("createdAt")}
            >
              Created{renderSortIcon("createdAt")}
            </button>
            <button
              type="button"
              className={"btn " + (sortBy === "updatedAt" ? "btn-secondary" : "btn-outline-secondary")}
              onClick={() => toggleSort("updatedAt")}
            >
              Last updated{renderSortIcon("updatedAt")}
            </button>
          </div>

          <div className="btn-group btn-group-sm ms-2" role="group">
            <button
              type="button"
              className={"btn " + (onlyOwned ? "btn-secondary" : "btn-outline-secondary")}
              onClick={() => {
                setOnlyOwned((v) => !v);
                setOnlyMember(false);
              }}
            >
              Owned
            </button>
            <button
              type="button"
              className={"btn " + (onlyMember ? "btn-secondary" : "btn-outline-secondary")}
              onClick={() => {
                setOnlyMember((v) => !v);
                setOnlyOwned(false);
              }}
            >
              Member
            </button>
          </div>

          <span className="text-muted mx-1">|</span>

          <select
            className="form-select form-select-sm"
            style={{ width: 220 }}
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
          >
            <option value="all">All</option>
            {labelOptions.map((l) => (
              <option key={l} value={l.toLowerCase()}>
                {l}
              </option>
            ))}
          </select>

          <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="mdi mdi-plus me-1" />
            New board
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-4 text-muted">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger mt-3">{error}</div>
      ) : filteredBoards.length === 0 ? (
        <div className="py-4 text-muted">No boards found.</div>
      ) : (
        <div className="d-flex flex-column gap-2 mt-3">
          {filteredBoards.map((b) => {
            const ownerLower = (b.ownerEmailLower || b.ownerEmail || "").toLowerCase();
            const isOwner = ownerLower === emailLower;

            const ownerText = b.ownerName ? b.ownerName : b.ownerEmail || "Unknown owner";
            const label = (b.labels?.[0]?.name || "").trim();

            const tasksCount = Number.isFinite(b.tasksCount) ? b.tasksCount : 0;
            const doneCount = Number.isFinite(b.doneCount) ? b.doneCount : 0;
            const membersCountRaw = Number.isFinite(b.membersCount) ? b.membersCount : 0;
            const membersTotal = Math.max(1, membersCountRaw + 1);

            const createdText = fmtDate(b.createdAt);
            const updatedText = fmtDate(b.lastActivityAt || b.updatedAt);

            const percent = tasksCount > 0 ? Math.round((doneCount / tasksCount) * 100) : 0;

            const openBoard = () => navigate(`/boards/${b.id}`);

            return (
              <div
                key={b.id}
                className="card shadow-sm"
                role="button"
                tabIndex={0}
                onClick={openBoard}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openBoard();
                }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2 flex-wrap" style={{ minWidth: 0 }}>
                      <h5 className="m-0 text-truncate" style={{ maxWidth: 520 }}>
                        {b.name || "Untitled board"}
                      </h5>

                      {label ? <span className="badge bg-light text-dark border">{label}</span> : null}

                      <span className={"badge " + (isOwner ? "bg-primary" : "bg-light text-dark border")}>
                        {isOwner ? "owner" : "member"}
                      </span>
                    </div>

                    {isOwner ? (
                      <div className="d-flex gap-2 align-items-center flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => openRename(b)}
                          title="Rename"
                          aria-label="Rename"
                        >
                          <i className="mdi mdi-pencil-outline" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => openDelete(b)}
                          title="Delete"
                          aria-label="Delete"
                        >
                          <i className="mdi mdi-delete-outline" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="small mt-2 d-flex flex-wrap gap-2">
                    <span className="badge bg-light text-dark border">
                      <i className="mdi mdi-account-outline me-1" />
                      {ownerText}
                    </span>

                    <span className="badge bg-light text-dark border" title={createdText}>
  <i className="mdi mdi-calendar-outline me-1" />
  Created: {createdText}
</span>

<span className="badge bg-light text-dark border" title={updatedText}>
  <i className="mdi mdi-update me-1" />
  Updated: {updatedText}
</span>


                    <span className="badge bg-light text-dark border">
                      <i className="mdi mdi-account-multiple-outline me-1" />
                      {membersTotal}
                    </span>

                    <span className="badge bg-light text-dark border">
                      <i className="mdi mdi-format-list-checks me-1" />
                      {tasksCount}
                    </span>

                    <span className="badge bg-light text-dark border">
                      <i className="mdi mdi-check-circle-outline me-1" />
                      {doneCount} ({percent}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TextInputModal
        show={createModal.show}
        title="New board"
        label="Board name"
        value={createModal.name}
        placeholder="e.g. Semester Project"
        onChange={(val) => setCreateModal((s) => ({ ...s, name: val, error: "" }))}
        onCancel={() => setCreateModal({ show: false, name: "", error: "", submitting: false })}
        onSubmit={submitCreate}
        submitLabel={createModal.submitting ? "Creating..." : "Create"}
        submitting={createModal.submitting}
        error={createModal.error}
      />

      <TextInputModal
        show={renameModal.show}
        title="Rename board"
        label="Board name"
        value={renameModal.name}
        onChange={(val) => setRenameModal((s) => ({ ...s, name: val, error: "" }))}
        onCancel={() => setRenameModal({ show: false, boardId: null, name: "", error: "", submitting: false })}
        onSubmit={submitRename}
        submitLabel={renameModal.submitting ? "Saving..." : "Save"}
        submitting={renameModal.submitting}
        error={renameModal.error}
      />

      <ConfirmModal
        show={deleteModal.show}
        title="Delete board"
        message={`Delete board "${deleteModal.name}"? This will remove all tasks and invites.`}
        onCancel={() => setDeleteModal({ show: false, boardId: null, name: "" })}
        onConfirm={confirmDelete}
        confirmVariant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}

// /client/src/pages/BoardsListPage.jsx
// Page that lists all boards the user has access to.
// Boards are rendered as cards, with sorting and CRUD via modals.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBoardStore } from "../store/board-store.js";
import { TextInputModal, ConfirmModal } from "../components/ModalDialogs.jsx";

export function BoardsListPage() {
  const {
    boards,
    loadingBoards,
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
  } = useBoardStore();

  // Modal state for creating a new board
  const [createState, setCreateState] = useState({
    show: false,
    name: "",
    error: "",
    submitting: false,
  });

  // Modal state for renaming an existing board
  const [renameState, setRenameState] = useState({
    show: false,
    board: null,
    name: "",
    error: "",
    submitting: false,
  });

  // Modal state for deleting a board
  const [deleteState, setDeleteState] = useState({
    show: false,
    board: null,
    submitting: false,
  });

  // Default: sort by creation date (newest first)
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  // ===== Create board =====

  const openCreateModal = () =>
    setCreateState({
      show: true,
      name: "",
      error: "",
      submitting: false,
    });

  const handleCreateSubmit = async () => {
    const name = createState.name.trim();
    if (!name) {
      setCreateState((s) => ({ ...s, error: "Board name cannot be empty." }));
      return;
    }

    try {
      setCreateState((s) => ({ ...s, submitting: true, error: "" }));
      await createBoard(name);
      setCreateState({
        show: false,
        name: "",
        error: "",
        submitting: false,
      });
    } catch (err) {
      console.error(err);
      setCreateState((s) => ({
        ...s,
        submitting: false,
        error: err.message || "Failed to create board.",
      }));
    }
  };

  // ===== Rename board =====

  const openRenameModal = (board) =>
    setRenameState({
      show: true,
      board,
      name: board.name || "",
      error: "",
      submitting: false,
    });

  const handleRenameSubmit = async () => {
    const name = renameState.name.trim();
    if (!name) {
      setRenameState((s) => ({
        ...s,
        error: "Board name cannot be empty.",
      }));
      return;
    }

    try {
      setRenameState((s) => ({ ...s, submitting: true, error: "" }));
      await updateBoard(renameState.board.id, name);
      setRenameState({
        show: false,
        board: null,
        name: "",
        error: "",
        submitting: false,
      });
    } catch (err) {
      console.error(err);
      setRenameState((s) => ({
        ...s,
        submitting: false,
        error: err.message || "Failed to rename board.",
      }));
    }
  };

  // ===== Delete board =====

  const openDeleteModal = (board) =>
    setDeleteState({
      show: true,
      board,
      submitting: false,
    });

  const handleDeleteConfirm = async () => {
    if (!deleteState.board) return;
    try {
      setDeleteState((s) => ({ ...s, submitting: true }));
      await deleteBoard(deleteState.board.id);
      setDeleteState({ show: false, board: null, submitting: false });
    } catch (err) {
      console.error(err);
      setDeleteState({ show: false, board: null, submitting: false });
    }
  };

  // ===== Sorting =====

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortedBoards = [...boards].sort((a, b) => {
    if (sortBy === "name") {
      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
    }

    if (sortBy === "label") {
      const la = (a.labels?.[0]?.name || "").toLowerCase();
      const lb = (b.labels?.[0]?.name || "").toLowerCase();
      return sortDir === "asc" ? la.localeCompare(lb) : lb.localeCompare(la);
    }

    // createdAt by default
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortDir === "asc" ? ad - bd : bd - ad;
  });

  const renderSortIcon = (key) => {
    if (sortBy !== key) return null;
    return sortDir === "asc" ? (
      <i className="mdi mdi-arrow-up ms-1" />
    ) : (
      <i className="mdi mdi-arrow-down ms-1" />
    );
  };

  // ===== Render =====

  return (
    <>
      <div>
        {/* Page header: title, sort controls, and "New board" button */}
        <div className="tm-boards-header">
          <div className="tm-boards-title">
            <div className="d-flex align-items-center gap-2">
              <i className="mdi mdi-view-dashboard-outline fs-5" />
              <h4 className="mb-0">Boards</h4>
            </div>

            <div className="tm-sort-group mt-2">
              <button
                type="button"
                className={
                  "btn btn-sm " +
                  (sortBy === "name"
                    ? "btn-secondary"
                    : "btn-outline-secondary")
                }
                onClick={() => toggleSort("name")}
              >
                Name
                {renderSortIcon("name")}
              </button>
              <button
                type="button"
                className={
                  "btn btn-sm " +
                  (sortBy === "label"
                    ? "btn-secondary"
                    : "btn-outline-secondary")
                }
                onClick={() => toggleSort("label")}
              >
                Label
                {renderSortIcon("label")}
              </button>
              <button
                type="button"
                className={
                  "btn btn-sm " +
                  (sortBy === "createdAt"
                    ? "btn-secondary"
                    : "btn-outline-secondary")
                }
                onClick={() => toggleSort("createdAt")}
              >
                Created
                {renderSortIcon("createdAt")}
              </button>
            </div>
          </div>

          <div>
            <button
              className="btn btn-primary btn-sm"
              onClick={openCreateModal}
              disabled={createState.submitting}
            >
              <i className="mdi mdi-plus-circle-outline me-1" />
              New board
            </button>
          </div>
        </div>

        {loadingBoards ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border" role="status" />
          </div>
        ) : sortedBoards.length === 0 ? (
          <div className="alert alert-info mt-3">
            No boards yet. Click <strong>New board</strong> to create one.
          </div>
        ) : (
          <div className="tm-boards-list">
            {sortedBoards.map((b) => {
              const labelName = b.labels?.[0]?.name || "";
              const ownerEmail =
                b.owner?.email || b.ownerEmail || "Unknown owner";
              const createdAtText = b.createdAt
                ? new Date(b.createdAt).toLocaleString()
                : "Unknown date";

              return (
                <div key={b.id} className="card shadow-sm tm-board-card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <Link
                          to={`/boards/${b.id}`}
                          className="h5 mb-1 d-block"
                        >
                          {b.name}
                        </Link>
                        <div className="tm-board-meta small text-muted">
                          <div>
                            <i className="mdi mdi-account-outline me-1" />
                            Owner: {ownerEmail}
                          </div>
                          <div>
                            <i className="mdi mdi-calendar-clock-outline me-1" />
                            Created: {createdAtText}
                          </div>
                        </div>
                      </div>
                      <div>
                        {labelName ? (
                          <span className="badge bg-secondary">
                            {labelName}
                          </span>
                        ) : (
                          <span className="text-muted small">No label</span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => openRenameModal(b)}
                      >
                        <i className="mdi mdi-pencil-outline me-1" />
                        Rename
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => openDeleteModal(b)}
                      >
                        <i className="mdi mdi-delete-outline me-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: create board */}
      <TextInputModal
        show={createState.show}
        title="New board"
        label="Board name"
        value={createState.name}
        onChange={(val) =>
          setCreateState((s) => ({ ...s, name: val, error: "" }))
        }
        onCancel={() =>
          setCreateState({
            show: false,
            name: "",
            error: "",
            submitting: false,
          })
        }
        onSubmit={handleCreateSubmit}
        submitLabel="Create"
        submitting={createState.submitting}
        error={createState.error}
      />

      {/* Modal: rename board */}
      <TextInputModal
        show={renameState.show}
        title="Rename board"
        label="Board name"
        value={renameState.name}
        onChange={(val) =>
          setRenameState((s) => ({ ...s, name: val, error: "" }))
        }
        onCancel={() =>
          setRenameState({
            show: false,
            board: null,
            name: "",
            error: "",
            submitting: false,
          })
        }
        onSubmit={handleRenameSubmit}
        submitLabel="Save"
        submitting={renameState.submitting}
        error={renameState.error}
      />

      {/* Modal: delete board */}
      <ConfirmModal
        show={deleteState.show}
        title="Delete board"
        message={
          deleteState.board
            ? `Delete board "${deleteState.board.name}"? All columns and tasks will be removed.`
            : ""
        }
        onCancel={() =>
          setDeleteState({ show: false, board: null, submitting: false })
        }
        onConfirm={handleDeleteConfirm}
        confirmLabel={deleteState.submitting ? "Deleting..." : "Delete"}
        confirmVariant="danger"
      />
    </>
  );
}

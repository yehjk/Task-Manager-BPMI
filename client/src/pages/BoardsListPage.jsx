// /client/src/pages/BoardsListPage.jsx
// Page that shows all boards user has access to.
// Each board now has a single color (taken from its first label).
// The list can be sorted by name or by color.

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBoardStore } from "../store/board-store.js";

export function BoardsListPage() {
  const {
    boards,
    loadingBoards,
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
  } = useBoardStore();

  const [creating, setCreating] = useState(false);

  // sortBy can be "name" or "color"
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  const navigate = useNavigate();

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleCreate = async () => {
    const name = window.prompt("Board name:", "Sprint 1 Board");
    if (!name) return;
    try {
      setCreating(true);
      const board = await createBoard(name);
      // After creation, go directly to the new board page.
      navigate(`/boards/${board.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create board");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (board) => {
    const name = window.prompt("New board name:", board.name);
    if (!name || name === board.name) return;
    try {
      await updateBoard(board.id, name);
    } catch (err) {
      console.error(err);
      alert("Failed to rename board");
    }
  };

  const handleDelete = async (board) => {
    if (!window.confirm(`Delete board "${board.name}"?`)) return;
    try {
      await deleteBoard(board.id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete board");
    }
  };

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const sortedBoards = [...boards].sort((a, b) => {
    if (sortBy === "name") {
      return sortDir === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }

    if (sortBy === "color") {
      const ca = a.labels?.[0]?.color || "";
      const cb = b.labels?.[0]?.color || "";
      return sortDir === "asc"
        ? ca.localeCompare(cb)
        : cb.localeCompare(ca);
    }

    return 0;
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="mdi mdi-view-dashboard-outline me-2" />
          Boards
        </h4>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleCreate}
          disabled={creating}
        >
          <i className="mdi mdi-plus-circle-outline me-1" />
          {creating ? "Creating..." : "New board"}
        </button>
      </div>

      {loadingBoards ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border" role="status" />
        </div>
      ) : sortedBoards.length === 0 ? (
        <div className="alert alert-info">
          No boards yet. Click <strong>New board</strong> to create one.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSort("name")}
                >
                  Name{" "}
                  {sortBy === "name" &&
                    (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th
                  style={{ width: 120, cursor: "pointer" }}
                  onClick={() => handleSort("color")}
                >
                  Color{" "}
                  {sortBy === "color" &&
                    (sortDir === "asc" ? "▲" : "▼")}
                </th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedBoards.map((b) => {
                const color = b.labels?.[0]?.color || null;
                return (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/boards/${b.id}`}>{b.name}</Link>
                    </td>
                    <td>
                      {color ? (
                        <span
                          className="badge"
                          style={{
                            display: "inline-block",
                            width: 22,
                            height: 22,
                            borderRadius: "999px",
                            backgroundColor: color,
                          }}
                        />
                      ) : (
                        <span className="text-muted small">
                          No color
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline-secondary btn-sm me-2"
                        onClick={() => handleRename(b)}
                      >
                        <i className="mdi mdi-pencil-outline me-1" />
                        Rename
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDelete(b)}
                      >
                        <i className="mdi mdi-delete-outline me-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

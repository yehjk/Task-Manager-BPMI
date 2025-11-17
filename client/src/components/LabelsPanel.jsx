// /client/src/components/LabelsPanel.jsx
// Renders labels that belong to the current board and lets user
// create / edit / delete them.
// Color is chosen from a small preset list instead of typing hex manually.

import React, { useState } from "react";
import { useBoardStore } from "../store/board-store.js";

// Simple preset palette for labels.
// This keeps labels visually consistent and avoids invalid hex codes.
const COLOR_PRESETS = [
  { key: "1", name: "Red (Bug)", color: "#ef4444" },
  { key: "2", name: "Green (Feature)", color: "#22c55e" },
  { key: "3", name: "Blue (Info)", color: "#3b82f6" },
  { key: "4", name: "Yellow (Warning)", color: "#eab308" },
];

function pickColorWithPrompt(defaultColor) {
  const lines = COLOR_PRESETS.map(
    (p) => `${p.key} = ${p.name} (${p.color})`
  );
  const message =
    "Choose label color:\n" +
    lines.join("\n") +
    "\n\nEnter number (1-4).";

  const input = window.prompt(message, "")?.trim();

  const preset =
    COLOR_PRESETS.find((p) => p.key === input) ||
    COLOR_PRESETS.find((p) => p.color === defaultColor);

  // Fallback to default or first preset if user cancels.
  return preset?.color || defaultColor || COLOR_PRESETS[0].color;
}

export function LabelsPanel({ boardId }) {
  const { labels, createLabel, updateLabel, deleteLabel } = useBoardStore();
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    const name = window.prompt("Label name:", "UI");
    if (!name) return;

    const color = pickColorWithPrompt("#3b82f6");

    try {
      setBusy(true);
      await createLabel(boardId, name, color);
    } catch (err) {
      console.error(err);
      alert("Failed to create label");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (label) => {
    const name = window.prompt("Label name:", label.name);
    if (!name) return;

    const color = pickColorWithPrompt(label.color);

    try {
      setBusy(true);
      await updateLabel(boardId, label.id, name, color);
    } catch (err) {
      console.error(err);
      alert("Failed to update label");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (label) => {
    if (!window.confirm(`Delete label "${label.name}"?`)) return;
    try {
      setBusy(true);
      await deleteLabel(boardId, label.id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete label");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <span className="small fw-semibold">
          <i className="mdi mdi-label-multiple-outline me-1" />
          Board labels
        </span>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={handleCreate}
          disabled={busy}
        >
          <i className="mdi mdi-plus" />
        </button>
      </div>
      <div className="card-body p-2">
        {labels.length === 0 ? (
          <div className="text-muted small">No labels yet.</div>
        ) : (
          <ul className="list-unstyled mb-0">
            {labels.map((l) => (
              <li
                key={l.id}
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <div className="d-flex align-items-center">
                  <span
                    className="badge me-2"
                    style={{ backgroundColor: l.color || "#6b7280" }}
                  >
                    &nbsp;
                  </span>
                  <span className="small">{l.name}</span>
                </div>
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleEdit(l)}
                    disabled={busy}
                  >
                    <i className="mdi mdi-pencil-outline" />
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(l)}
                    disabled={busy}
                  >
                    <i className="mdi mdi-delete-outline" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

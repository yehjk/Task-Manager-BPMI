// /client/src/pages/BoardPage.jsx
// Board detail page. Shows columns and tasks.
// Board color is chosen from a small palette and stored as the first label.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBoardStore } from "../store/board-store.js";
import { ColumnsSection } from "../components/ColumnsSection.jsx";
import { TaskModal } from "../components/TaskModal.jsx";

// Fixed palette of allowed board colors.
const BOARD_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308"];

export function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const {
    boards,
    loadBoards,
    loadBoardDetails,
    columns,
    tasks,
    loadingBoard,
    deleteTask,
    setBoardColor,
    labels,
  } = useBoardStore();

  const [selectedTask, setSelectedTask] = useState(null);

  // Find board object by id (for display name and color).
  const board = boards.find((b) => b.id === boardId);

  // Current board color is taken from its first label (if any).
  const currentColor =
    board?.labels?.[0]?.color || labels[0]?.color || null;

  useEffect(() => {
    // If boards list is empty, load it first.
    if (!boards.length) {
      loadBoards();
    }
    // Load columns / tasks / labels for this board.
    loadBoardDetails(boardId);
  }, [boardId, boards.length, loadBoards, loadBoardDetails]);

  if (loadingBoard && !board) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="alert alert-danger mt-3">
        Board not found.{" "}
        <button
          className="btn btn-link p-0 align-baseline"
          onClick={() => navigate("/boards")}
        >
          Back to boards
        </button>
      </div>
    );
  }

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleTaskDelete = async () => {
    if (!selectedTask) return;
    if (!window.confirm(`Delete task "${selectedTask.title}"?`)) return;
    try {
      await deleteTask(selectedTask.id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete task");
      return;
    }
    setSelectedTask(null);
  };

  const handleColorClick = async (color) => {
    try {
      await setBoardColor(board.id, color);
    } catch (err) {
      console.error(err);
      alert("Failed to change board color");
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1 d-flex align-items-center">
            <i className="mdi mdi-view-kanban-outline me-2" />
            {board.name}
          </h4>

          {/* Board color picker – only dots, no names */}
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted me-2">Board color:</span>
            {BOARD_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="btn btn-sm"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "999px",
                  padding: 0,
                  backgroundColor: color,
                  border:
                    currentColor === color
                      ? "2px solid #111"
                      : "1px solid #ddd",
                }}
                onClick={() => handleColorClick(color)}
                aria-label={`Set board color ${color}`}
              />
            ))}
          </div>
        </div>

        <div>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/boards")}
          >
            <i className="mdi mdi-view-dashboard-outline me-1" />
            Boards
          </button>
        </div>
      </div>

      {/* Columns and tasks only – no labels panel on the right */}
      <div className="row">
        <div className="col-md-12 mb-3">
          <ColumnsSection
            boardId={boardId}
            columns={columns}
            tasks={tasks}
            onTaskClick={handleTaskClick}
          />
        </div>
      </div>

      {/* Task details modal with audit log */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={handleTaskDelete}
        />
      )}
    </>
  );
}

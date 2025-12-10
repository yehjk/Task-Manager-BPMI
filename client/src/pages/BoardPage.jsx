// /client/src/pages/BoardPage.jsx
// Board detail page. Shows a single board with its columns and tasks.

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBoardStore } from "../store/board-store.js";
import { ColumnsSection } from "../components/ColumnsSection.jsx";
import { TaskModal } from "../components/TaskModal.jsx";
import { TextInputModal } from "../components/ModalDialogs.jsx";

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
    labels,
    createLabel,
    updateLabel,
  } = useBoardStore();

  const [selectedTask, setSelectedTask] = useState(null);

  const board = boards.find((b) => b.id === boardId);
  const boardLabel = board?.labels?.[0]?.name || labels[0]?.name || null;

  const [labelModal, setLabelModal] = useState({
    show: false,
    name: "",
    error: "",
  });

  useEffect(() => {
    if (!boards.length) {
      loadBoards();
    }
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
        Board not found{" "}
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
    try {
      await deleteTask(selectedTask.id);
    } catch (err) {
      console.error(err);
    }
    setSelectedTask(null);
  };

  const openEditLabelModal = () => {
    const current = boardLabel || "";
    setLabelModal({ show: true, name: current, error: "" });
  };

  const handleLabelSubmit = async () => {
    const name = labelModal.name.trim();
    if (!name) {
      setLabelModal((s) => ({
        ...s,
        error: "Label cannot be empty.",
      }));
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
    } catch (err) {
      console.error(err);
      setLabelModal((s) => ({
        ...s,
        error: err.message || "Failed to update board label.",
      }));
    }
  };

  const ownerEmail =
    board.owner?.email || board.ownerEmail || "Unknown owner";
  const createdAtText = board.createdAt
    ? new Date(board.createdAt).toLocaleString()
    : "Unknown date";

  return (
    <>
      {/* Board header with name, owner, created date and main label */}
      <div className="text-center mb-4">
        <h4 className="mb-1 d-flex justify-content-center align-items-center">
          <i className="mdi mdi-view-kanban-outline me-2" />
          {board.name}
        </h4>

        <div className="small text-muted mb-2 d-flex justify-content-center align-items-center flex-wrap gap-2">
          <span>
            <i className="mdi mdi-account-outline me-1" />
            Owner: {ownerEmail}
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
              <span className="badge bg-secondary mb-0">
                {boardLabel}
              </span>
            ) : (
              <span className="text-muted">No label</span>
            )}
          </span>
        </div>

        {/* Board actions: edit label and navigate back to boards list */}
        <div className="d-flex justify-content-center align-items-center gap-2 mt-1">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={openEditLabelModal}
          >
            <i className="mdi mdi-pencil-outline me-1" />
            Edit label
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => navigate("/boards")}
          >
            <i className="mdi mdi-view-dashboard-outline me-1" />
            Boards
          </button>
        </div>
      </div>

      {/* Columns and tasks section */}
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
          boardId={boardId}
          onClose={() => setSelectedTask(null)}
          onDelete={handleTaskDelete}
        />
      )}

      {/* Modal for editing the board text label */}
      <TextInputModal
        show={labelModal.show}
        title="Edit board label"
        label="Board label"
        value={labelModal.name}
        onChange={(val) =>
          setLabelModal((s) => ({ ...s, name: val, error: "" }))
        }
        onCancel={() =>
          setLabelModal({ show: false, name: "", error: "" })
        }
        onSubmit={handleLabelSubmit}
        submitLabel="Save"
        error={labelModal.error}
      />
    </>
  );
}

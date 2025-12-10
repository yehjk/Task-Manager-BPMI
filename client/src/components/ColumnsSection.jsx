// /client/src/components/ColumnsSection.jsx
// Renders all columns for a board and wires drag & drop of tasks and columns.

import React, { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Column } from "./Column.jsx";
import { useBoardStore } from "../store/board-store.js";
import { TextInputModal, ConfirmModal } from "./ModalDialogs.jsx";

// Wrapper that makes a column horizontally draggable in the board.
function SortableColumnWrapper({ column, children }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "column-header",
      columnId: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: "grab",
    minWidth: 280,
    maxWidth: 330,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export function ColumnsSection({ boardId, columns, tasks, onTaskClick }) {
  const {
    createColumn,
    deleteColumn,
    createTask,
    moveTask,
    updateColumn,
    moveColumn,
  } = useBoardStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [createError, setCreateError] = useState("");

  const [renameState, setRenameState] = useState({
    show: false,
    columnId: null,
    title: "",
    error: "",
  });

  const [deleteState, setDeleteState] = useState({
    show: false,
    columnId: null,
    title: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const getTasksForColumn = (columnId) =>
    tasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.position - b.position);

  const handleCreateColumn = async () => {
    const trimmed = newColumnTitle.trim();
    if (!trimmed) {
      setCreateError("Column title cannot be empty.");
      return;
    }

    try {
      setCreateError("");
      await createColumn(boardId, trimmed);
      setShowCreateModal(false);
      setNewColumnTitle("");
    } catch (err) {
      console.error(err);
      setCreateError(err.message || "Failed to create column.");
    }
  };

  const handleAddColumnClick = () => {
    setNewColumnTitle("");
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || !active) return;

    const activeType = active.data.current?.type;

    // 1) Dragging a task
    if (activeType === "task") {
      const activeTask = tasks.find((t) => t.id === active.id);
      if (!activeTask) return;

      const overData = over.data.current || {};
      let newColumnId = activeTask.columnId;
      let newPosition = activeTask.position;

      if (overData.type === "task") {
        const overTask = tasks.find((t) => t.id === over.id);
        if (!overTask) return;

        newColumnId = overTask.columnId;

        const list = tasks
          .filter((t) => t.columnId === newColumnId)
          .sort((a, b) => a.position - b.position);

        const overIndex = list.findIndex((t) => t.id === overTask.id);
        newPosition = overIndex + 1;
      }

      if (overData.type === "column") {
        newColumnId = overData.columnId;

        const list = tasks
          .filter((t) => t.columnId === newColumnId)
          .sort((a, b) => a.position - b.position);

        newPosition = list.length + 1;
      }

      await moveTask(activeTask.id, newColumnId, newPosition);
      return;
    }

    // 2) Dragging a column
    if (activeType === "column-header" && over.id && active.id !== over.id) {
      const ordered = [...columns].sort((a, b) => a.position - b.position);

      const activeIndex = ordered.findIndex((c) => c.id === active.id);
      const overIndex = ordered.findIndex((c) => c.id === over.id);

      if (activeIndex === -1 || overIndex === -1) return;

      const targetPosition = overIndex + 1;
      await moveColumn(active.id, targetPosition);
    }
  };

  const handleRenameSubmit = async () => {
    const trimmed = renameState.title.trim();
    if (!trimmed) {
      setRenameState((s) => ({
        ...s,
        error: "Column title cannot be empty.",
      }));
      return;
    }

    try {
      await updateColumn(renameState.columnId, trimmed);
      setRenameState({
        show: false,
        columnId: null,
        title: "",
        error: "",
      });
    } catch (err) {
      console.error(err);
      setRenameState((s) => ({
        ...s,
        error: err.message || "Failed to rename column.",
      }));
    }
  };

  const handleConfirmDeleteColumn = async () => {
    if (!deleteState.columnId) return;
    try {
      await deleteColumn(deleteState.columnId);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteState({ show: false, columnId: null, title: "" });
    }
  };

  return (
    <>
      {/* Header row with section title and "Add column" button */}
      <div className="d-flex justify-content-start align-items-center mb-3 gap-3">
        <h5 className="mb-0">Columns &amp; tasks</h5>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={handleAddColumnClick}
        >
          <i className="mdi mdi-plus" /> Add column
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="d-flex flex-row flex-nowrap gap-3 overflow-auto pb-3">
            {columns.map((column) => (
              <SortableColumnWrapper key={column.id} column={column}>
                <Column
                  column={column}
                  tasks={getTasksForColumn(column.id)}
                  onAddTask={async () => {
                    await createTask(boardId, column.id, "New task");
                  }}
                  onDeleteColumn={() =>
                    setDeleteState({
                      show: true,
                      columnId: column.id,
                      title: column.title,
                    })
                  }
                  onRenameColumn={() =>
                    setRenameState({
                      show: true,
                      columnId: column.id,
                      title: column.title,
                      error: "",
                    })
                  }
                  onTaskClick={onTaskClick}
                />
              </SortableColumnWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal for creating a new column */}
      <TextInputModal
        show={showCreateModal}
        title="New column"
        label="Column title"
        value={newColumnTitle}
        onChange={setNewColumnTitle}
        onCancel={() => {
          setShowCreateModal(false);
          setCreateError("");
        }}
        onSubmit={handleCreateColumn}
        submitLabel="Create"
        error={createError}
      />

      {/* Modal for renaming a column */}
      <TextInputModal
        show={renameState.show}
        title="Rename column"
        label="Column title"
        value={renameState.title}
        onChange={(val) =>
          setRenameState((s) => ({ ...s, title: val, error: "" }))
        }
        onCancel={() =>
          setRenameState({
            show: false,
            columnId: null,
            title: "",
            error: "",
          })
        }
        onSubmit={handleRenameSubmit}
        submitLabel="Save"
        error={renameState.error}
      />

      {/* Confirmation dialog for deleting a column */}
      <ConfirmModal
        show={deleteState.show}
        title="Delete column"
        message={`Delete column "${deleteState.title}"? All tasks inside will be removed.`}
        onCancel={() =>
          setDeleteState({ show: false, columnId: null, title: "" })
        }
        onConfirm={handleConfirmDeleteColumn}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </>
  );
}

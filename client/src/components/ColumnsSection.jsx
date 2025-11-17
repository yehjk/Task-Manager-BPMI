// /client/src/components/ColumnsSection.jsx
// Renders all columns for a board and wires drag & drop of tasks.
// Supports dropping into empty columns and calculates target positions.
// On drop it calls store.moveTask (PATCH /tasks/:id/move).

import React from "react";
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
} from "@dnd-kit/sortable";

import { Column } from "./Column.jsx";
import { useBoardStore } from "../store/board-store.js";

export function ColumnsSection({ boardId, columns, tasks, onTaskClick }) {
  const { createColumn, deleteColumn, createTask, moveTask } =
    useBoardStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const getTasksForColumn = (columnId) =>
    tasks
      .filter((t) => t.columnId === columnId)
      .sort((a, b) => a.position - b.position);

  const handleAddColumn = async () => {
    const title = window.prompt("Column title:", "New column");
    if (!title) return;
    await createColumn(boardId, title);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

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
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Columns & tasks</h5>
        <button
          className="btn btn-outline-primary btn-sm"
          onClick={handleAddColumn}
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
          <div className="d-flex flex-nowrap gap-3 overflow-auto pb-3">
            {columns.map((column) => (
              <div key={column.id} style={{ minWidth: 280, maxWidth: 330 }}>
                <Column
                  column={column}
                  tasks={getTasksForColumn(column.id)}
                  onAddTask={async () => {
                    const title = window.prompt("Task title:", "New task");
                    if (title)
                      await createTask(boardId, column.id, title);
                  }}
                  onDeleteColumn={async () => {
                    if (window.confirm(`Delete column "${column.title}"?`))
                      await deleteColumn(column.id);
                  }}
                  onTaskClick={onTaskClick}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

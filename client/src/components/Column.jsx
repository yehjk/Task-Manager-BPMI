// /client/src/components/Column.jsx
// Visual representation of a single board column.
// Acts as a drop target for tasks and renders task cards.

import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { TaskCard } from "./TaskCard.jsx";

export function Column({
  column,
  tasks,
  onAddTask,
  onDeleteColumn,
  onRenameColumn,
  onTaskClick,
}) {
  // Drop zone for tasks (separate id from sortable column id)
  const { setNodeRef, isOver } = useDroppable({
    id: `column-dropzone-${column.id}`,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <strong>{column.title}</strong>
          <span className="badge bg-secondary ms-2">
            {sortedTasks.length}
          </span>
        </div>

        <div className="btn-group btn-group-sm">
          <button
            className="btn btn-outline-secondary"
            type="button"
            title="Rename column"
            onClick={onRenameColumn}
          >
            <i className="mdi mdi-pencil-outline" />
          </button>

          <button
            className="btn btn-outline-success"
            type="button"
            title="Add task"
            onClick={onAddTask}
          >
            <i className="mdi mdi-plus" />
          </button>

          <button
            className="btn btn-outline-danger"
            type="button"
            title="Delete column"
            onClick={onDeleteColumn}
          >
            <i className="mdi mdi-delete-outline" />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="card-body p-2"
        style={{
          backgroundColor: isOver ? "rgba(59,130,246,0.06)" : undefined,
          transition: "background-color 0.15s ease",
        }}
      >
        <SortableContext
          items={sortedTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

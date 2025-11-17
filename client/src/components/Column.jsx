// /client/src/components/Column.jsx
// Visual representation of a single column in the board.
// It is a drop target for tasks (even when the column is empty).

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
  onTaskClick,
}) {
  // Marks the tasks area as a droppable target for dnd-kit.
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <div>
          <strong>{column.title}</strong>
          <span className="badge bg-secondary ms-2">
            {sortedTasks.length}
          </span>
        </div>
        <div className="btn-group btn-group-sm">
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
          // IDs of tasks inside this column
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

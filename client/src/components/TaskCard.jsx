// /client/src/components/TaskCard.jsx
import React, { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const d = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dueDate;
  return d.toLocaleDateString();
}

export function TaskCard({ task, onClick }) {
  const handleRef = useRef(null);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } =
    useSortable({
      id: task.id,
      data: { type: "task", columnId: task.columnId },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    outline: isOver ? "2px solid rgba(13,110,253,0.35)" : "none",
    outlineOffset: 2,
    cursor: isDragging ? "grabbing" : "default",
  };

  const dueText = formatDueDate(task.dueDate);
  const assignee = task.assigneeId ? String(task.assigneeId) : "";

  return (
    <div
      ref={setNodeRef}
      className="card mb-2 shadow-sm"
      style={style}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!isDragging) onClick?.();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isDragging) onClick?.();
      }}
    >
      <div className="card-body p-2">
        <div className="d-flex align-items-start">
          <span
            ref={(node) => {
              handleRef.current = node;
              setActivatorNodeRef(node);
            }}
            className="me-2 text-muted"
            style={{ cursor: "grab", userSelect: "none" }}
            title="Drag task"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <i className="mdi mdi-drag-vertical" />
          </span>

          <div style={{ minWidth: 0 }}>
            <div className="small fw-semibold text-truncate">{task.title}</div>

            <div className="d-flex gap-2 flex-wrap mt-1">
              {assignee && (
                <span className="badge bg-light text-dark">
                  <i className="mdi mdi-account-outline me-1" /> {assignee}
                </span>
              )}

              {dueText && (
                <span className="badge bg-light text-dark">
                  <i className="mdi mdi-calendar-outline me-1" /> {dueText}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

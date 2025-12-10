// /client/src/components/TaskCard.jsx
// Single draggable task card using dnd-kit sortable API.

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",       // used in drag logic to distinguish tasks from columns
      columnId: task.columnId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card mb-2 shadow-sm"
      onClick={onClick}
    >
      <div className="card-body p-2">
        <div className="d-flex align-items-start">
          <i className="mdi mdi-drag-vertical me-2 text-muted" />
          <div className="small fw-semibold">{task.title}</div>
        </div>
      </div>
    </div>
  );
}

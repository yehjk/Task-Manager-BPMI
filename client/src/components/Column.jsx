import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export default function Column({
  column,
  tasks,
  canManage,
  canAddTask,
  onAddTask,
  onOpenSettings,
  onDeleteColumn,
  children,
  dragHandleProps,
}) {
  const droppableId = `column-drop-${column.id}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: "column-drop", columnId: column.id },
  });

  const doneBg = column?.isDone ? "rgba(25,135,84,0.08)" : undefined;

  return (
    <div className="card h-100">
      <div className="card-header d-flex align-items-center justify-content-between gap-2">
        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
          {dragHandleProps ? (
            <span
              {...dragHandleProps}
              className="text-muted"
              style={{ cursor: "grab", userSelect: "none", padding: "2px 4px" }}
              title="Drag column"
              onClick={(e) => e.stopPropagation()}
            >
              <i className="mdi mdi-drag-vertical" />
            </span>
          ) : (
            <span className="text-muted" style={{ padding: "2px 4px" }}>
              <i className="mdi mdi-drag-vertical" style={{ opacity: 0.35 }} />
            </span>
          )}

          <strong className="small text-truncate">{column.title}</strong>

          {column?.isDone ? (
            <span
              className="rounded-circle bg-success"
              title="Done column"
              style={{ width: 10, height: 10, display: "inline-block" }}
            />
          ) : null}
        </div>

        <div className="d-flex align-items-center gap-1">
          {canAddTask ? (
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => onAddTask?.(column)}
              title="Add task"
            >
              <i className="mdi mdi-plus" />
            </button>
          ) : null}

          {canManage ? (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => onOpenSettings?.(column)}
                title="Column settings"
              >
                <i className="mdi mdi-cog-outline" />
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => onDeleteColumn?.(column)}
                title="Delete column"
              >
                <i className="mdi mdi-delete-outline" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="card-body p-2"
        style={{
          backgroundColor: isOver ? "rgba(59,130,246,0.06)" : doneBg,
          transition: "background-color 0.15s ease",
          minHeight: 120,
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

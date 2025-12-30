import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableColumn({ columnId, canDrag, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId,
    data: { type: "column" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  const dragHandleProps = canDrag ? { ...attributes, ...listeners } : null;

  if (React.isValidElement(children)) {
    return (
      <div ref={setNodeRef} style={style} className="col-12 col-md-6 col-lg-4">
        {React.cloneElement(children, { dragHandleProps })}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="col-12 col-md-6 col-lg-4">
      {children}
    </div>
  );
}

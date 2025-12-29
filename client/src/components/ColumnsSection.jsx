// /client/src/components/ColumnsSection.jsx
import React, { useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import Column from "./Column.jsx";
import SortableColumn from "./SortableColumn.jsx";
import { useBoardStore } from "../store/board-store.js";
import { TaskCard } from "./TaskCard.jsx";
import { TextInputModal, ConfirmModal } from "./ModalDialogs.jsx";
import { useToast } from "./ToastProvider.jsx";

export default function ColumnsSection({ boardId, canManageColumns, canAddTask, onTaskClick }) {
  const { showToast } = useToast();

  const columns = useBoardStore((s) => s.columns);
  const tasks = useBoardStore((s) => s.tasks);

  const createColumn = useBoardStore((s) => s.createColumn);
  const updateColumn = useBoardStore((s) => s.updateColumn);
  const deleteColumn = useBoardStore((s) => s.deleteColumn);

  const createTask = useBoardStore((s) => s.createTask);
  const moveTask = useBoardStore((s) => s.moveTask);

  const moveColumn = useBoardStore((s) => s.moveColumn);
  const setColumnsLocal = useBoardStore((s) => s.setColumnsLocal);

  const [createState, setCreateState] = useState({ show: false, title: "", isDone: false, error: "" });

  const [settingsState, setSettingsState] = useState({
    show: false,
    columnId: null,
    title: "",
    isDone: false,
    error: "",
    saving: false,
  });

  const [addTaskModal, setAddTaskModal] = useState({
    show: false,
    columnId: null,
    title: "",
    error: "",
    submitting: false,
  });

  const [deleteConfirm, setDeleteConfirm] = useState({
    show: false,
    column: null,
    submitting: false,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columnsWithTasks = useMemo(() => {
    const map = new Map();
    for (const c of columns) map.set(c.id, []);
    for (const t of tasks) {
      const arr = map.get(t.columnId);
      if (arr) arr.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.position || 0) - (b.position || 0));
    }
    return columns.map((c) => ({ column: c, tasks: map.get(c.id) || [] }));
  }, [columns, tasks]);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  async function handleCreate() {
    const title = createState.title.trim();
    if (!title) {
      setCreateState((s) => ({ ...s, error: "Title is required" }));
      return;
    }
    try {
      await createColumn(boardId, { title, isDone: !!createState.isDone });
      setCreateState({ show: false, title: "", isDone: false, error: "" });
      showToast("Column created", { variant: "success" });
    } catch (e) {
      const msg = e?.message || "Failed to create column";
      setCreateState((s) => ({ ...s, error: msg }));
      showToast(msg, { variant: "danger" });
    }
  }

  function openSettings(column) {
    setSettingsState({
      show: true,
      columnId: column.id,
      title: column.title || "",
      isDone: !!column.isDone,
      error: "",
      saving: false,
    });
  }

  async function handleSaveSettings() {
    const title = settingsState.title.trim();
    if (!title) {
      setSettingsState((s) => ({ ...s, error: "Title is required" }));
      return;
    }

    setSettingsState((s) => ({ ...s, saving: true, error: "" }));
    try {
      await updateColumn(settingsState.columnId, { title, isDone: !!settingsState.isDone });
      setSettingsState({ show: false, columnId: null, title: "", isDone: false, error: "", saving: false });
      showToast("Column updated", { variant: "success" });
    } catch (e) {
      const msg = e?.message || "Failed to save column";
      setSettingsState((s) => ({ ...s, saving: false, error: msg }));
      showToast(msg, { variant: "danger" });
    }
  }

  function askDeleteColumn(col) {
    setDeleteConfirm({ show: true, column: col, submitting: false });
  }

  async function confirmDeleteColumn() {
    const col = deleteConfirm.column;
    if (!col?.id) {
      setDeleteConfirm({ show: false, column: null, submitting: false });
      return;
    }

    try {
      setDeleteConfirm((s) => ({ ...s, submitting: true }));
      await deleteColumn(col.id);
      showToast("Column deleted", { variant: "info" });
      setDeleteConfirm({ show: false, column: null, submitting: false });
    } catch (e) {
      showToast(e?.message || "Failed to delete column", { variant: "danger" });
      setDeleteConfirm((s) => ({ ...s, submitting: false }));
    }
  }

  const openAddTask = (column) => {
    setAddTaskModal({ show: true, columnId: column.id, title: "", error: "", submitting: false });
  };

  const submitAddTask = async () => {
    const title = addTaskModal.title.trim();
    if (!title) {
      setAddTaskModal((s) => ({ ...s, error: "Title is required" }));
      return;
    }
    if (!addTaskModal.columnId) return;

    try {
      setAddTaskModal((s) => ({ ...s, submitting: true, error: "" }));
      await createTask(boardId, { title, columnId: addTaskModal.columnId });
      setAddTaskModal({ show: false, columnId: null, title: "", error: "", submitting: false });
      showToast("Task created", { variant: "success" });
    } catch (e) {
      const msg = e?.message || "Failed to create task";
      setAddTaskModal((s) => ({ ...s, submitting: false, error: msg }));
      showToast(msg, { variant: "danger" });
    }
  };

  const closeCreate = () => setCreateState({ show: false, title: "", isDone: false, error: "" });
  const closeSettings = () => setSettingsState({ show: false, columnId: null, title: "", isDone: false, error: "", saving: false });
  const closeAddTask = () => setAddTaskModal({ show: false, columnId: null, title: "", error: "", submitting: false });

  const onDragEnd = async ({ active, over }) => {
    if (!over) return;

    const activeType = active?.data?.current?.type;

    if (activeType === "column") {
      if (!canManageColumns) return;
      if (active.id === over.id) return;

      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return;

      const next = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({ ...c, position: i + 1 }));
      setColumnsLocal(next);

      try {
        await moveColumn(String(active.id), newIndex + 1);
      } catch {}
      return;
    }

    if (activeType === "task") {
      const fromColumnId = active?.data?.current?.columnId;
      let targetColumnId = null;
      let targetIndex = null;

      const overType = over?.data?.current?.type;

      if (overType === "task") {
        targetColumnId = over?.data?.current?.columnId || null;
        if (!targetColumnId) return;

        const targetTasks = tasks
          .filter((t) => t.columnId === targetColumnId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        targetIndex = targetTasks.findIndex((t) => t.id === over.id);
        if (targetIndex < 0) targetIndex = targetTasks.length;
      } else if (overType === "column-drop") {
        targetColumnId = over?.data?.current?.columnId || null;
        if (!targetColumnId) return;

        const targetTasks = tasks
          .filter((t) => t.columnId === targetColumnId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        targetIndex = targetTasks.length;
      } else if (overType === "column") {
        targetColumnId = String(over.id);
        const targetTasks = tasks
          .filter((t) => t.columnId === targetColumnId)
          .sort((a, b) => (a.position || 0) - (b.position || 0));
        targetIndex = targetTasks.length;
      } else {
        const overId = String(over.id || "");
        if (overId.startsWith("column-drop-")) {
          targetColumnId = overId.replace("column-drop-", "");
          const targetTasks = tasks
            .filter((t) => t.columnId === targetColumnId)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
          targetIndex = targetTasks.length;
        }
      }

      if (!fromColumnId || !targetColumnId || targetIndex == null) return;

      try {
        await moveTask(String(active.id), { columnId: targetColumnId, position: targetIndex + 1 });
      } catch {}
    }
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h5 className="m-0">Columns</h5>

        {canManageColumns ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setCreateState({ show: true, title: "", isDone: false, error: "" })}
          >
            <i className="mdi mdi-plus me-1" />
            New column
          </button>
        ) : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={columnIds} strategy={rectSortingStrategy}>
          <div className="row g-3">
            {columnsWithTasks.map(({ column, tasks: colTasks }) => (
              <SortableColumn key={column.id} columnId={column.id} canDrag={!!canManageColumns}>
                <Column
                  column={column}
                  tasks={colTasks}
                  canManage={!!canManageColumns}
                  canAddTask={!!canAddTask}
                  onAddTask={openAddTask}
                  onOpenSettings={openSettings}
                  onDeleteColumn={askDeleteColumn}
                >
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} onClick={() => onTaskClick?.(t)} />
                  ))}
                </Column>
              </SortableColumn>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <TextInputModal
        show={addTaskModal.show}
        title="New task"
        label="Task title"
        value={addTaskModal.title}
        placeholder="e.g. Fix login bug"
        onChange={(val) => setAddTaskModal((s) => ({ ...s, title: val, error: "" }))}
        onCancel={closeAddTask}
        onSubmit={submitAddTask}
        submitLabel={addTaskModal.submitting ? "Creating..." : "Create"}
        submitting={addTaskModal.submitting}
        error={addTaskModal.error}
      />

      {createState.show ? (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
          tabIndex="-1"
          role="dialog"
          onClick={closeCreate}
        >
          <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New column</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeCreate} />
              </div>

              <div className="modal-body">
                {createState.error ? <div className="alert alert-danger">{createState.error}</div> : null}

                <label className="form-label small fw-semibold" htmlFor="new-col-title">
                  Title
                </label>
                <input
                  id="new-col-title"
                  className="form-control form-control-sm"
                  value={createState.title}
                  onChange={(e) => setCreateState((s) => ({ ...s, title: e.target.value }))}
                />

                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="new-col-done"
                    checked={createState.isDone}
                    onChange={(e) => setCreateState((s) => ({ ...s, isDone: e.target.checked }))}
                  />
                  <label className="form-check-label small" htmlFor="new-col-done">
                    Mark as “Done” column
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeCreate}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleCreate}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {settingsState.show ? (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,0.4)" }}
          tabIndex="-1"
          role="dialog"
          onClick={closeSettings}
        >
          <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Column settings</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeSettings} />
              </div>

              <div className="modal-body">
                {settingsState.error ? <div className="alert alert-danger">{settingsState.error}</div> : null}

                <label className="form-label small fw-semibold" htmlFor="settings-title">
                  Title
                </label>
                <input
                  id="settings-title"
                  className="form-control form-control-sm"
                  value={settingsState.title}
                  onChange={(e) => setSettingsState((s) => ({ ...s, title: e.target.value }))}
                />

                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="settings-done"
                    checked={settingsState.isDone}
                    onChange={(e) => setSettingsState((s) => ({ ...s, isDone: e.target.checked }))}
                  />
                  <label className="form-check-label small" htmlFor="settings-done">
                    Mark as “Done” column
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={closeSettings} disabled={settingsState.saving}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveSettings} disabled={settingsState.saving}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        show={deleteConfirm.show}
        title="Delete column"
        message={`Delete this column? All tasks inside will be removed.`}
        onCancel={() => setDeleteConfirm({ show: false, column: null, submitting: false })}
        onConfirm={confirmDeleteColumn}
        confirmVariant="danger"
        confirmLabel={deleteConfirm.submitting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
      />
    </>
  );
}

// /client/src/store/board-store.js
// Global state for boards, columns, tasks and labels.
// This store talks to the backend API and keeps React components
// in sync with the current board state.

import { create } from "zustand";
import { apiClient } from "../api/api-client.js";

export const useBoardStore = create((set, get) => ({
  // List of all boards visible to the current user.
  boards: [],

  // ID of the board currently opened in the UI.
  activeBoardId: null,

  // Details for the active board.
  columns: [],
  tasks: [],
  labels: [],

  // Loading flags and last error.
  loadingBoards: false,
  loadingBoard: false,
  error: null,

  // ===== Boards =====

  // Loads all boards from GET /boards.
  async loadBoards() {
    set({ loadingBoards: true, error: null });
    try {
      const boards = await apiClient.get("/boards");
      set({ boards });
    } catch (error) {
      console.error("loadBoards failed", error);
      set({ error: "Failed to load boards" });
    } finally {
      set({ loadingBoards: false });
    }
  },

  // Creates a new board via POST /boards.
  async createBoard(name) {
    const body = { name };
    const board = await apiClient.post("/boards", body);
    set((state) => ({ boards: [...state.boards, board] }));
    return board;
  },

  // Renames a board via PATCH /boards/:id.
  async updateBoard(id, name) {
    const board = await apiClient.patch(`/boards/${id}`, { name });
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? board : b)),
    }));
    return board;
  },

  // Deletes a board via DELETE /boards/:id.
  async deleteBoard(id) {
    await apiClient.del(`/boards/${id}`);
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      activeBoardId: state.activeBoardId === id ? null : state.activeBoardId,
    }));
  },

// Loads columns, tasks and labels for a board.
  // Uses:
  //   GET /boards/:id/columns
  //   GET /boards/:id/tasks
  //   GET /boards/:id/labels
  async loadBoard(boardId) {
    set({ loadingBoard: true, error: null, activeBoardId: boardId });
    try {
      const [columns, tasks, labels] = await Promise.all([
        apiClient.get(`/boards/${boardId}/columns`),
        apiClient.get(`/boards/${boardId}/tasks`),
        apiClient.get(`/boards/${boardId}/labels`),
      ]);
      columns.sort((a, b) => a.position - b.position);
      tasks.sort((a, b) => a.position - b.position);
      set({
        columns,
        tasks,
        labels,
        loadingBoard: false,
      });
    } catch (err) {
      console.error(err);
      set({
        loadingBoard: false,
        error: err.message || "Failed to load board",
      });
    }
  },

  // Convenience alias – some components call loadBoardDetails.
  async loadBoardDetails(boardId) {
    return get().loadBoard(boardId);
  },

  // ===== Columns =====

  // Creates a new column at the end of the board.
  async createColumn(boardId, title) {
    const columns = get().columns;
    const position = columns.length + 1;
    const column = await apiClient.post("/columns", {
      boardId,
      title,
      position,
    });
    set((state) => ({
      columns: [...state.columns, column].sort(
        (a, b) => a.position - b.position
      ),
    }));
    return column;
  },

  // Deletes a column and all tasks inside it from local state.
  async deleteColumn(columnId) {
    await apiClient.del(`/columns/${columnId}`);
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== columnId),
      tasks: state.tasks.filter((t) => t.columnId !== columnId),
    }));
  },

  // Renames a column via PATCH /columns/:id.
  async updateColumn(columnId, title) {
    const column = await apiClient.patch(`/columns/${columnId}`, { title });
    set((state) => ({
      columns: state.columns.map((c) =>
        c.id === columnId ? column : c
      ),
    }));
    return column;
  },

  // Moves a column (drag & drop) within a board.
  async moveColumn(columnId, targetPosition) {
    const boardId = get().activeBoardId;
    if (!boardId) return;

    const prevColumns = get().columns;

    try {
      await apiClient.patch(`/columns/${columnId}`, {
        position: targetPosition,
      });

      const columns = await apiClient.get(`/boards/${boardId}/columns`);
      columns.sort((a, b) => a.position - b.position);
      set({ columns });
    } catch (err) {
      console.error("moveColumn failed", err);
      set({ columns: prevColumns });
      throw err;
    }
  },

  // ===== Tasks =====

  // Creates a new task in the given column.
  async createTask(boardId, columnId, title) {
    const body = { title, columnId };
    const task = await apiClient.post(`/boards/${boardId}/tasks`, body);
    set((state) => ({
      tasks: [...state.tasks, task].sort((a, b) => a.position - b.position),
    }));
    return task;
  },

  // Deletes a task from the board.
  async deleteTask(taskId) {
    await apiClient.del(`/tasks/${taskId}`);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },

  // Updates a task (e.g., title) via PATCH /tasks/:id and updates local state.
  async updateTask(taskId, partial) {
    const task = await apiClient.patch(`/tasks/${taskId}`, partial);
    get().updateTaskFromApi(task);
    return task;
  },

  // Local-only helper: updates task when we want to change it in memory.
  updateTaskLocal(taskId, columnId, position) {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, columnId, position } : t
      ),
    }));
  },

  // Replaces a task with the copy returned by API.
  updateTaskFromApi(task) {
    set((state) => ({
      tasks: state.tasks
        .map((t) => (t.id === task.id ? task : t))
        .sort((a, b) => a.position - b.position),
    }));
  },

  // ===== Labels for active board (full list) =====
  // Board labels are simple text values (name).
  // The first label is used for sorting on the main page.

  async createLabel(boardId, name) {
    const label = await apiClient.post(`/boards/${boardId}/labels`, {
      name,
    });
    set((state) => ({
      labels: [...state.labels, label],
      boards: state.boards.map((b) =>
        b.id === boardId
          ? { ...b, labels: [...(b.labels || []), label] }
          : b
      ),
    }));
    return label;
  },

  async updateLabel(boardId, labelId, name) {
    const label = await apiClient.patch(
      `/boards/${boardId}/labels/${labelId}`,
      { name }
    );
    set((state) => ({
      labels: state.labels.map((l) => (l.id === labelId ? label : l)),
      boards: state.boards.map((b) =>
        b.id === boardId
          ? {
              ...b,
              labels: (b.labels || []).map((l) =>
                l.id === labelId ? label : l
              ),
            }
          : b
      ),
    }));
    return label;
  },

  async deleteLabel(boardId, labelId) {
    await apiClient.del(`/boards/${boardId}/labels/${labelId}`);
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== labelId),
      boards: state.boards.map((b) =>
        b.id === boardId
          ? {
              ...b,
              labels: (b.labels || []).filter((l) => l.id !== labelId),
            }
          : b
      ),
    }));
  },

  // ===== Move task (used by drag & drop) =====

  // Moves a task to another column or position and then reloads tasks
  // from the backend so both sides stay in sync.
  async moveTask(taskId, targetColumnId, targetPosition) {
    const boardId = get().activeBoardId;
    if (!boardId) return;

    const previousTasks = get().tasks;

    try {
      await apiClient.patch(`/tasks/${taskId}/move`, {
        columnId: targetColumnId,
        position: targetPosition,
      });

      const tasks = await apiClient.get(`/boards/${boardId}/tasks`);
      tasks.sort((a, b) => a.position - b.position);
      set({ tasks });
    } catch (err) {
      console.error("moveTask failed", err);
      set({ tasks: previousTasks });
      throw err;
    }
  },
}));

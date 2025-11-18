// /client/src/store/board-store.js
// Global state for boards, columns, tasks and labels.
// This store is responsible for talking to the backend API and keeping
// the React components in sync with the current board state.

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

  // ===== Active board details =====

  // Sets which board is currently active.
  setActiveBoard(boardId) {
    set({ activeBoardId: boardId });
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
  // These are still used by loadBoard, but the UI now treats
  // the *first* label as "board color".

  async createLabel(boardId, name, color) {
    const label = await apiClient.post(`/boards/${boardId}/labels`, {
      name,
      color,
    });
    set((state) => ({ labels: [...state.labels, label] }));
    return label;
  },

  async updateLabel(boardId, labelId, name, color) {
    const label = await apiClient.patch(
      `/boards/${boardId}/labels/${labelId}`,
      { name, color }
    );
    set((state) => ({
      labels: state.labels.map((l) => (l.id === labelId ? label : l)),
    }));
    return label;
  },

  async deleteLabel(boardId, labelId) {
    await apiClient.del(`/boards/${boardId}/labels/${labelId}`);
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== labelId),
    }));
  },

  // ===== Board color (one color per board, based on first label) =====

  // Sets a single "board color" using labels API:
  // - if the board has no labels yet, it creates one with this color
  // - otherwise it updates the first label and keeps only that one in boards[i].labels
  async setBoardColor(boardId, color) {
    const state = get();
    const board = state.boards.find((b) => b.id === boardId);
    if (!board) return;

    const firstLabel = board.labels && board.labels[0];
    let updatedLabel;

    if (!firstLabel) {
      // No label yet -> create one.
      updatedLabel = await apiClient.post(`/boards/${boardId}/labels`, {
        name: "Board color",
        color,
      });
    } else {
      // Update existing label color.
      updatedLabel = await apiClient.patch(
        `/boards/${boardId}/labels/${firstLabel.id}`,
        { color }
      );
    }

    // Update boards array so list view sees the new color.
    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, labels: [updatedLabel] } : b
      ),
    }));

    // If active board is this board, also keep labels[] in sync.
    const activeId = state.activeBoardId;
    if (activeId === boardId) {
      set({ labels: [updatedLabel] });
    }
  },

  // ===== Move task (used by drag & drop) =====

  // Moves a task to another column or position and then reloads tasks
  // from the backend so both sides stay in sync.
  async moveTask(taskId, targetColumnId, targetPosition) {
    const boardId = get().activeBoardId;
    if (!boardId) return;

    const previousTasks = get().tasks;

    try {
      // PATCH /tasks/:id/move
      await apiClient.patch(`/tasks/${taskId}/move`, {
        columnId: targetColumnId,
        position: targetPosition,
      });

      // Reload tasks for this board to get final positions from server.
      const tasks = await apiClient.get(`/boards/${boardId}/tasks`);
      tasks.sort((a, b) => a.position - b.position);
      set({ tasks });
    } catch (err) {
      console.error("moveTask failed", err);
      // Roll back to previous state if the request fails.
      set({ tasks: previousTasks });
      throw err;
    }
  },
}));

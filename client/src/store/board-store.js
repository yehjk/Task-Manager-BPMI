// /client/src/store/board-store.js
import { create } from "zustand";
import { apiClient } from "../api/api-client.js";

function sortColumns(cols) {
  return [...(Array.isArray(cols) ? cols : [])].sort((a, b) => (a.position || 0) - (b.position || 0));
}

export const useBoardStore = create((set, get) => ({
  boards: [],
  board: null,
  columns: [],
  tasks: [],
  labels: [],
  loadingBoards: false,
  loadingBoard: false,
  error: "",

  setColumnsLocal(columns) {
    set({ columns: sortColumns(columns) });
  },

  setTasksLocal(tasks) {
    set({ tasks: Array.isArray(tasks) ? tasks : [] });
  },

  async loadBoards() {
    set({ loadingBoards: true, error: "" });
    try {
      const data = await apiClient.get("/boards");
      set({ boards: Array.isArray(data) ? data : [], loadingBoards: false });
    } catch (e) {
      set({ boards: [], loadingBoards: false, error: e?.message || "Failed to load boards" });
    }
  },

  async loadBoardDetails(boardId) {
    set({ loadingBoard: true, error: "" });
    try {
      const board = await apiClient.get(`/boards/${boardId}`);
      const tasks = await apiClient.get(`/boards/${boardId}/tasks`);

      const columns = sortColumns(board?.columns);
      const labels = Array.isArray(board?.labels) ? board.labels : [];

      set({
        board,
        columns,
        tasks: Array.isArray(tasks) ? tasks : [],
        labels,
        loadingBoard: false,
      });

      set((s) => ({ boards: s.boards.map((b) => (b.id === boardId ? board : b)) }));
    } catch (e) {
      set({ loadingBoard: false, error: e?.message || "Failed to load board" });
    }
  },

  async createColumn(boardId, payload) {
    const col = await apiClient.post(`/columns`, { boardId, ...payload });
    set((state) => ({ columns: sortColumns([...state.columns, col]) }));
    return col;
  },

  async updateColumn(columnId, patch) {
    const column = await apiClient.patch(`/columns/${columnId}`, patch);
    set((state) => ({ columns: state.columns.map((c) => (c.id === columnId ? column : c)) }));
    return column;
  },

  async moveColumn(columnId, newPosition) {
    await apiClient.patch(`/columns/${columnId}`, { position: newPosition });
  },

  async deleteColumn(columnId) {
    await apiClient.del(`/columns/${columnId}`);
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== columnId),
      tasks: state.tasks.filter((t) => t.columnId !== columnId),
    }));
  },

  async moveTask(taskId, payload) {
    const updated = await apiClient.patch(`/tasks/${taskId}/move`, payload);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
    }));
    return updated;
  },

  async updateTask(taskId, payload) {
    const updated = await apiClient.patch(`/tasks/${taskId}`, payload);
    set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) }));
    return updated;
  },

  async createTask(boardId, payload) {
    const created = await apiClient.post(`/boards/${boardId}/tasks`, payload);
    set((state) => ({ tasks: [...state.tasks, created] }));
    return created;
  },

  async deleteTask(taskId) {
    await apiClient.del(`/tasks/${taskId}`);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
  },

  async createLabel(boardId, name) {
    const created = await apiClient.post(`/boards/${boardId}/labels`, { name });
    await get().loadBoardDetails(boardId);
    return created;
  },

  async updateLabel(boardId, labelId, name) {
    const updated = await apiClient.patch(`/boards/${boardId}/labels/${labelId}`, { name });
    await get().loadBoardDetails(boardId);
    return updated;
  },
}));

// /client/src/store/auth-store.js
// Global auth state built with Zustand.
// Stores current user + token and knows how to:
// - initialize from localStorage on app start
// - call POST /auth/login-mock
// - logout and clear storage
import { create } from "zustand";
import { apiClient } from "../api/api-client.js";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isReady: false, // becomes true after initFromStorage()

  initFromStorage() {
    try {
      const rawUser = window.localStorage.getItem("tm_user");
      const token = window.localStorage.getItem("tm_token");
      if (token && rawUser) {
        const user = JSON.parse(rawUser);
        set({ user, token, isReady: true });
      } else {
        set({ user: null, token: null, isReady: true });
      }
    } catch {
      set({ user: null, token: null, isReady: true });
    }
  },

  async loginMock() {
    const data = await apiClient.post("/auth/login-mock", {});
    window.localStorage.setItem("tm_token", data.token);
    window.localStorage.setItem("tm_user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  logout() {
    window.localStorage.removeItem("tm_token");
    window.localStorage.removeItem("tm_user");
    set({ user: null, token: null });
  },

  isAuthenticated() {
    return !!get().token;
  },
}));

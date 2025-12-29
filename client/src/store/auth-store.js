// /client/src/store/auth-store.js
import { create } from "zustand";
import { apiClient } from "../api/api-client.js";

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isReady: false,

  initFromStorage() {
    try {
      const rawUser = window.localStorage.getItem("tm_user");
      const token = window.localStorage.getItem("tm_token");
      if (token) {
        const user = rawUser ? JSON.parse(rawUser) : null;
        set({ user, token, isReady: true });
      } else {
        set({ user: null, token: null, isReady: true });
      }
    } catch {
      set({ user: null, token: null, isReady: true });
    }
  },

  async login(email, password) {
    const data = await apiClient.post("/auth/login", { email, password });
    window.localStorage.setItem("tm_token", data.token);
    window.localStorage.setItem("tm_user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  async register(name, email, password) {
    const data = await apiClient.post("/auth/register", { name, email, password });
    window.localStorage.setItem("tm_token", data.token);
    window.localStorage.setItem("tm_user", JSON.stringify(data.user));
    set({ user: data.user, token: data.token });
  },

  async startGoogleLogin() {
    const data = await apiClient.get("/auth/google/url");
    if (!data?.url) throw new Error("Google URL missing");
    window.location.href = data.url;
  },

  applyTokenFromOAuth(token) {
    const payload = decodeJwtPayload(token);
    if (!payload?.email) throw new Error("Invalid token");
    const user = { id: payload.id, name: payload.name || "", email: payload.email };
    window.localStorage.setItem("tm_token", token);
    window.localStorage.setItem("tm_user", JSON.stringify(user));
    set({ token, user });
  },

  logout() {
    window.localStorage.removeItem("tm_token");
    window.localStorage.removeItem("tm_user");
    set({ user: null, token: null });
  },
}));

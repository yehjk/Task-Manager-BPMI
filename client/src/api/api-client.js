// /client/src/api/api-client.js
// Small wrapper around fetch used across the React app.
// Responsibilities:
// - prepend API base URL
// - attach JSON headers
// - attach JWT from localStorage
// - handle 401 by clearing auth and redirecting to /login

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  // Attach stored JWT if available
  const token = window.localStorage.getItem("tm_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  const res = await fetch(url, fetchOptions);

  // Handle unauthorized state globally
  if (res.status === 401) {
    window.localStorage.removeItem("tm_token");
    window.localStorage.removeItem("tm_user");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  // Handle non-OK responses
  if (!res.ok) {
    const message = data?.message || data?.error || "API error";
    const error = new Error(message);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};

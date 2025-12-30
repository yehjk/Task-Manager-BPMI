const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function isAbsoluteUrl(s) {
  return /^https?:\/\//i.test(String(s || ""));
}

function joinUrl(base, path) {
  const p = String(path || "");
  if (!p) return base || "";

  if (isAbsoluteUrl(p)) return p;

  const cleanPath = p.startsWith("/") ? p : `/${p}`;
  if (!base) return cleanPath;
  if (base === "/") return cleanPath;

  return `${String(base).replace(/\/+$/, "")}${cleanPath}`;
}

async function request(path, options = {}) {
  const url = joinUrl(API_BASE_URL, path);

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = window.localStorage.getItem("tm_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;
  const rawText = !isJson ? await res.text().catch(() => "") : "";

  if (res.status === 401) {
    window.localStorage.removeItem("tm_token");
    window.localStorage.removeItem("tm_user");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || rawText || `API error (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export const apiClient = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};

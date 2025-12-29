// /client/src/api/api-client.js

const RAW_BASE = import.meta.env.VITE_API_BASE_URL;

function normalizeBaseUrl(raw) {
  const v = String(raw ?? "").trim();
  if (!v) return "/api";
  return v.replace(/\/+$/, "");
}

const API_BASE_URL = normalizeBaseUrl(RAW_BASE);

function isAbsoluteUrl(s) {
  return /^https?:\/\//i.test(s);
}

function joinUrl(base, path) {
  const p = String(path || "");
  if (!p) return base || "";

  if (isAbsoluteUrl(p)) return p;

  const cleanPath = p.startsWith("/") ? p : `/${p}`;

  if (!base) return cleanPath;

  if (base === "/") return cleanPath;

  return `${base}${cleanPath}`;
}

async function request(path, options = {}) {
  const url = joinUrl(API_BASE_URL, path);

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  const token = window.localStorage.getItem("tm_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = options.body != null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    throw new Error(`Network error while calling API (${url}): ${e?.message || e}`);
  }

  if (res.status === 204) return null;

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

  if (!isJson) {
    const hint =
      `Expected JSON but got "${contentType || "no content-type"}". ` +
      `Check VITE_API_BASE_URL (current: "${API_BASE_URL}") and reverse proxy (/api).`;
    const err = new Error(hint);
    err.status = res.status;
    err.payload = { rawText: rawText?.slice?.(0, 400) || "" };
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

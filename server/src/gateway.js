// /server/src/gateway.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();

const CLIENT_ORIGIN_RAW = process.env.CLIENT_ORIGIN || "";
const CLIENT_ORIGINS = CLIENT_ORIGIN_RAW
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const AUTH_TARGET = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const BOARDS_TARGET = process.env.BOARDS_SERVICE_URL || "http://localhost:4002";
const AUDIT_TARGET = process.env.AUDIT_SERVICE_URL || "http://localhost:4003";

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (CLIENT_ORIGINS.length === 0) return cb(null, true);
      if (CLIENT_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", gateway: true, uptime: process.uptime() });
});

app.get("/api", (_req, res) => {
  res.json({ name: "Task Manager API Gateway", version: "0.0.3-ms" });
});

app.use(
  "/auth",
  createProxyMiddleware({
    target: AUTH_TARGET,
    changeOrigin: true,
  })
);

for (const base of ["/boards", "/columns", "/tasks", "/tickets", "/invites"]) {
  app.use(
    base,
    createProxyMiddleware({
      target: BOARDS_TARGET,
      changeOrigin: true,
    })
  );
}

app.use(
  "/audit",
  createProxyMiddleware({
    target: AUDIT_TARGET,
    changeOrigin: true,
  })
);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT}`);
});

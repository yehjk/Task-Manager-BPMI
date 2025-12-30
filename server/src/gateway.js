// /server/src/gateway.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const AUTH_TARGET = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const BOARDS_TARGET = process.env.BOARDS_SERVICE_URL || "http://localhost:4002";
const AUDIT_TARGET = process.env.AUDIT_SERVICE_URL || "http://localhost:4003";

app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", gateway: true, uptime: process.uptime() });
});

app.get("/api", (_req, res) => {
  res.json({ name: "Task Manager API Gateway", version: "0.0.3-ms" });
});

app.use(
  createProxyMiddleware({
    target: AUTH_TARGET,
    changeOrigin: true,
    pathFilter: ["/auth"],
    pathRewrite: { "^/auth": "/auth" }
  })
);

app.use(
  createProxyMiddleware({
    target: BOARDS_TARGET,
    changeOrigin: true,
    pathFilter: ["/boards", "/columns", "/tasks", "/tickets", "/invites"]
  })
);

app.use(
  createProxyMiddleware({
    target: AUDIT_TARGET,
    changeOrigin: true,
    pathFilter: ["/audit"]
  })
);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT}`);
});

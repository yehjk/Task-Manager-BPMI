// API Gateway
// Routes incoming client requests to the appropriate microservices:
// - Auth service
// - Boards & Tasks service
// - Audit service
// Also exposes health endpoints for monitoring.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();

// Allowed frontend origin
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Microservice targets
const AUTH_TARGET = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const BOARDS_TARGET = process.env.BOARDS_SERVICE_URL || "http://localhost:4002";
const AUDIT_TARGET = process.env.AUDIT_SERVICE_URL || "http://localhost:4003";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);

// NOTE: Do not use express.json() here — gateway must forward raw request bodies.

/**
 * Health endpoints
 */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", gateway: true, uptime: process.uptime() });
});

app.get("/api", (_req, res) => {
  res.json({ name: "Task Manager API Gateway", version: "0.0.3-ms" });
});

/**
 * Auth service
 * /auth/login-mock → proxied to auth-service /login-mock
 */
app.use(
  createProxyMiddleware({
    target: AUTH_TARGET,
    changeOrigin: true,
    pathFilter: ["/auth/login-mock"],
    pathRewrite: { "^/auth": "" },
  })
);

/**
 * Boards / Columns / Tasks / Tickets service
 */
app.use(
  createProxyMiddleware({
    target: BOARDS_TARGET,
    changeOrigin: true,
    pathFilter: ["/boards", "/columns", "/tasks", "/tickets"],
  })
);

/**
 * Audit service
 */
app.use(
  createProxyMiddleware({
    target: AUDIT_TARGET,
    changeOrigin: true,
    pathFilter: ["/audit"],
  })
);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT}`);
});

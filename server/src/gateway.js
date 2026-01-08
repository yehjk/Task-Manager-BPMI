// /server/src/gateway.js
// API Gateway for Task Manager (microservices)
//
// Exposes a single public API under /api/* and proxies to internal services:
//
// - /api/auth/*     -> AUTH service
// - /api/boards/*   -> BOARDS service
// - /api/columns/*  -> BOARDS service
// - /api/tasks/*    -> BOARDS service
// - /api/tickets/*  -> BOARDS service
// - /api/invites/*  -> BOARDS service
// - /api/audit/*    -> AUDIT service
//
// NOTE:
// Internal services still use /auth, /boards, etc.
// The gateway strips the "/api" prefix before forwarding.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const app = express();

// =========================
// Config
// =========================
const CLIENT_ORIGIN = "http://localhost:5173"; // http://taskmanagerapp.org

const AUTH_TARGET =
  process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const BOARDS_TARGET =
  process.env.BOARDS_SERVICE_URL || "http://localhost:4002";
const AUDIT_TARGET =
  process.env.AUDIT_SERVICE_URL || "http://localhost:4003";

// =========================
// CORS (frontend -> gateway)
// =========================
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

// =========================
// Basic endpoints
// =========================
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    gateway: true,
    uptime: process.uptime(),
  });
});

// API info endpoint (under /api)
app.get("/api", (_req, res) => {
  res.json({
    name: "Task Manager API Gateway",
    version: "0.0.4-ms",
  });
});

// =========================
// Helper: proxy factory
// =========================
function proxyTo(target, allowedPaths) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,

    // match only external /api/... paths
    pathFilter: allowedPaths,

    // strip /api prefix before forwarding
    pathRewrite: (path) => path.replace(/^\/api/, ""),

    // enable websockets if needed later
    ws: true,
  });
}

// =========================
// AUTH service
// =========================
app.use(
  proxyTo(AUTH_TARGET, [
    "/api/auth", // matches /api/auth and /api/auth/*
  ])
);

// =========================
// BOARDS + TASK service
// =========================
app.use(
  proxyTo(BOARDS_TARGET, [
    "/api/boards",
    "/api/columns",
    "/api/tasks",
    "/api/tickets",
    "/api/invites",
  ])
);

// =========================
// AUDIT service
// =========================
app.use(
  proxyTo(AUDIT_TARGET, [
    "/api/audit",
  ])
);

// =========================
// Start server
// =========================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN}`);
  console.log(`AUTH target: ${AUTH_TARGET}`);
  console.log(`BOARDS target: ${BOARDS_TARGET}`);
  console.log(`AUDIT target: ${AUDIT_TARGET}`);
});

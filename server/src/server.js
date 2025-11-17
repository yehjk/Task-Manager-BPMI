// /server/src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './modules/auth/auth-routes.js';
import boardsRouter from './modules/boards/boards-routes.js';
import taskRouter from './modules/task/task-routes.js';
import auditRouter from './modules/audit/audit-routes.js';

import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000'
  })
);
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Demo API root
app.get('/api', (_req, res) => {
  res.json({ name: 'Task Manager API', version: '0.0.1' });
});

// --- BE-3: Auth + Audit ---
app.use(authRouter);
app.use(auditRouter);

// --- BE-1: Boards & Labels ---
app.use(boardsRouter);

// --- BE-2: Columns & Tasks ---
app.use(taskRouter);

// 404 + error JSON
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

// Audit microservice
// Provides endpoints for writing and reading audit log entries.
// Runs as an independent Express service with its own Mongo connection.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import auditRouter from "./modules/audit/audit-routes.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectMongo } from "./db/mongo.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Audit endpoints
app.use(auditRouter);

// Global 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.AUDIT_PORT || 4003;

async function start() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Audit service listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start audit service:", err);
  process.exit(1);
});

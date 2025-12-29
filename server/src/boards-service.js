// /server/src/boards-service.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import boardsRouter from "./modules/boards/boards-routes.js";
import taskRouter from "./modules/task/task-routes.js";

import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { connectMongo } from "./db/mongo.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(boardsRouter);
app.use(taskRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || process.env.BOARDS_PORT || 4002;

async function start() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Boards service listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start boards service", err);
  process.exit(1);
});

// /server/src/auth-service.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./modules/auth/auth-routes.js";
import { connectMongo } from "./db/mongo.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.AUTH_PORT;

async function start() {
  await connectMongo();
  app.listen(PORT, () => {
    console.log(`Auth service listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start auth service:", err);
  process.exit(1);
});

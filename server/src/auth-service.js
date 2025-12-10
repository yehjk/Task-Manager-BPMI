// Auth microservice
// Exposes authentication-related endpoints (mock login in this demo).
// Runs as a standalone Express service.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./modules/auth/auth-routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Authentication endpoints
app.use(authRouter);

const PORT = process.env.AUTH_PORT || 4001;

app.listen(PORT, () => {
  console.log(`Auth service listening on http://localhost:${PORT}`);
});

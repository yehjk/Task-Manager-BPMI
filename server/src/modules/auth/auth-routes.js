// Auth routes
// Provides a mock login endpoint issuing a JWT for demo/testing purposes.

import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

// Mock user returned on login
const MOCK_USER = {
  id: "user-1",
  name: "Demo User",
  email: "demo@example.com",
};

// POST /auth/login-mock
// Returns a signed JWT and mock user data.
router.post("/login-mock", (_req, res) => {
  const token = jwt.sign(MOCK_USER, JWT_SECRET, { expiresIn: "7d" });

  res.json({
    token,
    user: MOCK_USER,
  });
});

export default router;

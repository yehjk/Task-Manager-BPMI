// Authentication middleware
// Validates a Bearer JWT token and attaches the decoded payload to req.user.

import jwt from "jsonwebtoken";
import { HttpError } from "../utils/httpError.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export function authRequired(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      new HttpError(401, "AUTH_REQUIRED", "Authorization token missing")
    );
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (_e) {
    next(new HttpError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}

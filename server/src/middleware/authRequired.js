// /server/src/middleware/authRequired.js
import jwt from "jsonwebtoken";
import { User } from "../db/models/User.js";
import { HttpError } from "../utils/httpError.js";

export async function authRequired(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new HttpError(401, "AUTH_REQUIRED", "No token"));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return next(new HttpError(500, "SERVER_MISCONFIG", "JWT_SECRET missing"));

    const payload = jwt.verify(token, JWT_SECRET);

    const userId = payload?.id || payload?.sub;
    if (!userId) return next(new HttpError(401, "INVALID_TOKEN", "Token missing user id"));

    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      return next(new HttpError(401, "USER_NOT_FOUND", "User no longer exists"));
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch (e) {
    next(new HttpError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}

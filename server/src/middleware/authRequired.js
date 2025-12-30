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
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ id: payload.id });

    if (!user) {
      return next(new HttpError(401, "USER_NOT_FOUND", "User no longer exists"));
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    next(new HttpError(401, "INVALID_TOKEN", "Invalid or expired token"));
  }
}

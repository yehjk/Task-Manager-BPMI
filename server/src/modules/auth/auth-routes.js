// /server/src/modules/auth/auth-routes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { User } from "../../db/models/User.js";
import { HttpError } from "../../utils/httpError.js";
import { authRequired } from "../../middleware/authRequired.js";

const router = express.Router();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[AUTH] Missing required env var: ${name}`);
  }
  return value;
}

function normEmail(raw) {
  const email = String(raw || "").trim();
  const emailLower = email.toLowerCase();
  return { email, emailLower };
}

function signToken(user) {
  const JWT_SECRET = requireEnv("JWT_SECRET");
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(
    { sub: user.id, id: user.id, email: user.email, name: user.name || "" },
    JWT_SECRET,
    { expiresIn }
  );
}

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const googleStateStore = new Map();
const GOOGLE_STATE_TTL_MS = 10 * 60 * 1000;

function cleanupGoogleStateStore() {
  const now = Date.now();
  for (const [state, v] of googleStateStore.entries()) {
    if (!v?.createdAt || now - v.createdAt > GOOGLE_STATE_TTL_MS) {
      googleStateStore.delete(state);
    }
  }
}

function buildGoogleAuthUrl({ state, codeVerifier }) {
  const GOOGLE_CLIENT_ID = requireEnv("GOOGLE_CLIENT_ID");
  const GOOGLE_REDIRECT_URI = requireEnv("GOOGLE_REDIRECT_URI");

  const codeChallenge = base64UrlEncode(crypto.createHash("sha256").update(codeVerifier).digest());

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

router.post("/register", async (req, res, next) => {
  try {
    const { email: rawEmail, password, name } = req.body || {};
    const { email, emailLower } = normEmail(rawEmail);

    if (!email || !password) {
      throw new HttpError(400, "VALIDATION_ERROR", "Email and password required");
    }

    const existing = await User.findOne({ emailLower }).lean();
    if (existing) {
      throw new HttpError(409, "EMAIL_TAKEN", "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      id: uuidv4(),
      name: (name && String(name).trim()) || email.split("@")[0],
      email,
      emailLower,
      authProvider: "local",
      providerId: null,
      passwordHash,
    });

    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email: rawEmail, password } = req.body || {};
    const { emailLower } = normEmail(rawEmail);

    if (!emailLower || !password) {
      throw new HttpError(400, "VALIDATION_ERROR", "Email and password required");
    }

    const user = await User.findOne({ emailLower });
    if (!user) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    if (!user.passwordHash) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    const token = signToken(user);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const user = await User.findOne({ id: userId }).lean();
    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found");
    }

    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
});

router.get("/google/url", async (_req, res, next) => {
  try {
    cleanupGoogleStateStore();

    const state = base64UrlEncode(crypto.randomBytes(16));
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));

    googleStateStore.set(state, { codeVerifier, createdAt: Date.now() });

    const url = buildGoogleAuthUrl({ state, codeVerifier });

    res.json({ url });
  } catch (err) {
    next(err);
  }
});

router.get("/google/callback", async (req, res, next) => {
  try {
    cleanupGoogleStateStore();

    const code = String(req.query?.code || "").trim();
    const state = String(req.query?.state || "").trim();
    if (!code || !state) {
      throw new HttpError(400, "VALIDATION_ERROR", "Missing code/state");
    }

    const stored = googleStateStore.get(state);
    if (!stored?.codeVerifier) {
      throw new HttpError(400, "GOOGLE_OAUTH_ERROR", "Invalid or expired state");
    }

    googleStateStore.delete(state);

    const GOOGLE_CLIENT_ID = requireEnv("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = requireEnv("GOOGLE_CLIENT_SECRET");
    const GOOGLE_REDIRECT_URI = requireEnv("GOOGLE_REDIRECT_URI");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
        code,
        code_verifier: stored.codeVerifier,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new HttpError(400, "GOOGLE_OAUTH_ERROR", JSON.stringify(tokenData));
    }

    const userInfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await userInfoRes.json();
    if (!userInfoRes.ok) {
      throw new HttpError(400, "GOOGLE_PROFILE_ERROR", JSON.stringify(profile));
    }

    const email = String(profile.email || "").trim();
    const emailLower = email.toLowerCase();
    const name =
      String(profile.name || profile.given_name || "").trim() || (email ? email.split("@")[0] : "user");
    const providerId = String(profile.sub || "").trim() || null;

    if (!emailLower) {
      throw new HttpError(400, "GOOGLE_PROFILE_ERROR", "Email not provided by Google");
    }

    let user = await User.findOne({ emailLower });

    if (!user) {
      user = await User.create({
        id: uuidv4(),
        name,
        email,
        emailLower,
        authProvider: "google",
        providerId,
        passwordHash: null,
      });
    } else {
      let changed = false;
      if (!user.providerId && providerId) {
        user.providerId = providerId;
        changed = true;
      }
      if (!user.name && name) {
        user.name = name;
        changed = true;
      }
      if (changed) await user.save();
    }

    const token = signToken(user);

    const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";
    const redirectUrl = `${APP_BASE_URL.replace(/\/+$/, "")}/oauth-callback?token=${encodeURIComponent(token)}`;

    res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
});

export default router;

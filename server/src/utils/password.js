import crypto from "crypto";

const ITERATIONS = 150000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const hash = parts[3];

  if (!Number.isFinite(iterations) || !salt || !hash) return false;

  const computed = crypto.pbkdf2Sync(String(password), salt, iterations, KEYLEN, DIGEST).toString("hex");
  return timingSafeEqualHex(computed, hash);
}

function timingSafeEqualHex(a, b) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

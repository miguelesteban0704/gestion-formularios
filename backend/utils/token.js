import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import crypto from "crypto";

export function signToken(payload) {
  const jti = payload.jti || crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function generateJti() {
  return crypto.randomUUID();
}

export function getTokenExpiryDate() {
  // parse env.jwtExpiresIn like "7d", "24h", "60s"
  const str = env.jwtExpiresIn || "7d";
  const num = parseInt(str, 10);
  const unit = str.replace(String(num), "").trim() || "d";
  const now = Date.now();
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] || 86400000;
  return new Date(now + num * mult);
}

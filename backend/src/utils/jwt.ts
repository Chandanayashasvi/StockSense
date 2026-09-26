import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as { id: string; email: string; role: string };
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.jwtRefreshSecret) as { id: string; email: string; role: string };
}

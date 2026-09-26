import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { loginSchema, otpRequestSchema, refreshSchema, resetPasswordSchema, signupSchema } from '../validators/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { createOtp, createUser, getUserByEmail, issueTokens, validateOtp, verifyPassword } from '../services/authService.js';
import { errorResponse } from '../utils/response.js';
import bcrypt from 'bcryptjs';

const router = Router();

function mapRole(role: string) {
  return role === 'MANAGER' ? 'Inventory Manager' : 'Warehouse Staff';
}

function toUserResponse(user: { id: string; name: string; email: string; role: string; avatarInitials: string | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: mapRole(user.role),
    avatarInitials: user.avatarInitials ?? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
  };
}

router.post('/signup', async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid signup payload', 'VALIDATION_ERROR'));
    }

    const { name, email, password } = parsed.data;
    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json(errorResponse('A user already exists with that email.', 'EMAIL_TAKEN'));

    const user = await createUser(name, email, password);
    const { accessToken, refreshToken } = await issueTokens({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ user: toUserResponse(user), token: accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid login payload', 'VALIDATION_ERROR'));
    }

    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json(errorResponse('Incorrect email or password.', 'INVALID_CREDENTIALS'));
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json(errorResponse('Incorrect email or password.', 'INVALID_CREDENTIALS'));

    const { accessToken, refreshToken } = await issueTokens({ id: user.id, email: user.email, role: user.role });
    return res.json({ user: toUserResponse(user), token: accessToken, refreshToken });
  } catch (error) {
    next(error);
  }
});

router.post('/request-otp', async (req, res, next) => {
  try {
    const parsed = otpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid email', 'VALIDATION_ERROR'));
    }

    const user = await getUserByEmail(parsed.data.email);
    if (!user) return res.status(404).json(errorResponse('No account found for that email.', 'USER_NOT_FOUND'));
    await createOtp(user.id, user.email);
    return res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid reset payload', 'VALIDATION_ERROR'));
    }

    const { email, otp, newPassword } = parsed.data;
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).json(errorResponse('No account found for that email.', 'USER_NOT_FOUND'));

    const valid = await validateOtp(user.id, otp);
    if (!valid) return res.status(400).json(errorResponse('That code is incorrect or has expired.', 'INVALID_OTP'));

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid refresh token', 'VALIDATION_ERROR'));
    }

    const refreshToken = parsed.data.refreshToken;
    const tokenRecord = await prisma.refreshToken.findMany({ where: { revoked: false }, include: { user: true } });
    let match = null as any;
    for (const record of tokenRecord) {
      const ok = await bcrypt.compare(refreshToken, record.tokenHash);
      if (ok && record.expiresAt > new Date()) {
        match = record;
        break;
      }
    }

    if (!match) return res.status(401).json(errorResponse('Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN'));

    const user = match.user;
    const accessToken = (await import('../utils/jwt.js')).signAccessToken({ id: user.id, email: user.email, role: user.role });
    return res.json({ token: accessToken, user: toUserResponse(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;
    if (token) {
      const records = await prisma.refreshToken.findMany({ where: { revoked: false } });
      for (const record of records) {
        const match = await bcrypt.compare(token, record.tokenHash);
        if (match) {
          await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
        }
      }
    }
    return res.json({ success: true, message: 'Logged out.' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json(errorResponse('User not found.', 'USER_NOT_FOUND'));
    return res.json(toUserResponse(user));
  } catch (error) {
    next(error);
  }
});

export default router;

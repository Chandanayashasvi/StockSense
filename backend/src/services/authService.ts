import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';
import { sendOtpEmail } from './email.js';

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'WAREHOUSE_STAFF',
      avatarInitials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SU',
    },
  });

  return user;
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createRefreshToken(userId: string, token: string) {
  const hash = await bcrypt.hash(token, 10);
  return prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
}

export async function issueTokens(user: { id: string; email: string; role: string }) {
  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, email: user.email, role: user.role });
  await createRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}

export async function createOtp(userId: string, email: string) {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await bcrypt.hash(otp, 10);
  const record = await prisma.oTP.create({ data: { userId, codeHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    await prisma.oTP.delete({ where: { id: record.id } });
    throw error;
  }
  return otp;
}

export async function validateOtp(userId: string, otp: string) {
  const record = await prisma.oTP.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
  if (!record || record.expiresAt < new Date() || record.usedAt) return false;
  const valid = await bcrypt.compare(otp, record.codeHash);
  if (valid) {
    await prisma.oTP.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return true;
  }
  return false;
}

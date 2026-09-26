import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { sendEmailVerification } from './emailService.js';

export async function createEmailVerification(userId: string, email: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  const record = await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  const verificationUrl = `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
  try {
    await sendEmailVerification(email, verificationUrl);
  } catch (error) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    throw error;
  }
}

export async function verifyEmailToken(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!record) return 'invalid' as const;
  if (record.usedAt) return 'already_verified' as const;
  if (record.user.emailVerifiedAt) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
    return 'already_verified' as const;
  }
  if (record.expiresAt <= new Date()) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } });
    return 'expired' as const;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return 'verified' as const;
}
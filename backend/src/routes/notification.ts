import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { errorResponse } from '../utils/response.js';

const router = Router();

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  operationEmails: z.boolean(),
  lowStockEmails: z.boolean(),
});

router.get('/notifications/preferences', requireAuth, async (req, res, next) => {
  try {
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id },
      update: {},
      select: { emailNotifications: true, operationEmails: true, lowStockEmails: true },
    });
    return res.json(preferences);
  } catch (error) {
    next(error);
  }
});

router.put('/notifications/preferences', requireAuth, async (req, res, next) => {
  try {
    const parsed = notificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid notification preferences', 'VALIDATION_ERROR'));
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, ...parsed.data },
      update: parsed.data,
      select: { emailNotifications: true, operationEmails: true, lowStockEmails: true },
    });
    return res.json(preferences);
  } catch (error) {
    next(error);
  }
});

export default router;

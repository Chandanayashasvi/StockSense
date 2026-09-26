import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export function isEmailConfigured() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpFrom && env.smtpUser && env.smtpPassword);
}

export async function sendEmail(message: MailMessage) {
  if (!isEmailConfigured()) throw new EmailConfigurationError();
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPassword },
  });
  await transporter.sendMail({ from: env.smtpFrom, ...message });
}

export async function sendOtpEmail(email: string, otp: string) {
  await sendEmail({
    to: email,
    subject: 'StockSense OTP for password reset',
    text: `Your StockSense verification code is ${otp}. It expires in 10 minutes.`,
  });
}
export class EmailConfigurationError extends Error {
  statusCode = 503;
  code = 'EMAIL_NOT_CONFIGURED';

  constructor() {
    super('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.');
    this.name = 'EmailConfigurationError';
  }
}

export async function sendOperationNotification(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { warehouse: true, destinationWarehouse: true, lines: { include: { product: true } } },
  });
  if (!document) return;
  const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  const recipients = await prisma.user.findMany({
    select: { email: true, notificationPreference: { select: { emailNotifications: true, operationEmails: true } } },
  });
  const subscribedRecipients = recipients.filter(({ notificationPreference }) =>
    !notificationPreference || (notificationPreference.emailNotifications && notificationPreference.operationEmails));
  if (!subscribedRecipients.length) return;
  const lines = document.lines.map((line) => `${line.product.name} (${line.product.sku}): ${line.quantity}; resulting total stock ${line.product.totalStock}`).join('\n');
  const subjectType = document.type[0].toUpperCase() + document.type.slice(1);
  const text = [
    `${subjectType} ${document.reference} was completed.`,
    `Warehouse: ${document.warehouse.name}`,
    document.destinationWarehouse ? `Destination: ${document.destinationWarehouse.name}` : '',
    `User: ${actor?.name ?? 'StockSense user'}`,
    `Timestamp: ${new Date().toISOString()}`,
    'Products and quantities:',
    lines,
  ].filter(Boolean).join('\n');
  await Promise.all(subscribedRecipients.map(({ email }) => sendEmail({ to: email, subject: `StockSense — ${subjectType} ${document.reference} completed`, text })));
}

export async function processLowStockAlerts(items: Array<{ productId: string; warehouseId: string }>) {
  const uniqueItems = [...new Map(items.map((item) => [`${item.productId}:${item.warehouseId}`, item])).values()];
  const newAlerts: Array<{ productName: string; sku: string; warehouseName: string; locationName: string; currentStock: number; reorderPoint: number }> = [];
  for (const item of uniqueItems) {
    const snapshot = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, sku: true, reorderPoint: true } });
      const warehouse = await tx.warehouse.findUnique({ where: { id: item.warehouseId }, select: { name: true } });
      if (!product || !warehouse) return null;
      const levels = await tx.stockLevel.findMany({ where: { productId: product.id, warehouseId: item.warehouseId }, include: { location: true } });
      const currentStock = levels.reduce((sum, level) => sum + level.quantity, 0);
      const state = await tx.lowStockAlertState.findUnique({ where: { productId_warehouseId: { productId: product.id, warehouseId: item.warehouseId } } });
      const isLow = currentStock <= product.reorderPoint;
      if (!isLow) {
        if (state?.active) await tx.lowStockAlertState.update({ where: { id: state.id }, data: { active: false } });
        return null;
      }
      if (state?.active) return null;
      await tx.lowStockAlertState.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: item.warehouseId } },
        create: { productId: product.id, warehouseId: item.warehouseId, active: true, alertedAt: new Date() },
        update: { active: true, alertedAt: new Date() },
      });
      return {
        productName: product.name,
        sku: product.sku,
        warehouseName: warehouse.name,
        locationName: levels.map((level) => level.location?.name).filter(Boolean).join(', ') || 'Unassigned',
        currentStock,
        reorderPoint: product.reorderPoint,
      };
    }, { isolationLevel: 'Serializable' });
    if (snapshot) newAlerts.push(snapshot);
  }
  if (!newAlerts.length) return;
  const recipients = await prisma.user.findMany({
    select: { email: true, notificationPreference: { select: { emailNotifications: true, lowStockEmails: true } } },
  });
  const subscribedRecipients = recipients.filter(({ notificationPreference }) =>
    !notificationPreference || (notificationPreference.emailNotifications && notificationPreference.lowStockEmails));
  for (const alert of newAlerts) {
    const text = [
      `Product: ${alert.productName}`,
      `SKU: ${alert.sku}`,
      `Warehouse: ${alert.warehouseName}`,
      `Location: ${alert.locationName}`,
      `Current Stock: ${alert.currentStock}`,
      `Reorder Point: ${alert.reorderPoint}`,
    ].join('\n');
    await Promise.all(subscribedRecipients.map(({ email }) => sendEmail({
      to: email,
      subject: `StockSense — Low Stock Alert: ${alert.productName}`,
      text,
    })));
  }
}

export async function deliverInventoryEmails(documentId: string, userId: string, affectedStock: Array<{ productId: string; warehouseId: string }>) {
  try {
    await sendOperationNotification(documentId, userId);
  } catch (error) {
    console.error('StockSense operation email failed:', error instanceof Error ? error.message : 'unknown error');
  }
  try {
    await processLowStockAlerts(affectedStock);
  } catch (error) {
    console.error('StockSense low-stock email failed:', error instanceof Error ? error.message : 'unknown error');
  }
}
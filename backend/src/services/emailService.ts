import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function isEmailConfigured() {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpFrom && env.smtpUser && env.smtpPassword);
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

function brandedHtml(title: string, intro: string, details: string[], action?: { label: string; url: string }) {
  const rows = details.map((detail) => `<p style="margin:8px 0;color:#cbd5e1">${escapeHtml(detail)}</p>`).join('');
  const button = action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="background:#3b82f6;border-radius:6px;color:#fff;display:inline-block;font-weight:600;padding:12px 18px;text-decoration:none">${escapeHtml(action.label)}</a></p><p style="color:#94a3b8;font-size:12px;word-break:break-all">If the button does not work, open: ${escapeHtml(action.url)}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#07111f;color:#f8fafc;font-family:Arial,sans-serif"><div style="margin:0 auto;max-width:600px;padding:28px 16px"><div style="background:#08101c;border:1px solid #22324a;border-radius:8px;overflow:hidden"><div style="background:#0d1726;border-bottom:1px solid #22324a;padding:20px 24px"><span style="color:#22d3ee;font-size:13px;font-weight:700;letter-spacing:1px">STOCKSENSE</span></div><div style="padding:24px"><h1 style="font-size:21px;margin:0 0 14px">${escapeHtml(title)}</h1><p style="color:#cbd5e1;line-height:1.6;margin:0 0 18px">${escapeHtml(intro)}</p>${rows}${button}</div></div><p style="color:#64748b;font-size:12px;line-height:1.5;padding:0 8px">This is an automated StockSense message. If you were not expecting it, you can ignore this email.</p></div></body></html>`;
}

export async function sendEmail(message: MailMessage) {
  if (!isEmailConfigured()) throw new EmailConfigurationError();
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPassword },
  });
  try {
    await transporter.sendMail({ from: env.smtpFrom, ...message });
  } catch (error) {
    console.error('StockSense SMTP delivery failed:', error instanceof Error ? error.message : 'unknown transport error');
    throw new EmailDeliveryError();
  }
}

export async function sendEmailVerification(email: string, verificationUrl: string) {
  await sendEmail({
    to: email,
    subject: 'Verify your StockSense email',
    text: `Verify your email address by opening this link: ${verificationUrl}\nThis link expires in 24 hours.`,
    html: brandedHtml('Verify your email', 'Confirm this address to finish setting up your StockSense account.', [], { label: 'Verify email address', url: verificationUrl }),
  });
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
    super('Email service is not configured. Please contact the administrator.');
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
    select: { email: true, emailVerifiedAt: true, notificationPreference: { select: { emailNotifications: true, operationEmails: true } } },
  });
  const subscribedRecipients = recipients.filter(({ emailVerifiedAt, notificationPreference }) =>
    emailVerifiedAt && (!notificationPreference || (notificationPreference.emailNotifications && notificationPreference.operationEmails)));
  if (!subscribedRecipients.length) return;
  const lines = document.lines.map((line) => `${line.product.name} (${line.product.sku}): ${line.quantity}; resulting total stock ${line.product.totalStock}`).join('\n');
  const subjectType = document.type[0].toUpperCase() + document.type.slice(1);
  const details = [
    `${subjectType} ${document.reference} was completed.`,
    `Warehouse: ${document.warehouse.name}`,
    document.destinationWarehouse ? `Destination: ${document.destinationWarehouse.name}` : '',
    `User: ${actor?.name ?? 'StockSense user'}`,
    `Timestamp: ${new Date().toISOString()}`,
    'Products and quantities:',
    lines,
  ].filter(Boolean);
  const text = details.join('\n');
  await Promise.all(subscribedRecipients.map(({ email }) => sendEmail({
    to: email,
    subject: `StockSense — ${subjectType} ${document.reference} completed`,
    text,
    html: brandedHtml(`${subjectType} completed`, `Operation ${document.reference} has been completed.`, details),
  })));
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
    select: { email: true, emailVerifiedAt: true, notificationPreference: { select: { emailNotifications: true, lowStockEmails: true } } },
  });
  const subscribedRecipients = recipients.filter(({ emailVerifiedAt, notificationPreference }) =>
    emailVerifiedAt && (!notificationPreference || (notificationPreference.emailNotifications && notificationPreference.lowStockEmails)));
  for (const alert of newAlerts) {
    const details = [
      `Product: ${alert.productName}`,
      `SKU: ${alert.sku}`,
      `Warehouse: ${alert.warehouseName}`,
      `Location: ${alert.locationName}`,
      `Current Stock: ${alert.currentStock}`,
      `Reorder Point: ${alert.reorderPoint}`,
    ];
    const text = details.join('\n');
    await Promise.all(subscribedRecipients.map(({ email }) => sendEmail({
      to: email,
      subject: `StockSense — Low Stock Alert: ${alert.productName}`,
      text,
      html: brandedHtml('Low stock alert', `${alert.productName} has reached its reorder threshold.`, details),
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

export class EmailDeliveryError extends Error {
  statusCode = 503;
  code = 'EMAIL_DELIVERY_FAILED';

  constructor() {
    super('Email could not be delivered. Please try again later.');
    this.name = 'EmailDeliveryError';
  }
}
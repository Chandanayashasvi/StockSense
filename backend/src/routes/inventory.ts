import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { categorySchema, documentSchema, productSchema, warehouseSchema } from '../validators/inventory.js';
import { errorResponse } from '../utils/response.js';
import { Prisma } from '@prisma/client';
import { emitDashboardUpdate } from '../sockets/index.js';
import { deliverInventoryEmails } from '../services/emailService.js';

const router = Router();

async function addStock(tx: Prisma.TransactionClient, productId: string, warehouseId: string, quantity: number) {
  const level = await tx.stockLevel.findFirst({ where: { productId, warehouseId, locationId: null } });
  if (level) {
    await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: { increment: quantity } } });
  } else {
    await tx.stockLevel.create({ data: { productId, warehouseId, quantity } });
  }
}

async function removeStock(tx: Prisma.TransactionClient, productId: string, warehouseId: string, quantity: number) {
  const levels = await tx.stockLevel.findMany({
    where: { productId, warehouseId },
    orderBy: { quantity: 'desc' },
  });
  let remaining = quantity;
  for (const level of levels) {
    if (remaining === 0) break;
    const removed = Math.min(level.quantity, remaining);
    await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: { decrement: removed } } });
    remaining -= removed;
  }
}

router.get('/products', requireAuth, async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, stockLevels: { include: { warehouse: true, location: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
      unitOfMeasure: p.unitOfMeasure,
      reorderPoint: p.reorderPoint,
      totalStock: p.totalStock,
      stockByLocation: p.stockLevels.map((sl: any) => ({
        warehouseId: sl.warehouseId,
        warehouseName: sl.warehouse.name,
        locationId: sl.locationId ?? undefined,
        locationName: sl.location?.name ?? undefined,
        quantity: sl.quantity,
      })),
      createdAt: p.createdAt.toISOString(),
    }));

    return res.json(mapped);
  } catch (error) {
    next(error);
  }
});

router.post('/products', requireAuth, async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid product payload', 'VALIDATION_ERROR'));
    }

    const { name, sku, categoryId, unitOfMeasure, reorderPoint, initialStock = 0, warehouseId } = parsed.data;
    const existing = await prisma.product.findUnique({ where: { sku: sku.toUpperCase() } });
    if (existing) return res.status(409).json(errorResponse(`SKU "${sku}" is already in use.`, 'DUPLICATE_SKU'));

    const product = await prisma.$transaction(async (tx: any) => {
      const created = await tx.product.create({
        data: {
          name,
          sku: sku.toUpperCase(),
          categoryId,
          unitOfMeasure,
          reorderPoint,
          totalStock: initialStock,
        },
      });

      if (initialStock > 0 && warehouseId) {
        await tx.stockLevel.create({
          data: { productId: created.id, warehouseId, quantity: initialStock },
        });
      }

      return created;
    });

    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.get('/categories', requireAuth, async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return res.json(categories);
  } catch (error) {
    next(error);
  }
});

router.post('/categories', requireAuth, async (req, res, next) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid category payload', 'VALIDATION_ERROR'));

    const category = await prisma.category.create({ data: { name: parsed.data.name } });
    return res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

router.get('/warehouses', requireAuth, async (_req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ include: { locations: true }, orderBy: { name: 'asc' } });
    return res.json(warehouses);
  } catch (error) {
    next(error);
  }
});

router.post('/warehouses', requireAuth, async (req, res, next) => {
  try {
    const parsed = warehouseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid warehouse payload', 'VALIDATION_ERROR'));
    const warehouse = await prisma.warehouse.create({ data: { ...parsed.data, code: parsed.data.code.toUpperCase() } });
    return res.status(201).json(warehouse);
  } catch (error) {
    next(error);
  }
});

router.get('/documents', requireAuth, async (req, res, next) => {
  try {
    const { type, status, warehouseId, from, to } = req.query as Record<string, string | undefined>;
    const typedValue = (value: string | undefined) => value && value !== 'undefined' && value !== 'null' ? value : undefined;
    const typeFilter = typedValue(type);
    const statusFilter = typedValue(status);
    const warehouseFilter = typedValue(warehouseId);
    const fromDate = from && from !== 'undefined' && from !== 'null' ? new Date(from) : undefined;
    const toDate = to && to !== 'undefined' && to !== 'null' ? new Date(to) : undefined;

    const documents = await prisma.document.findMany({
      where: {
        ...(typeFilter ? { type: typeFilter as any } : {}),
        ...(statusFilter ? { status: statusFilter as any } : {}),
        ...(warehouseFilter ? { warehouseId: warehouseFilter } : {}),
        ...(fromDate || toDate ? { scheduledDate: { gte: fromDate, lte: toDate } } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(documents.map((doc: any) => ({
      id: doc.id,
      reference: doc.reference,
      type: doc.type,
      status: doc.status,
      warehouseId: doc.warehouseId,
      destinationWarehouseId: doc.destinationWarehouseId ?? undefined,
      partner: doc.partner ?? undefined,
      note: doc.note ?? undefined,
      scheduledDate: doc.scheduledDate.toISOString().slice(0, 10),
      createdAt: doc.createdAt.toISOString(),
      lines: doc.lines.map((line: any) => ({ id: line.id, productId: line.productId, quantity: line.quantity })),
    })));
  } catch (error) {
    next(error);
  }
});

router.post('/documents', requireAuth, async (req, res, next) => {
  try {
    const parsed = documentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(errorResponse(parsed.error.issues[0]?.message ?? 'Invalid document payload', 'VALIDATION_ERROR'));

    const ref = `WH/${parsed.data.type === 'receipt' ? 'IN' : parsed.data.type === 'delivery' ? 'OUT' : parsed.data.type === 'transfer' ? 'INT' : 'ADJ'}/${Date.now().toString().slice(-5)}`;
    const document = await prisma.document.create({
      data: {
        reference: ref,
        type: parsed.data.type,
        status: 'Draft',
        warehouseId: parsed.data.warehouseId,
        destinationWarehouseId: parsed.data.destinationWarehouseId,
        partner: parsed.data.partner,
        note: parsed.data.note,
        scheduledDate: new Date(parsed.data.scheduledDate),
        lines: { create: parsed.data.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })) },
      },
      include: { lines: true },
    });

    return res.status(201).json({
      id: document.id,
      reference: document.reference,
      type: document.type,
      status: document.status,
      warehouseId: document.warehouseId,
      destinationWarehouseId: document.destinationWarehouseId ?? undefined,
      partner: document.partner ?? undefined,
      note: document.note ?? undefined,
      scheduledDate: document.scheduledDate.toISOString().slice(0, 10),
      createdAt: document.createdAt.toISOString(),
      lines: document.lines.map((line: any) => ({ id: line.id, productId: line.productId, quantity: line.quantity })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/documents/:id/validate', requireAuth, async (req, res, next) => {
  try {
    const documentId = String(req.params.id ?? '');
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const document = await tx.document.findUnique({ where: { id: documentId }, include: { lines: true } });
      if (!document) return { failure: { status: 404, message: 'Document not found.', code: 'DOCUMENT_NOT_FOUND' }, document: null };
      if (document.status === 'Done' || document.status === 'Canceled') {
        return { failure: { status: 409, message: 'This document cannot be validated in its current status.', code: 'INVALID_DOCUMENT_STATUS' }, document: null };
      }
      if (document.type === 'transfer' && (!document.destinationWarehouseId || document.destinationWarehouseId === document.warehouseId)) {
        return { failure: { status: 400, message: 'A transfer requires a different destination warehouse.', code: 'INVALID_TRANSFER' }, document: null };
      }
      if (document.lines.some((line) => !Number.isInteger(line.quantity)
        || (document.type === 'adjustment' ? line.quantity === 0 : line.quantity <= 0))) {
        return { failure: { status: 400, message: 'Document quantities are invalid.', code: 'INVALID_QUANTITY' }, document: null };
      }

      const requiredStock = new Map<string, number>();
      for (const line of document.lines) {
        const required = document.type === 'delivery' || document.type === 'transfer'
          ? line.quantity
          : document.type === 'adjustment' && line.quantity < 0 ? -line.quantity : 0;
        if (required > 0) requiredStock.set(line.productId, (requiredStock.get(line.productId) ?? 0) + required);
      }

      for (const [productId, required] of requiredStock) {
        const levels = await tx.stockLevel.findMany({ where: { productId, warehouseId: document.warehouseId } });
        const available = levels.reduce((total, level) => total + level.quantity, 0);
        if (available < required) {
          return { failure: {
            status: 400,
            message: `Insufficient stock for ${productId}. Available: ${available}. Requested: ${required}`,
            code: 'INSUFFICIENT_STOCK',
          }, document: null };
        }
      }

      for (const line of document.lines) {
        if (document.type === 'receipt') {
          await addStock(tx, line.productId, document.warehouseId, line.quantity);
          await tx.product.update({ where: { id: line.productId }, data: { totalStock: { increment: line.quantity } } });
          await tx.ledgerEntry.create({ data: {
            documentId: document.id,
            documentReference: document.reference,
            productId: line.productId,
            warehouseId: document.warehouseId,
            quantityChange: line.quantity,
            reason: 'Receipt validation',
            userId: req.user?.id ?? null,
          } });
        } else if (document.type === 'delivery') {
          await removeStock(tx, line.productId, document.warehouseId, line.quantity);
          await tx.product.update({ where: { id: line.productId }, data: { totalStock: { decrement: line.quantity } } });
          await tx.ledgerEntry.create({ data: {
            documentId: document.id,
            documentReference: document.reference,
            productId: line.productId,
            warehouseId: document.warehouseId,
            quantityChange: -line.quantity,
            reason: 'Delivery validation',
            userId: req.user?.id ?? null,
          } });
        } else if (document.type === 'transfer') {
          const destinationWarehouseId = document.destinationWarehouseId!;
          await removeStock(tx, line.productId, document.warehouseId, line.quantity);
          await addStock(tx, line.productId, destinationWarehouseId, line.quantity);
          await tx.ledgerEntry.createMany({ data: [
            {
              documentId: document.id,
              documentReference: document.reference,
              productId: line.productId,
              warehouseId: document.warehouseId,
              quantityChange: -line.quantity,
              reason: 'Transfer source',
              userId: req.user?.id ?? null,
            },
            {
              documentId: document.id,
              documentReference: document.reference,
              productId: line.productId,
              warehouseId: destinationWarehouseId,
              quantityChange: line.quantity,
              reason: 'Transfer destination',
              userId: req.user?.id ?? null,
            },
          ] });
        } else {
          if (line.quantity > 0) await addStock(tx, line.productId, document.warehouseId, line.quantity);
          else await removeStock(tx, line.productId, document.warehouseId, -line.quantity);
          await tx.product.update({ where: { id: line.productId }, data: { totalStock: { increment: line.quantity } } });
          await tx.ledgerEntry.create({ data: {
            documentId: document.id,
            documentReference: document.reference,
            productId: line.productId,
            warehouseId: document.warehouseId,
            quantityChange: line.quantity,
            reason: document.note ?? 'Stock adjustment',
            userId: req.user?.id ?? null,
          } });
        }
      }

      const updated = await tx.document.update({
        where: { id: document.id },
        data: { status: 'Done' },
        include: { lines: true },
      });
      return { failure: null, document: updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.failure) {
      return res.status(result.failure.status).json(errorResponse(result.failure.message, result.failure.code));
    }

    emitDashboardUpdate({ type: 'stock.updated', documentReference: result.document.reference });
    const document = result.document;
    const affectedStock = document.lines.flatMap((line) => document.type === 'transfer'
      ? [
        { productId: line.productId, warehouseId: document.warehouseId },
        { productId: line.productId, warehouseId: document.destinationWarehouseId! },
      ]
      : [{ productId: line.productId, warehouseId: document.warehouseId }]);
    void deliverInventoryEmails(document.id, req.user!.id, affectedStock);
    return res.json({
      id: document.id,
      reference: document.reference,
      type: document.type,
      status: document.status,
      warehouseId: document.warehouseId,
      destinationWarehouseId: document.destinationWarehouseId ?? undefined,
      partner: document.partner ?? undefined,
      note: document.note ?? undefined,
      scheduledDate: document.scheduledDate.toISOString().slice(0, 10),
      createdAt: document.createdAt.toISOString(),
      lines: document.lines.map((line) => ({ id: line.id, productId: line.productId, quantity: line.quantity })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/move-history', requireAuth, async (_req, res, next) => {
  try {
    const ledger = await prisma.ledgerEntry.findMany({
      include: { product: true, location: true, document: { select: { type: true } } },
      orderBy: { timestamp: 'desc' },
    });
    return res.json(ledger.map((entry: any) => ({
      id: entry.id,
      documentReference: entry.documentReference,
      productId: entry.productId,
      movementType: entry.document.type,
      quantityChange: entry.quantityChange,
      warehouseId: entry.warehouseId,
      locationId: entry.locationId ?? undefined,
      locationName: entry.location?.name ?? undefined,
      timestamp: entry.timestamp.toISOString(),
      reason: entry.reason,
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard/stats', requireAuth, async (_req, res, next) => {
  try {
    const stats = await prisma.$transaction(async (tx: any) => {
      const totalProducts = await tx.product.count();
      const stockThresholds = await tx.product.findMany({ select: { totalStock: true, reorderPoint: true } });
      const lowStockCount = stockThresholds.filter((product: { totalStock: number; reorderPoint: number }) => product.totalStock > 0 && product.totalStock <= product.reorderPoint).length;
      const outOfStockCount = stockThresholds.filter((product: { totalStock: number }) => product.totalStock === 0).length;
      const pendingReceipts = await tx.document.count({ where: { type: 'receipt', status: { notIn: ['Done', 'Canceled'] } } });
      const pendingDeliveries = await tx.document.count({ where: { type: 'delivery', status: { notIn: ['Done', 'Canceled'] } } });
      const scheduledTransfers = await tx.document.count({ where: { type: 'transfer', status: { notIn: ['Done', 'Canceled'] } } });
      return { totalProducts, lowStockCount, outOfStockCount, pendingReceipts, pendingDeliveries, scheduledTransfers };
    });
    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;

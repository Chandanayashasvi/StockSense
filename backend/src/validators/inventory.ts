import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(1).max(150),
  sku: z.string().min(2).max(60),
  categoryId: z.string().min(1),
  unitOfMeasure: z.string().min(1).max(20),
  reorderPoint: z.number().int().nonnegative(),
  initialStock: z.number().int().nonnegative().optional(),
  warehouseId: z.string().min(1).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(120),
});

export const warehouseSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(2).max(30),
  location: z.string().min(1).max(150),
  isActive: z.boolean().optional(),
});

export const documentSchema = z.object({
  type: z.enum(['receipt', 'delivery', 'transfer', 'adjustment']),
  warehouseId: z.string().min(1),
  destinationWarehouseId: z.string().min(1).optional(),
  partner: z.string().optional(),
  scheduledDate: z.string().min(1),
  note: z.string().optional(),
  lines: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int(),
    sourceLocation: z.string().optional(),
    destinationLocation: z.string().optional(),
  })).min(1),
});

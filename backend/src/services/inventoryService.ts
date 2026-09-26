import { prisma } from '../config/prisma.js';

type DocumentStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';
type DocumentType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export async function getDashboardStats() {
  const [totalProducts, lowStockCount, outOfStockCount, pendingReceipts, pendingDeliveries, scheduledTransfers] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { totalStock: { gt: 0, lte: prisma.product.fields ? 0 : 0 } } }),
    prisma.product.count({ where: { totalStock: 0 } }),
    prisma.document.count({ where: { type: 'receipt', status: { notIn: ['Done', 'Canceled'] } } }),
    prisma.document.count({ where: { type: 'delivery', status: { notIn: ['Done', 'Canceled'] } } }),
    prisma.document.count({ where: { type: 'transfer', status: { notIn: ['Done', 'Canceled'] } } }),
  ]);

  return {
    totalProducts,
    lowStockCount,
    outOfStockCount,
    pendingReceipts,
    pendingDeliveries,
    scheduledTransfers,
  };
}

export async function getProductList() {
  return prisma.product.findMany({
    include: { category: true, stockLevels: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCategoryList() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

export async function listWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: 'asc' } });
}

export async function listDocuments(filters: { type?: DocumentType; status?: DocumentStatus; warehouseId?: string; locationId?: string; categoryId?: string; from?: string; to?: string } = {}) {
  return prisma.document.findMany({
    where: {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.from || filters.to ? { scheduledDate: { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined } } : {}),
    },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  });
}

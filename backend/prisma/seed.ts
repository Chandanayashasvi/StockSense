import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureStockLevel(productId: string, warehouseId: string, quantity: number) {
  const level = await prisma.stockLevel.findFirst({ where: { productId, warehouseId, locationId: null } });
  if (!level) await prisma.stockLevel.create({ data: { productId, warehouseId, quantity } });
}

async function main() {
  const manager = await prisma.user.upsert({
    where: { email: 'manager@stocksense.local' },
    update: {},
    create: {
      name: 'Asha Rao',
      email: 'manager@stocksense.local',
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'MANAGER',
      avatarInitials: 'AR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@stocksense.local' },
    update: {},
    create: {
      name: 'Ravi Kumar',
      email: 'staff@stocksense.local',
      passwordHash: await bcrypt.hash('Password123!', 10),
      role: 'WAREHOUSE_STAFF',
      avatarInitials: 'RK',
    },
  });

  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Raw Materials' }, update: {}, create: { name: 'Raw Materials' } }),
    prisma.category.upsert({ where: { name: 'Fasteners' }, update: {}, create: { name: 'Fasteners' } }),
    prisma.category.upsert({ where: { name: 'Furniture' }, update: {}, create: { name: 'Furniture' } }),
    prisma.category.upsert({ where: { name: 'Electronics' }, update: {}, create: { name: 'Electronics' } }),
  ]);

  const warehouses = await Promise.all([
    prisma.warehouse.upsert({ where: { code: 'MAIN' }, update: {}, create: { name: 'Main Warehouse', code: 'MAIN', location: 'Hyderabad, IN' } }),
    prisma.warehouse.upsert({ where: { code: 'PROD' }, update: {}, create: { name: 'Production Floor', code: 'PROD', location: 'Hyderabad, IN' } }),
    prisma.warehouse.upsert({ where: { code: 'NRTH' }, update: {}, create: { name: 'North Depot', code: 'NRTH', location: 'Bengaluru, IN' } }),
  ]);

  const locations = await Promise.all([
    prisma.location.upsert({ where: { warehouseId_name: { name: 'Aisle 1', warehouseId: warehouses[0].id } }, update: {}, create: { name: 'Aisle 1', warehouseId: warehouses[0].id } }),
    prisma.location.upsert({ where: { warehouseId_name: { name: 'Aisle 2', warehouseId: warehouses[0].id } }, update: {}, create: { name: 'Aisle 2', warehouseId: warehouses[0].id } }),
    prisma.location.upsert({ where: { warehouseId_name: { name: 'Zone B', warehouseId: warehouses[1].id } }, update: {}, create: { name: 'Zone B', warehouseId: warehouses[1].id } }),
  ]);

  const products = await Promise.all([
    prisma.product.upsert({ where: { sku: 'STL-ROD-06' }, update: {}, create: { name: 'Steel Rods (6mm)', sku: 'STL-ROD-06', categoryId: categories[0].id, unitOfMeasure: 'kg', reorderPoint: 200, totalStock: 480 } }),
    prisma.product.upsert({ where: { sku: 'FST-BLT-M8' }, update: {}, create: { name: 'Hex Bolts M8', sku: 'FST-BLT-M8', categoryId: categories[1].id, unitOfMeasure: 'pcs', reorderPoint: 500, totalStock: 120 } }),
    prisma.product.upsert({ where: { sku: 'FUR-CHR-01' }, update: {}, create: { name: 'Office Chair — Mesh Back', sku: 'FUR-CHR-01', categoryId: categories[2].id, unitOfMeasure: 'pcs', reorderPoint: 15, totalStock: 42 } }),
    prisma.product.upsert({ where: { sku: 'ELC-SCN-02' }, update: {}, create: { name: 'Barcode Scanner USB', sku: 'ELC-SCN-02', categoryId: categories[3].id, unitOfMeasure: 'pcs', reorderPoint: 10, totalStock: 0 } }),
    prisma.product.upsert({ where: { sku: 'STL-SHT-02' }, update: {}, create: { name: 'Aluminium Sheet 2mm', sku: 'STL-SHT-02', categoryId: categories[0].id, unitOfMeasure: 'sheet', reorderPoint: 50, totalStock: 36 } }),
  ]);

  await Promise.all([
    ensureStockLevel(products[0].id, warehouses[0].id, 380),
    ensureStockLevel(products[0].id, warehouses[1].id, 100),
    ensureStockLevel(products[1].id, warehouses[0].id, 120),
    ensureStockLevel(products[2].id, warehouses[0].id, 30),
    ensureStockLevel(products[2].id, warehouses[2].id, 12),
    ensureStockLevel(products[4].id, warehouses[0].id, 36),
  ]);

  const receiptDoc = await prisma.document.upsert({
    where: { reference: 'WH/IN/00012' },
    update: {},
    create: {
      reference: 'WH/IN/00012',
      type: 'receipt',
      status: 'Ready',
      warehouseId: warehouses[0].id,
      partner: 'Tata Steel Supplies',
      scheduledDate: new Date('2026-09-27'),
      lines: {
        create: [{ productId: products[0].id, quantity: 150, sourceLocationId: locations[0].id }],
      },
    },
  });

  const existingLedgerEntry = await prisma.ledgerEntry.findFirst({
    where: { documentId: receiptDoc.id, productId: products[0].id, reason: 'Receipt from Tata Steel Supplies' },
  });
  if (!existingLedgerEntry) await prisma.ledgerEntry.create({
    data: {
      documentId: receiptDoc.id,
      documentReference: receiptDoc.reference,
      productId: products[0].id,
      warehouseId: warehouses[0].id,
      quantityChange: 150,
      reason: 'Receipt from Tata Steel Supplies',
      userId: manager.id,
    },
  });

  await prisma.document.upsert({
    where: { reference: 'WH/OUT/00041' },
    update: {},
    create: {
      reference: 'WH/OUT/00041',
      type: 'delivery',
      status: 'Waiting',
      warehouseId: warehouses[0].id,
      partner: 'Orbit Interiors Pvt. Ltd.',
      scheduledDate: new Date('2026-09-28'),
      lines: { create: [{ productId: products[2].id, quantity: 10 }] },
    },
  });

  await prisma.document.upsert({
    where: { reference: 'WH/INT/00007' },
    update: {},
    create: {
      reference: 'WH/INT/00007',
      type: 'transfer',
      status: 'Done',
      warehouseId: warehouses[0].id,
      destinationWarehouseId: warehouses[1].id,
      scheduledDate: new Date('2026-09-15'),
      lines: { create: [{ productId: products[0].id, quantity: 100 }] },
    },
  });

  console.log('Seed complete. Demo users: manager@stocksense.local / staff@stocksense.local | password: Password123!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

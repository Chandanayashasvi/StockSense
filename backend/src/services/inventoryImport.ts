import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';

const requiredHeaders = ['sku', 'productname', 'category', 'unitofmeasure', 'warehouse', 'location', 'quantity', 'reorderpoint'] as const;
const headerAliases: Record<string, typeof requiredHeaders[number]> = {
  sku: 'sku', product: 'productname', productname: 'productname', name: 'productname',
  category: 'category', unit: 'unitofmeasure', uom: 'unitofmeasure', unitofmeasure: 'unitofmeasure',
  warehouse: 'warehouse', location: 'location', quantity: 'quantity', stock: 'quantity',
  reorderpoint: 'reorderpoint', reorder: 'reorderpoint',
};

const rowSchema = z.object({
  sku: z.string().trim().min(1),
  productname: z.string().trim().min(1),
  category: z.string().trim().min(1),
  unitofmeasure: z.string().trim().min(1),
  warehouse: z.string().trim().min(1),
  location: z.string().trim().min(1),
  quantity: z.number().int().nonnegative(),
  reorderpoint: z.number().int().nonnegative(),
});

export interface ParsedImportRow {
  row: number;
  sku: string;
  productName: string;
  category: string;
  unitOfMeasure: string;
  warehouse: string;
  location: string;
  quantity: number;
  reorderPoint: number;
  productId?: string;
  categoryId?: string;
  warehouseId?: string;
  locationId?: string;
  errors: string[];
  duplicate: boolean;
}

export interface ImportValidation {
  rows: ParsedImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  missingFields: number;
  missingHeaders: string[];
}

function normalizeHeader(value: unknown) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCount(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = String(value ?? '').trim();
  return text === '' ? Number.NaN : Number(text);
}

interface SourceRow {
  row: number;
  values: unknown[];
}

async function readInventoryRows(buffer: Buffer, extension: string): Promise<SourceRow[]> {
  if (extension === 'csv') {
    const rows = parseCsv(buffer, { bom: true, skip_empty_lines: true, relax_column_count: true }) as unknown[][];
    return rows.map((values, index) => ({ row: index + 1, values }));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The uploaded workbook has no sheets.');
  const rows: SourceRow[] = [];
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = row.values;
    rows.push({ row: rowNumber, values: Array.isArray(values) ? values.slice(1) : Object.values(values) });
  });
  return rows;
}

export async function validateInventoryFile(buffer: Buffer, originalName: string): Promise<ImportValidation> {
  const extension = originalName.toLowerCase().split('.').pop();
  if (extension !== 'csv' && extension !== 'xlsx') throw new Error('Only .csv and .xlsx files are supported.');
  const rawRows = await readInventoryRows(buffer, extension);
  if (rawRows.length < 2) throw new Error('The file must contain a header row and at least one data row.');
  const headers = rawRows[0].values.map(normalizeHeader);
  const mappedHeaders = headers.map((header) => headerAliases[header]);
  const missingHeaders = requiredHeaders.filter((header) => !mappedHeaders.includes(header));
  const nonEmptyRows = rawRows.slice(1).flatMap(({ row, values }) => {
    if (!values.some((value) => String(value ?? '').trim() !== '')) return [];
    const mapped: Record<string, unknown> = {};
    mappedHeaders.forEach((canonical, column) => {
      if (canonical && mapped[canonical] === undefined) mapped[canonical] = values[column];
    });
    return [{ row, values: mapped }];
  });

  const [categories, warehouses, products] = await Promise.all([
    prisma.category.findMany(),
    prisma.warehouse.findMany({ include: { locations: true } }),
    prisma.product.findMany({ select: { id: true, sku: true } }),
  ]);
  const categoryByName = new Map(categories.map((item) => [item.name.trim().toLowerCase(), item.id]));
  const warehouseByName = new Map(warehouses.flatMap((item) => [[item.name.trim().toLowerCase(), item] as const, [item.code.trim().toLowerCase(), item] as const]));
  const productBySku = new Map(products.map((item) => [item.sku.toUpperCase(), item.id]));
  const skuCounts = new Map<string, number>();
  for (const { values } of nonEmptyRows) {
    const sku = String(values.sku ?? '').trim().toUpperCase();
    if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
  }

  const rows = nonEmptyRows.map(({ row, values }) => {
    const candidate = {
      sku: String(values.sku ?? '').trim().toUpperCase(),
      productname: String(values.productname ?? '').trim(),
      category: String(values.category ?? '').trim(),
      unitofmeasure: String(values.unitofmeasure ?? '').trim(),
      warehouse: String(values.warehouse ?? '').trim(),
      location: String(values.location ?? '').trim(),
      quantity: parseCount(values.quantity),
      reorderpoint: parseCount(values.reorderpoint),
    };
    const parsed = rowSchema.safeParse(candidate);
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join(' ')}: ${issue.message}`);
    const duplicate = (skuCounts.get(candidate.sku) ?? 0) > 1;
    if (duplicate) errors.push(`Duplicate SKU in file: ${candidate.sku}.`);
    const categoryId = categoryByName.get(candidate.category.toLowerCase());
    if (parsed.success && !categoryId) errors.push(`Unknown category: ${candidate.category}.`);
    const warehouse = warehouseByName.get(candidate.warehouse.toLowerCase());
    if (parsed.success && !warehouse) errors.push(`Unknown warehouse: ${candidate.warehouse}.`);
    const location = warehouse?.locations.find((item) => item.name.trim().toLowerCase() === candidate.location.toLowerCase());
    if (parsed.success && warehouse && !location) errors.push(`Unknown location ${candidate.location} in ${warehouse.name}.`);
    return {
      row,
      sku: candidate.sku,
      productName: candidate.productname,
      category: candidate.category,
      unitOfMeasure: candidate.unitofmeasure,
      warehouse: candidate.warehouse,
      location: candidate.location,
      quantity: candidate.quantity,
      reorderPoint: candidate.reorderpoint,
      productId: productBySku.get(candidate.sku),
      categoryId,
      warehouseId: warehouse?.id,
      locationId: location?.id,
      errors,
      duplicate,
    } satisfies ParsedImportRow;
  });
  const invalidRows = rows.filter((row) => row.errors.length > 0).length;
  return {
    rows,
    totalRows: rows.length,
    validRows: rows.length - invalidRows,
    invalidRows,
    duplicates: [...skuCounts.values()].filter((count) => count > 1).reduce((count, duplicates) => count + duplicates - 1, 0),
    missingFields: nonEmptyRows.reduce((count, { values }) => count + requiredHeaders.filter((header) => {
      const value = values[header];
      return value === undefined || value === null || String(value).trim() === '';
    }).length, 0),
    missingHeaders: missingHeaders.map((header) => header),
  };
}

export async function commitInventoryImport(validation: ImportValidation, userId: string) {
  if (validation.missingHeaders.length || validation.invalidRows) throw new Error('Import contains invalid rows. Correct every error before importing.');
  return prisma.$transaction(async (tx) => {
    const changedByWarehouse = new Map<string, number>();
    const ledgerChanges: Array<{ row: ParsedImportRow; productId: string; warehouseId: string; delta: number }> = [];
    let created = 0;
    let updated = 0;
    let stockChanges = 0;
    for (const row of validation.rows) {
      const categoryId = row.categoryId!;
      const warehouseId = row.warehouseId!;
      const locationId = row.locationId!;
      const product = row.productId
        ? await tx.product.update({ where: { id: row.productId }, data: { name: row.productName, categoryId, unitOfMeasure: row.unitOfMeasure, reorderPoint: row.reorderPoint } })
        : await tx.product.create({ data: { sku: row.sku, name: row.productName, categoryId, unitOfMeasure: row.unitOfMeasure, reorderPoint: row.reorderPoint, totalStock: 0 } });
      if (row.productId) updated += 1;
      else created += 1;

      const current = await tx.stockLevel.findFirst({ where: { productId: product.id, warehouseId, locationId } });
      const previousQuantity = current?.quantity ?? 0;
      const delta = row.quantity - previousQuantity;
      if (current) await tx.stockLevel.update({ where: { id: current.id }, data: { quantity: row.quantity } });
      else await tx.stockLevel.create({ data: { productId: product.id, warehouseId, locationId, quantity: row.quantity } });
      if (delta !== 0) {
        stockChanges += 1;
        changedByWarehouse.set(warehouseId, (changedByWarehouse.get(warehouseId) ?? 0) + 1);
        ledgerChanges.push({ row, productId: product.id, warehouseId, delta });
      }
      const levels = await tx.stockLevel.findMany({ where: { productId: product.id }, select: { quantity: true } });
      await tx.product.update({ where: { id: product.id }, data: { totalStock: levels.reduce((sum, level) => sum + level.quantity, 0) } });
    }

    const documents = new Map<string, { id: string; reference: string }>();
    for (const warehouseId of changedByWarehouse.keys()) {
      const reference = `WH/ADJ/IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const document = await tx.document.create({
        data: { reference, type: 'adjustment', status: 'Done', warehouseId, scheduledDate: new Date(), note: 'Inventory import' },
        select: { id: true, reference: true },
      });
      documents.set(warehouseId, document);
    }
    for (const change of ledgerChanges) {
      const document = documents.get(change.warehouseId)!;
      await tx.ledgerEntry.create({
        data: {
          documentId: document.id,
          documentReference: document.reference,
          productId: change.productId,
          warehouseId: change.warehouseId,
          locationId: change.row.locationId,
          quantityChange: change.delta,
          reason: `Inventory import at ${change.row.location}`,
          userId,
        },
      });
    }

    return {
      created,
      updated,
      stockChanges,
      ledgerEntries: ledgerChanges.length,
      affectedStock: ledgerChanges.map(({ productId, warehouseId }) => ({ productId, warehouseId })),
    };
  }, { isolationLevel: 'Serializable' });
}
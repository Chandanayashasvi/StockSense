import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { prisma } from '../src/config/prisma.js';
import { app } from '../src/server.js';

const { sendVerificationEmailMock } = vi.hoisted(() => ({
  sendVerificationEmailMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/emailService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/emailService.js')>();
  return { ...actual, sendEmailVerification: sendVerificationEmailMock };
});

describe('inventory import and notification preferences', () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  const categoryName = `Import QA ${suffix}`;
  const warehouseCode = `IQ${suffix.slice(-10)}`;
  const email = `import-${suffix.toLowerCase()}@example.com`;
  const csvSku = `CSV-${suffix}`;
  const xlsxSku = `XLSX-${suffix}`;
  let token = '';
  let categoryId = '';
  let warehouseId = '';
  let locationId = '';

  beforeAll(async () => {
    const [category, warehouse] = await Promise.all([
      prisma.category.create({ data: { name: categoryName } }),
      prisma.warehouse.create({ data: { name: `Import Warehouse ${suffix}`, code: warehouseCode, location: 'Test location' } }),
    ]);
    categoryId = category.id;
    warehouseId = warehouse.id;

    sendVerificationEmailMock.mockClear();
    const signup = await request(app).post('/api/auth/signup').send({ name: 'Import Test', email, password: 'Password123!' });
    expect(signup.status).toBe(201);
    const verificationUrl = (sendVerificationEmailMock.mock.calls[0] as [string, string])[1];
    const verificationToken = new URL(verificationUrl).searchParams.get('token');
    const verification = await request(app).post('/api/auth/verify-email').send({ token: verificationToken });
    expect(verification.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(login.status).toBe(200);
    token = login.body.token;
    const location = await prisma.location.create({ data: { name: 'Import QA Location', warehouseId } });
    locationId = location.id;
  });

  afterAll(async () => {
    const importedProducts = await prisma.product.findMany({ where: { sku: { in: [csvSku, xlsxSku] } }, select: { id: true } });
    const productIds = importedProducts.map((product) => product.id);
    const ledger = await prisma.ledgerEntry.findMany({ where: { productId: { in: productIds } }, select: { documentId: true } });
    await prisma.ledgerEntry.deleteMany({ where: { productId: { in: productIds } } });
    await prisma.document.deleteMany({ where: { id: { in: ledger.map((entry) => entry.documentId) } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.notificationPreference.deleteMany({ where: { user: { email } } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.location.deleteMany({ where: { id: locationId } });
    await prisma.warehouse.deleteMany({ where: { id: warehouseId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
  });

  it('imports a CSV snapshot and records the stock delta in the ledger', async () => {
    const csv = [
      'sku,name,category,unit,warehouse,location,quantity,reorder_point',
      `${csvSku},CSV Sample,${categoryName},pcs,${warehouseCode},Import QA Location,7,3`,
    ].join('\n');
    const response = await request(app)
      .post('/api/import/inventory')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), { filename: 'inventory.csv', contentType: 'text/csv' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, created: 1, stockChanges: 1, ledgerEntries: 1, totalRows: 1 });
    const product = await prisma.product.findUnique({ where: { sku: csvSku }, include: { stockLevels: true } });
    expect(product?.totalStock).toBe(7);
    expect(product?.stockLevels[0]).toMatchObject({ quantity: 7, warehouseId, locationId });
    const ledger = await prisma.ledgerEntry.findFirst({ where: { productId: product!.id } });
    expect(ledger).toMatchObject({ quantityChange: 7, locationId });
  });

  it('imports a real XLSX workbook', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Inventory').addRows([
      ['SKU', 'Product Name', 'Category', 'Unit of Measure', 'Warehouse', 'Location', 'Quantity', 'Reorder Point'],
      [xlsxSku, 'XLSX Sample', categoryName, 'pcs', warehouseCode, 'Import QA Location', 4, 1],
    ]);
    const file = Buffer.from(await workbook.xlsx.writeBuffer());
    const response = await request(app)
      .post('/api/import/inventory')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', file, { filename: 'inventory.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, created: 1, stockChanges: 1, ledgerEntries: 1, totalRows: 1 });
    expect(await prisma.product.findUnique({ where: { sku: xlsxSku }, select: { totalStock: true } })).toEqual({ totalStock: 4 });
  });

  it('reports duplicates and invalid quantities and refuses the whole import', async () => {
    const csv = [
      'SKU,Product Name,Category,Unit of Measure,Warehouse,Location,Quantity,Reorder Point',
      `DUP-${suffix},Duplicate One,${categoryName},pcs,${warehouseCode},Import QA Location,1,0`,
      `DUP-${suffix},Duplicate Two,${categoryName},pcs,${warehouseCode},Import QA Location,-2,0`,
    ].join('\n');
    const preview = await request(app)
      .post('/api/import/inventory/validate')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), { filename: 'invalid.csv', contentType: 'text/csv' });
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({ totalRows: 2, invalidRows: 2, duplicates: 1 });
    expect(preview.body.rows[1].errors.length).toBeGreaterThan(0);

    const commit = await request(app)
      .post('/api/import/inventory')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csv), { filename: 'invalid.csv', contentType: 'text/csv' });
    expect(commit.status).toBe(422);
    expect(await prisma.product.findUnique({ where: { sku: `DUP-${suffix}` } })).toBeNull();
  });

  it('persists notification preferences', async () => {
    const preferences = { emailNotifications: false, operationEmails: false, lowStockEmails: true };
    const saved = await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send(preferences);
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual(preferences);
    const loaded = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${token}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body).toEqual(preferences);
  });
});

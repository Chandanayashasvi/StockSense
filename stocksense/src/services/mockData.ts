// In-memory mock dataset. This is the ONLY file that should be replaced
// wholesale when a real backend is ready — every other module reads
// through the service layer (productService.ts, operationsService.ts),
// never straight from here.

import type {
  Warehouse,
  Category,
  Product,
  StockDocument,
  MoveLedgerEntry,
  User,
} from "@/types";

export const currentUser: User = {
  id: "u1",
  name: "Asha Rao",
  email: "asha.rao@stocksense.dev",
  role: "Inventory Manager",
  avatarInitials: "AR",
};

export const warehouses: Warehouse[] = [
  { id: "wh1", name: "Main Warehouse", code: "MAIN", location: "Hyderabad, IN", isActive: true },
  { id: "wh2", name: "Production Floor", code: "PROD", location: "Hyderabad, IN", isActive: true },
  { id: "wh3", name: "North Depot", code: "NRTH", location: "Bengaluru, IN", isActive: true },
];

export const categories: Category[] = [
  { id: "c1", name: "Raw Materials" },
  { id: "c2", name: "Fasteners" },
  { id: "c3", name: "Furniture" },
  { id: "c4", name: "Electronics" },
];

export let products: Product[] = [
  {
    id: "p1",
    name: "Steel Rods (6mm)",
    sku: "STL-ROD-06",
    categoryId: "c1",
    unitOfMeasure: "kg",
    reorderPoint: 200,
    totalStock: 480,
    stockByLocation: [
      { warehouseId: "wh1", quantity: 380 },
      { warehouseId: "wh2", quantity: 100 },
    ],
    createdAt: "2026-06-02T09:00:00Z",
  },
  {
    id: "p2",
    name: "Hex Bolts M8",
    sku: "FST-BLT-M8",
    categoryId: "c2",
    unitOfMeasure: "pcs",
    reorderPoint: 500,
    totalStock: 120,
    stockByLocation: [{ warehouseId: "wh1", quantity: 120 }],
    createdAt: "2026-06-05T09:00:00Z",
  },
  {
    id: "p3",
    name: "Office Chair — Mesh Back",
    sku: "FUR-CHR-01",
    categoryId: "c3",
    unitOfMeasure: "pcs",
    reorderPoint: 15,
    totalStock: 42,
    stockByLocation: [
      { warehouseId: "wh1", quantity: 30 },
      { warehouseId: "wh3", quantity: 12 },
    ],
    createdAt: "2026-06-10T09:00:00Z",
  },
  {
    id: "p4",
    name: "Barcode Scanner USB",
    sku: "ELC-SCN-02",
    categoryId: "c4",
    unitOfMeasure: "pcs",
    reorderPoint: 10,
    totalStock: 0,
    stockByLocation: [],
    createdAt: "2026-06-14T09:00:00Z",
  },
  {
    id: "p5",
    name: "Aluminium Sheet 2mm",
    sku: "STL-SHT-02",
    categoryId: "c1",
    unitOfMeasure: "sheet",
    reorderPoint: 50,
    totalStock: 36,
    stockByLocation: [{ warehouseId: "wh1", quantity: 36 }],
    createdAt: "2026-06-16T09:00:00Z",
  },
];

export let documents: StockDocument[] = [
  {
    id: "d1",
    reference: "WH/IN/00012",
    type: "receipt",
    status: "Ready",
    warehouseId: "wh1",
    partner: "Tata Steel Supplies",
    lines: [{ id: "l1", productId: "p1", quantity: 150 }],
    scheduledDate: "2026-09-27",
    createdAt: "2026-09-24T10:00:00Z",
  },
  {
    id: "d2",
    reference: "WH/IN/00013",
    type: "receipt",
    status: "Draft",
    warehouseId: "wh1",
    partner: "FastenPro Ltd.",
    lines: [{ id: "l2", productId: "p2", quantity: 1000 }],
    scheduledDate: "2026-09-30",
    createdAt: "2026-09-25T08:00:00Z",
  },
  {
    id: "d3",
    reference: "WH/OUT/00041",
    type: "delivery",
    status: "Waiting",
    warehouseId: "wh1",
    partner: "Orbit Interiors Pvt. Ltd.",
    lines: [{ id: "l3", productId: "p3", quantity: 10 }],
    scheduledDate: "2026-09-28",
    createdAt: "2026-09-25T09:15:00Z",
  },
  {
    id: "d4",
    reference: "WH/OUT/00042",
    type: "delivery",
    status: "Done",
    warehouseId: "wh3",
    partner: "Bengaluru Retail Hub",
    lines: [{ id: "l4", productId: "p3", quantity: 6 }],
    scheduledDate: "2026-09-20",
    createdAt: "2026-09-18T09:00:00Z",
  },
  {
    id: "d5",
    reference: "WH/INT/00007",
    type: "transfer",
    status: "Done",
    warehouseId: "wh1",
    destinationWarehouseId: "wh2",
    lines: [{ id: "l5", productId: "p1", quantity: 100 }],
    scheduledDate: "2026-09-15",
    createdAt: "2026-09-15T07:30:00Z",
  },
  {
    id: "d6",
    reference: "WH/ADJ/00003",
    type: "adjustment",
    status: "Done",
    warehouseId: "wh1",
    lines: [{ id: "l6", productId: "p1", quantity: -3 }],
    scheduledDate: "2026-09-22",
    createdAt: "2026-09-22T11:00:00Z",
    note: "3kg damaged in transit",
  },
  {
    id: "d7",
    reference: "WH/INT/00008",
    type: "transfer",
    status: "Waiting",
    warehouseId: "wh1",
    destinationWarehouseId: "wh3",
    lines: [{ id: "l7", productId: "p5", quantity: 12 }],
    scheduledDate: "2026-09-29",
    createdAt: "2026-09-25T13:00:00Z",
  },
];

export let ledger: MoveLedgerEntry[] = [
  { id: "m1", documentReference: "WH/INT/00007", productId: "p1", quantityChange: 0, warehouseId: "wh1", timestamp: "2026-09-15T07:35:00Z", reason: "Internal transfer to Production Floor" },
  { id: "m2", documentReference: "WH/OUT/00042", productId: "p3", quantityChange: -6, warehouseId: "wh3", timestamp: "2026-09-20T10:00:00Z", reason: "Delivery to Bengaluru Retail Hub" },
  { id: "m3", documentReference: "WH/ADJ/00003", productId: "p1", quantityChange: -3, warehouseId: "wh1", timestamp: "2026-09-22T11:05:00Z", reason: "Damaged stock adjustment" },
];

// Mutators used by the mock service layer to simulate persistence within a
// browser session (state resets on reload — a real backend would persist it).
export function addProduct(p: Product) {
  products = [p, ...products];
}
export function updateProductRecord(id: string, patch: Partial<Product>) {
  products = products.map((p) => (p.id === id ? { ...p, ...patch } : p));
}
export function addDocument(d: StockDocument) {
  documents = [d, ...documents];
}
export function updateDocumentRecord(id: string, patch: Partial<StockDocument>) {
  documents = documents.map((d) => (d.id === id ? { ...d, ...patch } : d));
}
export function addLedgerEntry(e: MoveLedgerEntry) {
  ledger = [e, ...ledger];
}

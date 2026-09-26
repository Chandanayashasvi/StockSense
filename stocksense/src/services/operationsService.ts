// Data access for receipts, delivery orders, internal transfers, stock
// adjustments and the move-history ledger, plus dashboard aggregation.
// One module for all four operation types since they share the same
// StockDocument shape and lifecycle (Draft -> Waiting -> Ready -> Done).

import { apiClient, USE_MOCKS, mockDelay, ApiError } from "./apiClient";
import * as mock from "./mockData";
import type {
  StockDocument,
  OperationType,
  DocumentStatus,
  MoveLedgerEntry,
  DashboardStats,
  DocumentLine,
  Warehouse,
} from "@/types";

export interface DocumentFilters {
  type?: OperationType;
  status?: DocumentStatus;
  warehouseId?: string;
}

export async function fetchDocuments(filters: DocumentFilters = {}): Promise<StockDocument[]> {
  if (USE_MOCKS) {
    let rows = [...mock.documents];
    if (filters.type) rows = rows.filter((d) => d.type === filters.type);
    if (filters.status) rows = rows.filter((d) => d.status === filters.status);
    if (filters.warehouseId) rows = rows.filter((d) => d.warehouseId === filters.warehouseId);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return mockDelay(rows);
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value.toString());
    }
  }

  return apiClient.get<StockDocument[]>(`/documents?${params.toString()}`);
}

export async function fetchLedger(): Promise<MoveLedgerEntry[]> {
  if (USE_MOCKS) {
    const rows = [...mock.ledger].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return mockDelay(rows);
  }
  return apiClient.get<MoveLedgerEntry[]>("/move-history");
}

export interface CreateDocumentInput {
  type: OperationType;
  warehouseId: string;
  destinationWarehouseId?: string;
  partner?: string;
  scheduledDate: string;
  note?: string;
  lines: Omit<DocumentLine, "id">[];
}

function nextReference(type: OperationType): string {
  const prefix = { receipt: "WH/IN", delivery: "WH/OUT", transfer: "WH/INT", adjustment: "WH/ADJ" }[type];
  const count = mock.documents.filter((d) => d.type === type).length + 1;
  return `${prefix}/${String(count).padStart(5, "0")}`;
}

export async function createDocument(input: CreateDocumentInput): Promise<StockDocument> {
  if (USE_MOCKS) {
    if (input.lines.length === 0) throw new ApiError("Add at least one product line before saving.");
    if (input.type === "transfer" && !input.destinationWarehouseId) {
      throw new ApiError("Select a destination location for this transfer.");
    }
    const doc: StockDocument = {
      id: `d${Date.now()}`,
      reference: nextReference(input.type),
      type: input.type,
      status: "Draft",
      warehouseId: input.warehouseId,
      destinationWarehouseId: input.destinationWarehouseId,
      partner: input.partner,
      lines: input.lines.map((l, i) => ({ ...l, id: `l${Date.now()}-${i}` })),
      scheduledDate: input.scheduledDate,
      createdAt: new Date().toISOString(),
      note: input.note,
    };
    mock.addDocument(doc);
    return mockDelay(doc, 450);
  }
  return apiClient.post<StockDocument>("/documents", input);
}

// Validating a document applies its stock effect and moves it to Done,
// mirroring the playbook's "Validate -> stock changes automatically" flow.
export async function validateDocument(id: string): Promise<StockDocument> {
  if (USE_MOCKS) {
    const doc = mock.documents.find((d) => d.id === id);
    if (!doc) throw new ApiError("Document not found.");

    for (const line of doc.lines) {
      const product = mock.products.find((p) => p.id === line.productId);
      if (!product) continue;
      const sign = doc.type === "delivery" ? -1 : doc.type === "adjustment" ? Math.sign(line.quantity) : 1;
      const delta = doc.type === "adjustment" ? line.quantity : sign * Math.abs(line.quantity);

      const locs = [...product.stockByLocation];
      const idx = locs.findIndex((l) => l.warehouseId === doc.warehouseId);
      if (idx >= 0) locs[idx] = { ...locs[idx], quantity: locs[idx].quantity + delta };
      else locs.push({ warehouseId: doc.warehouseId, quantity: delta });

      if (doc.type === "transfer" && doc.destinationWarehouseId) {
        const dIdx = locs.findIndex((l) => l.warehouseId === doc.destinationWarehouseId);
        if (dIdx >= 0) locs[dIdx] = { ...locs[dIdx], quantity: locs[dIdx].quantity + Math.abs(line.quantity) };
        else locs.push({ warehouseId: doc.destinationWarehouseId, quantity: Math.abs(line.quantity) });
      }

      const totalStock = locs.reduce((sum, l) => sum + l.quantity, 0);
      mock.updateProductRecord(product.id, { stockByLocation: locs, totalStock });

      mock.addLedgerEntry({
        id: `m${Date.now()}-${line.id}`,
        documentReference: doc.reference,
        productId: line.productId,
        quantityChange: doc.type === "transfer" ? 0 : delta,
        warehouseId: doc.warehouseId,
        timestamp: new Date().toISOString(),
        reason: `${doc.type[0].toUpperCase()}${doc.type.slice(1)} ${doc.reference}${doc.partner ? ` — ${doc.partner}` : ""}`,
      });
    }

    mock.updateDocumentRecord(id, { status: "Done" });
    return mockDelay({ ...doc, status: "Done" as DocumentStatus }, 400);
  }
  return apiClient.post<StockDocument>(`/documents/${id}/validate`);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCKS) {
    const stats: DashboardStats = {
      totalProducts: mock.products.length,
      lowStockCount: mock.products.filter((p) => p.totalStock > 0 && p.totalStock <= p.reorderPoint).length,
      outOfStockCount: mock.products.filter((p) => p.totalStock === 0).length,
      pendingReceipts: mock.documents.filter((d) => d.type === "receipt" && d.status !== "Done" && d.status !== "Canceled").length,
      pendingDeliveries: mock.documents.filter((d) => d.type === "delivery" && d.status !== "Done" && d.status !== "Canceled").length,
      scheduledTransfers: mock.documents.filter((d) => d.type === "transfer" && d.status !== "Done" && d.status !== "Canceled").length,
    };
    return mockDelay(stats, 350);
  }
  return apiClient.get<DashboardStats>("/dashboard/stats");
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  if (USE_MOCKS) return mockDelay([...mock.warehouses]);
  return apiClient.get<Warehouse[]>("/warehouses");
}

export async function createWarehouse(input: { name: string; code: string; location: string }): Promise<Warehouse> {
  if (USE_MOCKS) throw new ApiError("Warehouse creation requires the live StockSense API.");
  return apiClient.post<Warehouse>("/warehouses", input);
}

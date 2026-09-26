// Core domain models for StockSense.
// These mirror the shape the backend API is expected to return, so the
// mock service layer and the real API client can be swapped without any
// change to components — see src/services/apiClient.ts.

export type DocumentStatus = "Draft" | "Waiting" | "Ready" | "Done" | "Canceled";

export type OperationType = "receipt" | "delivery" | "transfer" | "adjustment";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Inventory Manager" | "Warehouse Staff";
  avatarInitials: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  isActive: boolean;
  locations?: Array<{ id: string; name: string }>;
}

export interface Category {
  id: string;
  name: string;
}

export interface StockByLocation {
  warehouseId: string;
  warehouseName?: string;
  locationId?: string;
  locationName?: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  unitOfMeasure: string;
  reorderPoint: number;
  totalStock: number;
  stockByLocation: StockByLocation[];
  createdAt: string;
}

export interface DocumentLine {
  id: string;
  productId: string;
  quantity: number;
}

export interface StockDocument {
  id: string;
  reference: string; // e.g. WH/IN/00012
  type: OperationType;
  status: DocumentStatus;
  warehouseId: string;
  destinationWarehouseId?: string; // transfers only
  partner?: string; // supplier (receipts) or customer (deliveries)
  lines: DocumentLine[];
  scheduledDate: string;
  createdAt: string;
  note?: string;
}

export interface MoveLedgerEntry {
  id: string;
  documentReference: string;
  productId: string;
  movementType?: OperationType;
  quantityChange: number; // signed
  warehouseId: string;
  locationId?: string;
  locationName?: string;
  timestamp: string;
  reason: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
}

// Generic async-state shape used across list pages so every screen handles
// loading / error / empty / success the same way.
export interface AsyncState<T> {
  data: T | null;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
}

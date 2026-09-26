import { apiClient } from "./apiClient";

export interface ImportRow {
  row: number;
  sku: string;
  productName: string;
  category: string;
  unitOfMeasure: string;
  warehouse: string;
  location: string;
  quantity: number;
  reorderPoint: number;
  errors: string[];
  duplicate: boolean;
}

export interface ImportValidation {
  rows: ImportRow[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  missingFields: number;
  missingHeaders: string[];
  headerError?: string;
}

export interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  stockChanges: number;
  ledgerEntries: number;
  totalRows: number;
}

function fileForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export function validateInventoryImport(file: File) {
  return apiClient.postForm<ImportValidation>("/import/inventory/validate", fileForm(file));
}

export function commitInventoryImport(file: File) {
  return apiClient.postForm<ImportResult>("/import/inventory", fileForm(file));
}

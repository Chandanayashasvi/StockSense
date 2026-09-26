// Product & category data access. Components never import mockData or
// apiClient directly — they call these functions, which decide (via
// USE_MOCKS) whether to hit the real API or the in-memory mock dataset.

import { apiClient, USE_MOCKS, mockDelay, ApiError } from "./apiClient";
import * as mock from "./mockData";
import type { Product, Category } from "@/types";

export async function fetchProducts(): Promise<Product[]> {
  if (USE_MOCKS) return mockDelay([...mock.products]);
  return apiClient.get<Product[]>("/products");
}

export async function fetchCategories(): Promise<Category[]> {
  if (USE_MOCKS) return mockDelay([...mock.categories]);
  return apiClient.get<Category[]>("/categories");
}

export interface CreateProductInput {
  name: string;
  sku: string;
  categoryId: string;
  unitOfMeasure: string;
  reorderPoint: number;
  initialStock: number;
  warehouseId: string;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  if (USE_MOCKS) {
    const exists = mock.products.some((p) => p.sku.toLowerCase() === input.sku.toLowerCase());
    if (exists) throw new ApiError(`SKU "${input.sku}" is already in use.`);
    const product: Product = {
      id: `p${Date.now()}`,
      name: input.name,
      sku: input.sku,
      categoryId: input.categoryId,
      unitOfMeasure: input.unitOfMeasure,
      reorderPoint: input.reorderPoint,
      totalStock: input.initialStock,
      stockByLocation: input.initialStock > 0 ? [{ warehouseId: input.warehouseId, quantity: input.initialStock }] : [],
      createdAt: new Date().toISOString(),
    };
    mock.addProduct(product);
    return mockDelay(product, 400);
  }
  return apiClient.post<Product>("/products", input);
}

export async function updateProduct(id: string, patch: Partial<CreateProductInput>): Promise<Product> {
  if (USE_MOCKS) {
    mock.updateProductRecord(id, patch as Partial<Product>);
    const updated = mock.products.find((p) => p.id === id);
    if (!updated) throw new ApiError("Product not found.");
    return mockDelay(updated, 300);
  }
  return apiClient.put<Product>(`/products/${id}`, patch);
}

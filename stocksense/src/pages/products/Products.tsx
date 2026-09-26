import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table, { Column } from "@/components/ui/Table";
import DetailDrawer from "@/components/ui/DetailDrawer";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { StockBadge } from "@/components/ui/Badge";
import ProductFormModal from "./ProductFormModal";
import { useAsync } from "@/hooks/useAsync";
import { fetchProducts, fetchCategories } from "@/services/productService";
import { fetchLedger, fetchWarehouses } from "@/services/operationsService";
import type { Product, Category, Warehouse } from "@/types";

export default function Products() {
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [reorderFilter, setReorderFilter] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const productsQuery = useAsync<Product[]>(fetchProducts, []);
  const categoriesQuery = useAsync<Category[]>(fetchCategories, []);
  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);
  const ledgerQuery = useAsync(fetchLedger, []);

  const categoryMap = useMemo(() => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name])), [categoriesQuery.data]);

  const filteredProducts = useMemo(() => {
    let rows = productsQuery.data ?? [];
    if (categoryFilter) rows = rows.filter((p) => p.categoryId === categoryFilter);
    if (warehouseFilter) rows = rows.filter((p) => p.stockByLocation.some((level) => level.warehouseId === warehouseFilter));
    if (stockFilter === "out") rows = rows.filter((p) => p.totalStock === 0);
    if (stockFilter === "low") rows = rows.filter((p) => p.totalStock > 0 && p.totalStock <= p.reorderPoint);
    if (stockFilter === "in") rows = rows.filter((p) => p.totalStock > p.reorderPoint);
    if (reorderFilter === "at-or-below") rows = rows.filter((p) => p.totalStock <= p.reorderPoint);
    if (reorderFilter === "above") rows = rows.filter((p) => p.totalStock > p.reorderPoint);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return rows;
  }, [productsQuery.data, categoryFilter, warehouseFilter, stockFilter, reorderFilter, search]);

  const selectedProduct = useMemo(
    () => (productsQuery.data ?? []).find((p) => p.id === selectedProductId) ?? null,
    [productsQuery.data, selectedProductId]
  );

  const columns: Column<Product>[] = [
    { header: "Product", render: (p) => <span className="font-medium text-ink-900">{p.name}</span> },
    { header: "SKU", render: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { header: "Category", render: (p) => categoryMap.get(p.categoryId) ?? "—" },
    { header: "Stock", render: (p) => <span className="font-mono">{p.totalStock} {p.unitOfMeasure}</span> },
    { header: "Status", render: (p) => <StockBadge quantity={p.totalStock} reorderPoint={p.reorderPoint} /> },
  ];

  const isLoading = productsQuery.status === "loading" || categoriesQuery.status === "loading";

  return (
    <AppShell title="Products">
      <div className="space-y-4">
        <PageHeader title="Products" description="Manage your catalog, categories and reorder rules." action={
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex items-center justify-center rounded-md border border-steel-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-steel-50" to="/products/import">Import inventory</Link>
            <Button onClick={() => setModalOpen(true)}>+ New product</Button>
          </div>
        } />

        <Card>
          <div className="p-4 border-b border-steel-100 flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <Input
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select className="sm:w-48" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select className="sm:w-48" aria-label="Filter by warehouse" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
              <option value="">All warehouses</option>
              {(warehousesQuery.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
            <Select className="sm:w-40" aria-label="Filter by stock status" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
              <option value="">All stock status</option><option value="in">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option>
            </Select>
            <Select className="sm:w-44" aria-label="Filter by reorder status" value={reorderFilter} onChange={(e) => setReorderFilter(e.target.value)}>
              <option value="">All reorder status</option><option value="at-or-below">At or below reorder</option><option value="above">Above reorder point</option>
            </Select>
          </div>

          {isLoading && <Spinner label="Loading products…" />}
          {productsQuery.status === "error" && <ErrorState message={productsQuery.error ?? "Failed to load products."} onRetry={productsQuery.refetch} />}
          {!isLoading && productsQuery.status === "success" && filteredProducts.length === 0 && (
            <EmptyState
              title={productsQuery.data?.length === 0 ? "No products yet" : "No products match your search"}
              description={productsQuery.data?.length === 0 ? "Add your first product to start tracking stock." : "Try a different search term or category."}
              action={productsQuery.data?.length === 0 ? <Button size="sm" onClick={() => setModalOpen(true)}>+ New product</Button> : undefined}
            />
          )}
          {!isLoading && filteredProducts.length > 0 && <Table columns={columns} rows={filteredProducts} keyField={(p) => p.id} onRowClick={(p) => setSelectedProductId(p.id)} />}
        </Card>
      </div>

      <DetailDrawer open={!!selectedProduct} title={selectedProduct?.name ?? "Product details"} onClose={() => setSelectedProductId(null)}>
        {selectedProduct && (
          <div className="space-y-4">
            <div className="rounded-xl bg-steel-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-steel-500">Stock status</p>
              <div className="mt-2 flex items-center gap-2">
                <StockBadge quantity={selectedProduct.totalStock} reorderPoint={selectedProduct.reorderPoint} />
                <span className="font-mono text-sm text-steel-600">{selectedProduct.totalStock} {selectedProduct.unitOfMeasure}</span>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-steel-500">SKU</dt>
                <dd className="font-mono text-ink-900">{selectedProduct.sku}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Category</dt>
                <dd>{categoryMap.get(selectedProduct.categoryId) ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Unit</dt>
                <dd>{selectedProduct.unitOfMeasure}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Current stock</dt>
                <dd className="font-mono">{selectedProduct.totalStock} {selectedProduct.unitOfMeasure}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Reorder point</dt>
                <dd>{selectedProduct.reorderPoint} {selectedProduct.unitOfMeasure}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Stock by location</dt>
                <dd className="space-y-1 pt-1">
                  {(selectedProduct.stockByLocation.length ? selectedProduct.stockByLocation : [{ warehouseId: "—", quantity: selectedProduct.totalStock }]).map((level, index) => (
                    <div key={`${selectedProduct.id}-${level.warehouseId}-${level.locationId ?? index}`} className="flex justify-between gap-3 rounded-md border border-steel-200 px-2 py-1.5">
                      <span className="text-steel-600">{level.warehouseName ?? warehousesQuery.data?.find((w) => w.id === level.warehouseId)?.name ?? level.warehouseId}{level.locationName ? ` · ${level.locationName}` : ""}</span>
                      <span className="font-mono">{level.quantity}</span>
                    </div>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-steel-500">Recent movements</dt>
                <dd className="space-y-1 pt-1">
                  {(ledgerQuery.data ?? []).filter((entry) => entry.productId === selectedProduct.id).slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex justify-between gap-3 rounded-md border border-steel-200 px-2 py-1.5">
                      <span className="truncate text-steel-600">{entry.documentReference}</span>
                      <span className={`shrink-0 font-mono ${entry.quantityChange > 0 ? "text-signal-green" : entry.quantityChange < 0 ? "text-signal-red" : "text-steel-500"}`}>{entry.quantityChange > 0 ? "+" : ""}{entry.quantityChange}</span>
                    </div>
                  ))}
                  {!(ledgerQuery.data ?? []).some((entry) => entry.productId === selectedProduct.id) && <span className="text-steel-500">No recorded movements</span>}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </DetailDrawer>

      <ProductFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={productsQuery.refetch}
        categories={categoriesQuery.data ?? []}
        warehouses={warehousesQuery.data ?? []}
      />
    </AppShell>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import AppShell from "@/components/layout/AppLayout";
import KpiCard from "@/components/ui/KpiCard";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DetailDrawer from "@/components/ui/DetailDrawer";
import Select from "@/components/ui/Select";
import Table, { Column } from "@/components/ui/Table";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { StatusBadge, StockBadge } from "@/components/ui/Badge";
import { useAsync } from "@/hooks/useAsync";
import { fetchDashboardStats, fetchDocuments, fetchLedger, fetchWarehouses } from "@/services/operationsService";
import { fetchProducts } from "@/services/productService";
import type { StockDocument, OperationType, DocumentStatus, Warehouse, DashboardStats, Product, MoveLedgerEntry } from "@/types";
import { API_ORIGIN, USE_MOCKS } from "@/services/apiClient";

const icon = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TYPE_LABEL: Record<OperationType, string> = {
  receipt: "Receipt",
  delivery: "Delivery",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const stats = useAsync<DashboardStats>(fetchDashboardStats, []);
  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);
  const productsQuery = useAsync<Product[]>(fetchProducts, []);
  const ledgerQuery = useAsync<MoveLedgerEntry[]>(fetchLedger, []);
  const docsQuery = useAsync(
    () => fetchDocuments({
      type: (typeFilter || undefined) as OperationType | undefined,
      status: (statusFilter || undefined) as DocumentStatus | undefined,
      warehouseId: warehouseFilter || undefined,
    }),
    [typeFilter, statusFilter, warehouseFilter],
  );
  const refetchStats = stats.refetch;
  const refetchDocuments = docsQuery.refetch;
  const refetchProducts = productsQuery.refetch;
  const refetchLedger = ledgerQuery.refetch;

  useEffect(() => {
    if (USE_MOCKS) return;
    const socket = io(API_ORIGIN, { withCredentials: true });
    socket.emit("join:dashboard");
    const refreshDashboard = () => {
      void refetchStats();
      void refetchDocuments();
      void refetchProducts();
      void refetchLedger();
    };
    socket.on("dashboard.updated", refreshDashboard);
    return () => {
      socket.off("dashboard.updated", refreshDashboard);
      socket.disconnect();
    };
  }, [refetchStats, refetchDocuments, refetchProducts, refetchLedger]);

  const warehouseMap = useMemo(() => new Map((warehousesQuery.data ?? []).map((warehouse) => [warehouse.id, warehouse])), [warehousesQuery.data]);
  const productMap = useMemo(() => new Map((productsQuery.data ?? []).map((product) => [product.id, product])), [productsQuery.data]);
  const selectedDocument = useMemo(() => (docsQuery.data ?? []).find((document) => document.id === selectedDocumentId) ?? null, [docsQuery.data, selectedDocumentId]);
  const selectedProduct = useMemo(() => (productsQuery.data ?? []).find((product) => product.id === selectedProductId) ?? null, [productsQuery.data, selectedProductId]);
  const lowStockProducts = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.totalStock <= product.reorderPoint).slice(0, 6),
    [productsQuery.data],
  );
  const warehouseSummary = useMemo(() => (warehousesQuery.data ?? []).map((warehouse) => ({
    ...warehouse,
    units: (productsQuery.data ?? []).reduce((total, product) => total + product.stockByLocation.filter((level) => level.warehouseId === warehouse.id).reduce((sum, level) => sum + level.quantity, 0), 0),
  })), [warehousesQuery.data, productsQuery.data]);
  const inventoryTrend = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - 6 + index);
    const key = dateKey(day);
    const netChange = (ledgerQuery.data ?? [])
      .filter((entry) => dateKey(new Date(entry.timestamp)) === key)
      .reduce((total, entry) => total + entry.quantityChange, 0);
    return { key, label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day), netChange };
  }), [ledgerQuery.data]);
  const maxMovement = Math.max(1, ...inventoryTrend.map((day) => Math.abs(day.netChange)));
  const maxWarehouseUnits = Math.max(1, ...warehouseSummary.map((warehouse) => warehouse.units));

  const columns: Column<StockDocument>[] = [
    { header: "Type", render: (document) => {
      const symbol = document.type === "receipt"
        ? "m12 3 8 4.5v6M4 7.5 12 12l8-4.5M12 12v5m0 0 3-3m-3 3-3-3M4 7.5V16l8 5 4-2.5"
        : document.type === "delivery"
          ? "M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
          : document.type === "transfer"
            ? "M4 8h15l-3-3m3 3-3 3M20 16H5l3 3m-3-3 3-3"
            : "M5 3h14v18H5zM8 9h8M8 13h3m3 0h2M15 12v4m-2-2h4";
      return <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded bg-icon-container text-icon-blue">{icon(symbol)}</span>{TYPE_LABEL[document.type]}</span>;
    } },
    { header: "Reference", render: (document) => <span className="font-mono text-xs font-medium">{document.reference}</span> },
    { header: "Product", render: (document) => productMap.get(document.lines[0]?.productId)?.name ?? `${document.lines.length} products` },
    { header: "Quantity", render: (document) => document.lines.reduce((total, line) => total + Math.abs(line.quantity), 0).toLocaleString() },
    { header: "Warehouse", render: (document) => warehouseMap.get(document.warehouseId)?.name ?? document.warehouseId },
    { header: "Date", render: (document) => document.scheduledDate },
    { header: "Status", render: (document) => <StatusBadge status={document.status} /> },
  ];

  return (
    <AppShell title="Inventory Overview">
      <div className="space-y-5">
        <PageHeader
          title="Inventory Overview"
          description="Monitor stock levels, warehouse activity and operations in real time."
          action={(
            <div className="flex flex-wrap gap-2">
              <Link to="/products" className="inline-flex h-9 items-center rounded-md bg-brand-500 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Add Product</Link>
              <Link to="/operations/receipts" className="inline-flex h-9 items-center rounded-md border border-steel-200 bg-steel-100 px-3 text-sm font-medium text-ink-900 transition-colors hover:bg-steel-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">New Receipt</Link>
              <Link to="/operations/transfers" className="inline-flex h-9 items-center rounded-md border border-steel-200 bg-steel-100 px-3 text-sm font-medium text-ink-900 transition-colors hover:bg-steel-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Create Transfer</Link>
            </div>
          )}
        />

        {stats.status === "loading" && <Spinner label="Loading dashboard…" />}
        {stats.status === "error" && <ErrorState message={stats.error ?? "Failed to load stats."} onRetry={stats.refetch} />}
        {stats.status === "success" && stats.data && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
            <KpiCard label="Total products" value={stats.data.totalProducts} icon={icon("m12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8m-9 5v8")} />
            <KpiCard label="Units in stock" value={stats.data.totalStock.toLocaleString()} icon={icon("m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5")} />
            <KpiCard label="Low stock" value={stats.data.lowStockCount} tone="warning" icon={icon("M12 9v4m0 4h.01M10.29 3.86L2.1 18.05A1.5 1.5 0 003.36 20.4h17.28a1.5 1.5 0 001.25-2.35L13.71 3.86a1.5 1.5 0 00-2.42 0z")} />
            <KpiCard label="Out of stock" value={stats.data.outOfStockCount} tone="danger" icon={icon("m12 3 9 5-9 5-9-5 9-5Zm-9 5v8l9 5 9-5V8m-15 2 12 7")} />
            <KpiCard label="Pending receipts" value={stats.data.pendingReceipts} icon={icon("m12 3 8 4.5v6M4 7.5 12 12l8-4.5M12 12v5m0 0 3-3m-3 3-3-3M4 7.5V16l8 5 4-2.5")} />
            <KpiCard label="Pending deliveries" value={stats.data.pendingDeliveries} icon={icon("M3 7h13l4 4v6h-2M3 7v10h10M3 7l3-4h7l3 4")} />
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between border-b border-steel-200 px-4 py-3">
              <div>
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded bg-icon-container text-icon-blue">{icon("M4 20V4m0 16h17m-14-5 4-4 3 2 5-6")}</span><h2 className="text-sm font-semibold text-ink-900">Inventory Trend</h2></div>
                <p className="mt-0.5 text-xs text-steel-500">Net ledger movement · last 7 days</p>
              </div>
              {ledgerQuery.status === "loading" && <Spinner />}
            </div>
            {ledgerQuery.status === "error" ? (
              <ErrorState message={ledgerQuery.error ?? "Failed to load inventory movement."} onRetry={ledgerQuery.refetch} />
            ) : (
              <div className="px-4 pb-4 pt-5">
                {ledgerQuery.data?.length === 0 && <p className="mb-3 text-xs text-steel-500">No ledger movements are recorded yet.</p>}
                <div className="flex h-32 items-end gap-2 border-b border-steel-200">
                  {inventoryTrend.map((day) => (
                    <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <span className="font-mono text-[10px] text-steel-500">{day.netChange > 0 ? "+" : ""}{day.netChange}</span>
                      <div
                        aria-label={`${day.label}: ${day.netChange} net units`}
                        title={`${day.key}: ${day.netChange} net units`}
                        className={`w-full max-w-9 rounded-t-sm ${day.netChange < 0 ? "bg-signal-red" : "bg-brand-500"}`}
                        style={{ height: `${day.netChange === 0 ? 3 : Math.max(8, Math.abs(day.netChange) / maxMovement * 72)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-steel-500">{inventoryTrend.map((day) => <span key={day.key}>{day.label}</span>)}</div>
              </div>
            )}
          </Card>

          <Card>
            <div className="border-b border-steel-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-900">Stock by warehouse</h2>
              <p className="mt-0.5 text-xs text-steel-500">On-hand units from current stock levels</p>
            </div>
            <div className="space-y-4 p-4">
              {warehouseSummary.length === 0 && <p className="text-sm text-steel-500">No warehouse stock is available.</p>}
              {warehouseSummary.map((warehouse) => (
                <div key={warehouse.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-steel-300">{warehouse.name}</span>
                    <span className="shrink-0 font-mono text-ink-900">{warehouse.units.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-steel-200">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(0, warehouse.units) / maxWarehouseUnits * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col gap-3 border-b border-steel-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Recent operations</h2>
            <div className="flex flex-wrap gap-2">
              <Select aria-label="Filter by operation type" className="w-36" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">All types</option><option value="receipt">Receipts</option><option value="delivery">Deliveries</option><option value="transfer">Transfers</option><option value="adjustment">Adjustments</option>
              </Select>
              <Select aria-label="Filter by operation status" className="w-36" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">All statuses</option><option value="Draft">Draft</option><option value="Waiting">Waiting</option><option value="Ready">Ready</option><option value="Done">Done</option><option value="Canceled">Canceled</option>
              </Select>
              <Select aria-label="Filter by warehouse" className="w-40" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
                <option value="">All warehouses</option>
                {(warehousesQuery.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </Select>
            </div>
          </div>
          {docsQuery.status === "loading" && <Spinner />}
          {docsQuery.status === "error" && <ErrorState message={docsQuery.error ?? "Failed to load operations."} onRetry={docsQuery.refetch} />}
          {docsQuery.status === "success" && docsQuery.data?.length === 0 && <EmptyState title="No operations match these filters" description="Try clearing a filter, or create a receipt, delivery, transfer or adjustment." />}
          {docsQuery.status === "success" && docsQuery.data && docsQuery.data.length > 0 && (
            <Table columns={columns} rows={docsQuery.data.slice(0, 8)} keyField={(document) => document.id} onRowClick={(document) => setSelectedDocumentId(document.id)} />
          )}
        </Card>

        <Card>
          <div className="border-b border-steel-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Low stock alerts</h2>
          </div>
          {productsQuery.status === "loading" && <Spinner label="Loading stock alerts…" />}
          {productsQuery.status === "error" && <ErrorState message={productsQuery.error ?? "Failed to load low stock alerts."} onRetry={productsQuery.refetch} />}
          {productsQuery.status === "success" && lowStockProducts.length === 0 && <p className="px-4 py-4 text-sm text-steel-500">No products are at or below their reorder point.</p>}
          {lowStockProducts.map((product) => {
            const critical = product.totalStock === 0 || product.totalStock <= Math.ceil(product.reorderPoint / 2);
            const warehouseName = product.stockByLocation.find((level) => level.warehouseName)?.warehouseName ?? "Unassigned";
            return (
              <button key={product.id} type="button" onClick={() => setSelectedProductId(product.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-steel-200 px-4 py-3 text-left last:border-0 hover:bg-steel-100 focus-visible:outline-none">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-900">{product.name}</span>
                  <span className="block truncate font-mono text-xs text-steel-500">{product.sku} · {warehouseName}</span>
                </span>
                <span className="text-right font-mono text-xs text-steel-300">{product.totalStock} / {product.reorderPoint}</span>
                <span className={`rounded-sm px-2 py-1 text-[10px] font-semibold uppercase ${critical ? "bg-signal-red/10 text-signal-red" : "bg-amber-400/10 text-amber-700"}`}>{critical ? "Critical" : "Warning"}</span>
              </button>
            );
          })}
        </Card>
      </div>

      <DetailDrawer
        open={!!selectedDocument}
        title={selectedDocument?.reference ?? "Operation details"}
        icon={selectedDocument ? icon(selectedDocument.type === "receipt" ? "m12 3 8 4.5v6M4 7.5 12 12l8-4.5M12 12v5m0 0 3-3m-3 3-3-3M4 7.5V16l8 5 4-2.5" : selectedDocument.type === "delivery" ? "M3 6h11v11H3zM14 10h4l3 3v4h-7zM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" : selectedDocument.type === "transfer" ? "M4 8h15l-3-3m3 3-3 3M20 16H5l3 3m-3-3 3-3" : "M5 3h14v18H5zM8 9h8M8 13h3m3 0h2M15 12v4m-2-2h4") : undefined}
        onClose={() => setSelectedDocumentId(null)}
      >
        {selectedDocument && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-steel-50 p-3"><span className="text-steel-500">{TYPE_LABEL[selectedDocument.type]}</span><StatusBadge status={selectedDocument.status} /></div>
            <dl className="space-y-3">
              <div><dt className="text-steel-500">Warehouse</dt><dd>{warehouseMap.get(selectedDocument.warehouseId)?.name ?? selectedDocument.warehouseId}</dd></div>
              {selectedDocument.destinationWarehouseId && <div><dt className="text-steel-500">Destination</dt><dd>{warehouseMap.get(selectedDocument.destinationWarehouseId)?.name ?? selectedDocument.destinationWarehouseId}</dd></div>}
              {selectedDocument.partner && <div><dt className="text-steel-500">Partner</dt><dd>{selectedDocument.partner}</dd></div>}
              <div><dt className="text-steel-500">Date</dt><dd>{selectedDocument.scheduledDate}</dd></div>
              {selectedDocument.note && <div><dt className="text-steel-500">Notes</dt><dd>{selectedDocument.note}</dd></div>}
              <div><dt className="text-steel-500">Products</dt><dd className="mt-1 space-y-1">{selectedDocument.lines.map((line) => <div key={line.id} className="flex justify-between rounded border border-steel-200 px-2 py-1"><span>{productMap.get(line.productId)?.name ?? line.productId}</span><span className="font-mono">{line.quantity}</span></div>)}</dd></div>
            </dl>
          </div>
        )}
      </DetailDrawer>

      <DetailDrawer open={!!selectedProduct} title={selectedProduct?.name ?? "Product details"} icon={icon("m12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8m-9 5v8")} onClose={() => setSelectedProductId(null)}>
        {selectedProduct && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-md bg-steel-100 p-3"><span className="font-mono">{selectedProduct.totalStock} {selectedProduct.unitOfMeasure}</span><StockBadge quantity={selectedProduct.totalStock} reorderPoint={selectedProduct.reorderPoint} /></div>
            <dl className="space-y-3">
              <div><dt className="text-steel-500">SKU</dt><dd className="font-mono">{selectedProduct.sku}</dd></div>
              <div><dt className="text-steel-500">Reorder level</dt><dd>{selectedProduct.reorderPoint} {selectedProduct.unitOfMeasure}</dd></div>
              <div><dt className="text-steel-500">Warehouse stock</dt><dd className="mt-1 space-y-1">{selectedProduct.stockByLocation.map((level, index) => <div key={`${level.warehouseId}-${level.locationId ?? index}`} className="flex justify-between rounded border border-steel-200 px-2 py-1"><span>{level.warehouseName ?? warehouseMap.get(level.warehouseId)?.name ?? "Unassigned"}</span><span className="font-mono">{level.quantity}</span></div>)}</dd></div>
            </dl>
          </div>
        )}
      </DetailDrawer>
    </AppShell>
  );
}

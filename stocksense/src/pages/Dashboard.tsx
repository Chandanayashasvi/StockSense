import { useState, useMemo, useEffect } from "react";
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
import { StatusBadge } from "@/components/ui/Badge";
import { useAsync } from "@/hooks/useAsync";
import { fetchDashboardStats, fetchDocuments, fetchWarehouses } from "@/services/operationsService";
import { fetchProducts } from "@/services/productService";
import type { StockDocument, OperationType, DocumentStatus, Warehouse, DashboardStats, Product } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { API_ORIGIN, USE_MOCKS } from "@/services/apiClient";

const icon = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TYPE_LABEL: Record<OperationType, string> = {
  receipt: "Receipt",
  delivery: "Delivery",
  transfer: "Transfer",
  adjustment: "Adjustment",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const stats = useAsync<DashboardStats>(fetchDashboardStats, []);
  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);
  const productsQuery = useAsync<Product[]>(fetchProducts, []);
  const docsQuery = useAsync(
    () =>
      fetchDocuments({
        type: (typeFilter || undefined) as OperationType | undefined,
        status: (statusFilter || undefined) as DocumentStatus | undefined,
        warehouseId: warehouseFilter || undefined,
      }),
    [typeFilter, statusFilter, warehouseFilter]
  );
  const refetchStats = stats.refetch;
  const refetchDocuments = docsQuery.refetch;
  const refetchProducts = productsQuery.refetch;

  useEffect(() => {
    if (USE_MOCKS) return;

    const socket = io(API_ORIGIN, { withCredentials: true });
    socket.emit("join:dashboard");
    const refreshDashboard = () => {
      void refetchStats();
      void refetchDocuments();
      void refetchProducts();
    };
    socket.on("dashboard.updated", refreshDashboard);

    return () => {
      socket.off("dashboard.updated", refreshDashboard);
      socket.disconnect();
    };
  }, [refetchStats, refetchDocuments, refetchProducts]);

  const warehouseMap = useMemo(() => new Map((warehousesQuery.data ?? []).map((w) => [w.id, w])), [warehousesQuery.data]);
  const selectedDocument = useMemo(() => (docsQuery.data ?? []).find((document) => document.id === selectedDocumentId) ?? null, [docsQuery.data, selectedDocumentId]);
  const lowStockProducts = useMemo(() => (productsQuery.data ?? []).filter((product) => product.totalStock > 0 && product.totalStock <= product.reorderPoint).slice(0, 5), [productsQuery.data]);
  const warehouseSummary = useMemo(() => (warehousesQuery.data ?? []).map((warehouse) => ({
    ...warehouse,
    units: (productsQuery.data ?? []).reduce((total, product) => total + product.stockByLocation.filter((level) => level.warehouseId === warehouse.id).reduce((sum, level) => sum + level.quantity, 0), 0),
  })), [warehousesQuery.data, productsQuery.data]);

  const columns: Column<StockDocument>[] = [
    { header: "Reference", render: (d) => <span className="font-mono text-xs font-medium">{d.reference}</span> },
    { header: "Type", render: (d) => TYPE_LABEL[d.type] },
    { header: "Partner / Note", render: (d) => d.partner ?? d.note ?? "—" },
    { header: "Warehouse", render: (d) => warehouseMap.get(d.warehouseId)?.name ?? d.warehouseId },
    { header: "Lines", render: (d) => `${d.lines.length} product${d.lines.length !== 1 ? "s" : ""}` },
    { header: "Scheduled", render: (d) => d.scheduledDate },
    { header: "Status", render: (d) => <StatusBadge status={d.status} /> },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
          description="Here's what's moving today across your warehouses."
        />

        {stats.status === "loading" && <Spinner label="Loading dashboard…" />}
        {stats.status === "error" && <ErrorState message={stats.error ?? "Failed to load stats."} onRetry={stats.refetch} />}
        {stats.status === "success" && stats.data && (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard label="Total products" value={stats.data.totalProducts} icon={icon("M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8")} />
            <KpiCard label="Low stock" value={stats.data.lowStockCount} tone="warning" icon={icon("M12 9v4m0 4h.01M10.29 3.86L2.1 18.05A1.5 1.5 0 003.36 20.4h17.28a1.5 1.5 0 001.25-2.35L13.71 3.86a1.5 1.5 0 00-2.42 0z")} />
            <KpiCard label="Out of stock" value={stats.data.outOfStockCount} tone="danger" icon={icon("M6 18L18 6M6 6l12 12")} />
            <KpiCard label="Pending receipts" value={stats.data.pendingReceipts} icon={icon("M12 4v16m8-8H4")} />
            <KpiCard label="Pending deliveries" value={stats.data.pendingDeliveries} icon={icon("M3 7h13l4 4v6h-2M3 7v10h10M3 7l3-4h7l3 4")} />
            <KpiCard label="Transfers scheduled" value={stats.data.scheduledTransfers} icon={icon("M7 16V4m0 0L3 8m4-4l4 4")} />
          </div>
        )}

        <Card>
          <div className="p-4 border-b border-steel-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-900">Recent operations</h2>
            <div className="flex flex-wrap gap-2">
              <Select className="w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All types</option>
                <option value="receipt">Receipts</option>
                <option value="delivery">Delivery</option>
                <option value="transfer">Internal</option>
                <option value="adjustment">Adjustments</option>
              </Select>
              <Select className="w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Waiting">Waiting</option>
                <option value="Ready">Ready</option>
                <option value="Done">Done</option>
                <option value="Canceled">Canceled</option>
              </Select>
              <Select className="w-40" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
                <option value="">All warehouses</option>
                {(warehousesQuery.data ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {docsQuery.status === "loading" && <Spinner />}
          {docsQuery.status === "error" && <ErrorState message={docsQuery.error ?? "Failed to load operations."} onRetry={docsQuery.refetch} />}
          {docsQuery.status === "success" && docsQuery.data && docsQuery.data.length === 0 && (
            <EmptyState title="No operations match these filters" description="Try clearing a filter, or create a new receipt, delivery, transfer or adjustment." />
          )}
          {docsQuery.status === "success" && docsQuery.data && docsQuery.data.length > 0 && (
            <Table columns={columns} rows={docsQuery.data.slice(0, 8)} keyField={(d) => d.id} onRowClick={(document) => setSelectedDocumentId(document.id)} />
          )}
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <div className="border-b border-steel-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-900">Low stock alerts</h2>
            </div>
            {productsQuery.status === "loading" && <Spinner label="Loading stock alerts…" />}
            {productsQuery.status === "error" && <ErrorState message={productsQuery.error ?? "Failed to load low stock alerts."} onRetry={productsQuery.refetch} />}
            {productsQuery.status === "success" && lowStockProducts.length === 0 && <p className="px-4 py-4 text-sm text-steel-500">No products are at or below their reorder point.</p>}
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3 border-b border-steel-100 px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
                  <p className="font-mono text-xs text-steel-500">{product.sku}</p>
                </div>
                <p className="shrink-0 text-right font-mono text-sm text-amber-700">{product.totalStock} / {product.reorderPoint}</p>
              </div>
            ))}
          </Card>

          <Card>
            <div className="border-b border-steel-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink-900">Warehouse summary</h2>
            </div>
            {warehouseSummary.map((warehouse) => (
              <div key={warehouse.id} className="flex items-center justify-between gap-3 border-b border-steel-100 px-4 py-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-ink-900">{warehouse.name}</p>
                  <p className="text-xs text-steel-500">{warehouse.location}</p>
                </div>
                <p className="font-mono text-sm text-steel-700">{warehouse.units.toLocaleString()} units</p>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <DetailDrawer open={!!selectedDocument} title={selectedDocument?.reference ?? "Operation details"} onClose={() => setSelectedDocumentId(null)}>
        {selectedDocument && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-steel-50 p-3">
              <span className="text-steel-500">{TYPE_LABEL[selectedDocument.type]}</span>
              <StatusBadge status={selectedDocument.status} />
            </div>
            <dl className="space-y-3">
              <div><dt className="text-steel-500">Warehouse</dt><dd>{warehouseMap.get(selectedDocument.warehouseId)?.name ?? selectedDocument.warehouseId}</dd></div>
              {selectedDocument.destinationWarehouseId && <div><dt className="text-steel-500">Destination</dt><dd>{warehouseMap.get(selectedDocument.destinationWarehouseId)?.name ?? selectedDocument.destinationWarehouseId}</dd></div>}
              {selectedDocument.partner && <div><dt className="text-steel-500">Partner</dt><dd>{selectedDocument.partner}</dd></div>}
              <div><dt className="text-steel-500">Date</dt><dd>{selectedDocument.scheduledDate}</dd></div>
              {selectedDocument.note && <div><dt className="text-steel-500">Notes</dt><dd>{selectedDocument.note}</dd></div>}
              <div>
                <dt className="text-steel-500">Products</dt>
                <dd className="mt-1 space-y-1">{selectedDocument.lines.map((line) => <div key={line.id} className="flex justify-between rounded border border-steel-200 px-2 py-1"><span>{productsQuery.data?.find((product) => product.id === line.productId)?.name ?? line.productId}</span><span className="font-mono">{line.quantity}</span></div>)}</dd>
              </div>
            </dl>
          </div>
        )}
      </DetailDrawer>
    </AppShell>
  );
}

import { useMemo } from "react";
import AppShell from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table, { Column } from "@/components/ui/Table";
import DetailDrawer from "@/components/ui/DetailDrawer";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import InventoryIcon from "@/components/ui/InventoryIcon";
import { useAsync } from "@/hooks/useAsync";
import { useState } from "react";
import { fetchLedger, fetchWarehouses } from "@/services/operationsService";
import { fetchProducts } from "@/services/productService";
import type { MoveLedgerEntry, Product, Warehouse } from "@/types";

export default function MoveHistory() {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [movementFilter, setMovementFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const ledgerQuery = useAsync<MoveLedgerEntry[]>(fetchLedger, []);
  const productsQuery = useAsync<Product[]>(fetchProducts, []);
  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);

  const productMap = useMemo(() => new Map((productsQuery.data ?? []).map((p) => [p.id, p])), [productsQuery.data]);
  const warehouseMap = useMemo(() => new Map((warehousesQuery.data ?? []).map((w) => [w.id, w])), [warehousesQuery.data]);
  const selectedEntry = useMemo(() => (ledgerQuery.data ?? []).find((entry) => entry.id === selectedEntryId) ?? null, [ledgerQuery.data, selectedEntryId]);
  const filteredLedger = useMemo(() => (ledgerQuery.data ?? []).filter((entry) => {
    const query = search.trim().toLowerCase();
    const movementMatches = !movementFilter || entry.movementType === movementFilter;
    const productMatches = !productFilter || entry.productId === productFilter;
    const warehouseMatches = !warehouseFilter || entry.warehouseId === warehouseFilter;
    const textMatches = !query || entry.documentReference.toLowerCase().includes(query) || entry.reason.toLowerCase().includes(query) || (productMap.get(entry.productId)?.name ?? "").toLowerCase().includes(query);
    const timestamp = new Date(entry.timestamp).getTime();
    const fromMatches = !fromDate || timestamp >= new Date(`${fromDate}T00:00:00`).getTime();
    const toMatches = !toDate || timestamp <= new Date(`${toDate}T23:59:59`).getTime();
    return movementMatches && productMatches && warehouseMatches && textMatches && fromMatches && toMatches;
  }), [ledgerQuery.data, search, movementFilter, productFilter, warehouseFilter, fromDate, toDate, productMap]);

  const columns: Column<MoveLedgerEntry>[] = [
    { header: "Reference", render: (e) => <span className="font-mono text-xs font-medium">{e.documentReference}</span> },
    { header: "Movement", render: (e) => <span className="flex items-center gap-2 capitalize"><span className="flex h-7 w-7 items-center justify-center rounded bg-icon-container text-icon-blue"><InventoryIcon name="history" className="h-4 w-4" /></span>{e.movementType ?? (e.documentReference.includes("/IN/") ? "receipt" : e.documentReference.includes("/OUT/") ? "delivery" : e.documentReference.includes("/INT/") ? "transfer" : "adjustment")}</span> },
    { header: "Product", render: (e) => <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded bg-icon-container text-icon-blue"><InventoryIcon name="package" className="h-4 w-4" /></span>{productMap.get(e.productId)?.name ?? e.productId}</span> },
    {
      header: "Quantity",
      render: (e) => <span className={`font-mono font-medium ${e.quantityChange > 0 ? "text-signal-green" : e.quantityChange < 0 ? "text-signal-red" : "text-steel-500"}`}>{e.quantityChange > 0 ? "+" : ""}{e.quantityChange}</span>,
    },
    { header: "Warehouse", render: (e) => warehouseMap.get(e.warehouseId)?.name ?? e.warehouseId },
    { header: "Location", render: (e) => e.locationName ?? "—" },
    { header: "Reason", render: (e) => <span className="text-steel-600">{e.reason}</span> },
    { header: "When", render: (e) => new Date(e.timestamp).toLocaleString() },
  ];

  const isLoading = ledgerQuery.status === "loading" || productsQuery.status === "loading" || warehousesQuery.status === "loading";

  return (
    <AppShell title="Move History">
      <div className="space-y-4">
        <PageHeader title="Move History" description="Every stock movement, logged automatically as receipts, deliveries, transfers and adjustments are completed." />
        <Card>
          <div className="flex flex-col gap-3 border-b border-steel-100 p-4 sm:flex-row sm:flex-wrap">
            <Input aria-label="Search move history" placeholder="Search reference, product, reason…" value={search} onChange={(event) => setSearch(event.target.value)} className="sm:max-w-xs" />
            <Select aria-label="Filter by movement type" className="sm:w-40" value={movementFilter} onChange={(event) => setMovementFilter(event.target.value)}><option value="">All movements</option><option value="receipt">Receipts</option><option value="delivery">Deliveries</option><option value="transfer">Transfers</option><option value="adjustment">Adjustments</option></Select>
            <Select aria-label="Filter by product" className="sm:w-48" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option value="">All products</option>{(productsQuery.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select>
            <Select aria-label="Filter by warehouse" className="sm:w-48" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}><option value="">All warehouses</option>{(warehousesQuery.data ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select>
            <Input aria-label="From date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            <Input aria-label="To date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          {isLoading && <Spinner label="Loading ledger…" />}
          {ledgerQuery.status === "error" && <ErrorState message={ledgerQuery.error ?? "Failed to load move history."} onRetry={ledgerQuery.refetch} />}
          {!isLoading && ledgerQuery.data && ledgerQuery.data.length === 0 && (
            <EmptyState title="No stock movements yet" description="Once you validate a receipt, delivery, transfer or adjustment, it will appear here." />
          )}
          {!isLoading && ledgerQuery.data && ledgerQuery.data.length > 0 && filteredLedger.length === 0 && <EmptyState title="No movements match these filters" description="Adjust the search, movement, warehouse or date filters." />}
          {!isLoading && filteredLedger.length > 0 && <Table columns={columns} rows={filteredLedger} keyField={(e) => e.id} onRowClick={(entry) => setSelectedEntryId(entry.id)} />}
        </Card>
      </div>

      <DetailDrawer open={!!selectedEntry} title={selectedEntry ? selectedEntry.documentReference : "Movement details"} icon={<InventoryIcon name="history" className="h-8 w-8" />} onClose={() => setSelectedEntryId(null)}>
        {selectedEntry && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-steel-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-steel-500">Change</p>
              <p className={`mt-2 font-mono text-lg font-semibold ${selectedEntry.quantityChange > 0 ? "text-signal-green" : selectedEntry.quantityChange < 0 ? "text-signal-red" : "text-steel-500"}`}>
                {selectedEntry.quantityChange > 0 ? "+" : ""}{selectedEntry.quantityChange}
              </p>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-steel-500">Product</dt>
                <dd>{productMap.get(selectedEntry.productId)?.name ?? selectedEntry.productId}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Warehouse</dt>
                <dd>{warehouseMap.get(selectedEntry.warehouseId)?.name ?? selectedEntry.warehouseId}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Location</dt>
                <dd>{selectedEntry.locationName ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Movement</dt>
                <dd className="capitalize">{selectedEntry.movementType ?? "Stock movement"}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Reason</dt>
                <dd>{selectedEntry.reason}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Time</dt>
                <dd>{new Date(selectedEntry.timestamp).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}
      </DetailDrawer>
    </AppShell>
  );
}

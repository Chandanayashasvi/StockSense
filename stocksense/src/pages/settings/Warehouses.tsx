import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table, { Column } from "@/components/ui/Table";
import DetailDrawer from "@/components/ui/DetailDrawer";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import { useAsync } from "@/hooks/useAsync";
import { createWarehouse, fetchWarehouses, fetchLedger } from "@/services/operationsService";
import { fetchProducts } from "@/services/productService";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/services/apiClient";
import type { Product, Warehouse } from "@/types";

export default function Warehouses() {
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: "", code: "", location: "" });
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);
  const productsQuery = useAsync<Product[]>(fetchProducts, []);
  const ledgerQuery = useAsync(fetchLedger, []);
  const selectedWarehouse = useMemo(() => (warehousesQuery.data ?? []).find((w) => w.id === selectedWarehouseId) ?? null, [warehousesQuery.data, selectedWarehouseId]);
  const lowStockLocations = useMemo(() => (productsQuery.data ?? []).flatMap((product) => product.stockByLocation.filter((level) => level.quantity > 0 && level.quantity <= product.reorderPoint)), [productsQuery.data]);
  const selectedStock = selectedWarehouse ? (productsQuery.data ?? []).flatMap((product) => product.stockByLocation.filter((level) => level.warehouseId === selectedWarehouse.id).map((level) => ({ product, level }))) : [];
  const selectedMovements = selectedWarehouse ? (ledgerQuery.data ?? []).filter((entry) => entry.warehouseId === selectedWarehouse.id).slice(0, 5) : [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newWarehouse.name.trim() || !newWarehouse.code.trim() || !newWarehouse.location.trim()) return;
    setSaving(true);
    try {
      await createWarehouse({ ...newWarehouse, name: newWarehouse.name.trim(), code: newWarehouse.code.trim().toUpperCase(), location: newWarehouse.location.trim() });
      await warehousesQuery.refetch();
      setNewWarehouse({ name: "", code: "", location: "" });
      setCreateOpen(false);
      showToast("Warehouse created.", "success");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Couldn't create the warehouse.", "error");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Warehouse>[] = [
    { header: "Name", render: (w) => <span className="font-medium text-ink-900">{w.name}</span> },
    { header: "Code", render: (w) => <span className="font-mono text-xs">{w.code}</span> },
    { header: "Location", render: (w) => w.location },
    {
      header: "Status",
      render: (w) => (
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${w.isActive ? "bg-signal-green/10 text-signal-green" : "bg-steel-100 text-steel-500"}`}>
          {w.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <AppShell title="Warehouses">
      <div className="space-y-4">
        <PageHeader title="Warehouses" description="Locations available for receipts, deliveries and internal transfers." action={<Button onClick={() => setCreateOpen(true)}>+ Add warehouse</Button>} />
        {warehousesQuery.data && (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ["Total warehouses", warehousesQuery.data.length],
              ["Active warehouses", warehousesQuery.data.filter((warehouse) => warehouse.isActive).length],
              ["Total locations", warehousesQuery.data.reduce((count, warehouse) => count + (warehouse.locations?.length ?? 0), 0)],
              ["Low stock locations", lowStockLocations.length],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-steel-200 bg-white px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-steel-500">{label}</p><p className="mt-1 text-xl font-semibold text-ink-900">{value}</p></div>)}
          </div>
        )}
        <Card>
          {warehousesQuery.status === "loading" && <Spinner label="Loading warehouses…" />}
          {warehousesQuery.status === "error" && <ErrorState message={warehousesQuery.error ?? "Failed to load warehouses."} onRetry={warehousesQuery.refetch} />}
          {warehousesQuery.status === "success" && warehousesQuery.data && <Table columns={columns} rows={warehousesQuery.data} keyField={(w) => w.id} onRowClick={(w) => setSelectedWarehouseId(w.id)} />}
        </Card>
      </div>

      <DetailDrawer open={!!selectedWarehouse} title={selectedWarehouse?.name ?? "Warehouse details"} onClose={() => setSelectedWarehouseId(null)}>
        {selectedWarehouse && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-steel-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-steel-500">Status</p>
              <div className="mt-2">
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${selectedWarehouse.isActive ? "bg-signal-green/10 text-signal-green" : "bg-steel-100 text-steel-500"}`}>
                  {selectedWarehouse.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-steel-500">Code</dt>
                <dd className="font-mono text-ink-900">{selectedWarehouse.code}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Location</dt>
                <dd>{selectedWarehouse.location}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Locations</dt>
                <dd className="space-y-1 pt-1">{selectedWarehouse.locations?.length ? selectedWarehouse.locations.map((location) => <div key={location.id} className="rounded-md border border-steel-200 px-2 py-1.5">{location.name}</div>) : <span className="text-steel-500">No locations configured</span>}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Stock summary</dt>
                <dd className="space-y-1 pt-1">{selectedStock.length ? selectedStock.map(({ product, level }, index) => <div key={`${product.id}-${level.locationId ?? index}`} className="flex justify-between gap-3 rounded-md border border-steel-200 px-2 py-1.5"><span className="truncate">{product.name}{level.locationName ? ` · ${level.locationName}` : ""}</span><span className="shrink-0 font-mono">{level.quantity}</span></div>) : <span className="text-steel-500">No stock recorded</span>}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Recent movements</dt>
                <dd className="space-y-1 pt-1">{selectedMovements.length ? selectedMovements.map((entry) => <div key={entry.id} className="flex justify-between gap-3 rounded-md border border-steel-200 px-2 py-1.5"><span className="truncate">{entry.documentReference}</span><span className="font-mono">{entry.quantityChange > 0 ? "+" : ""}{entry.quantityChange}</span></div>) : <span className="text-steel-500">No recent movements</span>}</dd>
              </div>
            </dl>
          </div>
        )}
      </DetailDrawer>
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Add warehouse" footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" form="warehouse-form" isLoading={saving}>Create warehouse</Button></>}>
        <form id="warehouse-form" onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={newWarehouse.name} onChange={(event) => setNewWarehouse((current) => ({ ...current, name: event.target.value }))} required />
          <Input label="Code" value={newWarehouse.code} onChange={(event) => setNewWarehouse((current) => ({ ...current, code: event.target.value }))} required />
          <Input label="Location" value={newWarehouse.location} onChange={(event) => setNewWarehouse((current) => ({ ...current, location: event.target.value }))} required />
        </form>
      </Modal>
    </AppShell>
  );
}

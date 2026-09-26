import { useMemo, useState, type FormEvent } from "react";

import AppShell from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table, { type Column } from "@/components/ui/Table";
import DetailDrawer from "@/components/ui/DetailDrawer";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";

import { useAsync } from "@/hooks/useAsync";
import {
  createWarehouse,
  fetchWarehouses,
  fetchLedger,
} from "@/services/operationsService";
import { fetchProducts } from "@/services/productService";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/services/apiClient";

import type { Product, Warehouse } from "@/types";

export default function Warehouses() {
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] =
    useState<string | null>(null);

  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    code: "",
    location: "",
  });

  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);
  const productsQuery = useAsync<Product[]>(fetchProducts, []);
  const ledgerQuery = useAsync(fetchLedger, []);

  const selectedWarehouse = useMemo(
    () =>
      (warehousesQuery.data ?? []).find(
        (warehouse) => warehouse.id === selectedWarehouseId
      ) ?? null,
    [warehousesQuery.data, selectedWarehouseId]
  );

  const lowStockLocations = useMemo(
    () =>
      (productsQuery.data ?? []).flatMap((product) =>
        product.stockByLocation.filter(
          (level) =>
            level.quantity > 0 && level.quantity <= product.reorderPoint
        )
      ),
    [productsQuery.data]
  );

  const selectedStock = selectedWarehouse
    ? (productsQuery.data ?? []).flatMap((product) =>
        product.stockByLocation
          .filter(
            (level) => level.warehouseId === selectedWarehouse.id
          )
          .map((level) => ({
            product,
            level,
          }))
      )
    : [];

  const selectedMovements = selectedWarehouse
    ? (ledgerQuery.data ?? [])
        .filter(
          (entry) => entry.warehouseId === selectedWarehouse.id
        )
        .slice(0, 5)
    : [];

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newWarehouse.name.trim();
    const code = newWarehouse.code.trim().toUpperCase();
    const location = newWarehouse.location.trim();

    if (!name || !code || !location) {
      showToast("Please fill in all warehouse fields.", "error");
      return;
    }

    setSaving(true);

    try {
      await createWarehouse({
        name,
        code,
        location,
      });

      await warehousesQuery.refetch();

      setNewWarehouse({
        name: "",
        code: "",
        location: "",
      });

      setCreateOpen(false);

      showToast("Warehouse created successfully.", "success");
    } catch (error) {
      showToast(
        error instanceof ApiError
          ? error.message
          : "Couldn't create the warehouse.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Warehouse>[] = [
    {
      header: "Warehouse",
      render: (warehouse) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 21V7l9-4 9 4v14" />
              <path d="M9 21v-6h6v6" />
              <path d="M7 10h.01" />
              <path d="M17 10h.01" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="truncate font-medium text-slate-100">
              {warehouse.name}
            </p>
            <p className="truncate text-xs text-slate-500">
              {warehouse.location}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Code",
      render: (warehouse) => (
        <span className="font-mono text-xs text-slate-400">
          {warehouse.code}
        </span>
      ),
    },
    {
      header: "Locations",
      render: (warehouse) => (
        <span className="text-sm text-slate-300">
          {warehouse.locations?.length ?? 0}
        </span>
      ),
    },
    {
      header: "Status",
      render: (warehouse) => (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            warehouse.isActive
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-slate-700/60 text-slate-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              warehouse.isActive
                ? "bg-emerald-400"
                : "bg-slate-500"
            }`}
          />
          {warehouse.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <AppShell title="Warehouses">
      <div className="space-y-5">
        <PageHeader
          title="Warehouses"
          description="Manage warehouse locations, stock distribution and movement activity."
          action={
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500"
            >
              + Add warehouse
            </Button>
          }
        />

        {warehousesQuery.data && (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: "Total warehouses",
                value: warehousesQuery.data.length,
                icon: "warehouse",
                accent: "text-blue-400 bg-blue-500/10",
              },
              {
                label: "Active warehouses",
                value: warehousesQuery.data.filter(
                  (warehouse) => warehouse.isActive
                ).length,
                icon: "active",
                accent: "text-emerald-400 bg-emerald-500/10",
              },
              {
                label: "Total locations",
                value: warehousesQuery.data.reduce(
                  (count, warehouse) =>
                    count + (warehouse.locations?.length ?? 0),
                  0
                ),
                icon: "location",
                accent: "text-cyan-400 bg-cyan-500/10",
              },
              {
                label: "Low stock locations",
                value: lowStockLocations.length,
                icon: "warning",
                accent: "text-amber-400 bg-amber-500/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-800/80 bg-[#101D2E] px-4 py-4 shadow-lg shadow-black/10 transition hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-100">
                      {item.value}
                    </p>
                  </div>

                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-icon-container ${item.icon === "warning" ? "text-amber-400" : item.icon === "active" ? "text-signal-green" : item.icon === "location" ? "text-brand-400" : "text-icon-blue"}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {item.icon === "warehouse" && <><path d="M3 10 12 4l9 6v10H3V10Z" /><path d="M7 20v-6h10v6M8 10h.01M12 10h.01M16 10h.01" /></>}
                      {item.icon === "active" && <><path d="M3 12h4l3-7 4 14 3-7h4" /><circle cx="12" cy="12" r="10" /></>}
                      {item.icon === "location" && <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>}
                      {item.icon === "warning" && <><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>}
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Card className="overflow-hidden border border-slate-800/80 bg-[#101D2E] shadow-xl shadow-black/10">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Warehouse network
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Select a warehouse to view stock and movement details.
                </p>
              </div>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
                Live
              </span>
            </div>
          </div>

          {warehousesQuery.status === "loading" && (
            <div className="p-8">
              <Spinner label="Loading warehouses…" />
            </div>
          )}

          {warehousesQuery.status === "error" && (
            <div className="p-6">
              <ErrorState
                message={
                  warehousesQuery.error ??
                  "Failed to load warehouses."
                }
                onRetry={warehousesQuery.refetch}
              />
            </div>
          )}

          {warehousesQuery.status === "success" &&
            warehousesQuery.data && (
              <Table
                columns={columns}
                rows={warehousesQuery.data}
                keyField={(warehouse) => warehouse.id}
                onRowClick={(warehouse) =>
                  setSelectedWarehouseId(warehouse.id)
                }
              />
            )}
        </Card>
      </div>

      <DetailDrawer
        open={!!selectedWarehouse}
        title={selectedWarehouse?.name ?? "Warehouse details"}
        icon={<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10 12 4l9 6v10H3V10Z" /><path d="M7 20v-6h10v6M8 10h.01M12 10h.01M16 10h.01" /></svg>}
        onClose={() => setSelectedWarehouseId(null)}
      >
        {selectedWarehouse && (
          <div className="space-y-5 text-sm">
            <div className="rounded-xl border border-slate-800 bg-[#101D2E] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                    Warehouse status
                  </p>

                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        selectedWarehouse.isActive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-700/60 text-slate-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedWarehouse.isActive
                            ? "bg-emerald-400"
                            : "bg-slate-500"
                        }`}
                      />

                      {selectedWarehouse.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M3 21V7l9-4 9 4v14" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </div>
              </div>
            </div>

            <dl className="space-y-5">
              <div>
                <dt className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Code
                </dt>
                <dd className="mt-1 font-mono text-slate-200">
                  {selectedWarehouse.code}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Location
                </dt>
                <dd className="mt-1 text-slate-200">
                  {selectedWarehouse.location}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Locations
                </dt>

                <dd className="mt-2 space-y-2">
                  {selectedWarehouse.locations?.length ? (
                    selectedWarehouse.locations.map((location) => (
                      <div
                        key={location.id}
                        className="rounded-lg border border-slate-800 bg-[#0D1726] px-3 py-2 text-slate-300"
                      >
                        {location.name}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">
                      No locations configured
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Stock summary
                </dt>

                <dd className="mt-2 space-y-2">
                  {selectedStock.length ? (
                    selectedStock.map(({ product, level }, index) => (
                      <div
                        key={`${product.id}-${level.locationId ?? index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0D1726] px-3 py-2.5"
                      >
                        <span className="truncate text-slate-300">
                          {product.name}
                          {level.locationName
                            ? ` · ${level.locationName}`
                            : ""}
                        </span>

                        <span className="shrink-0 font-mono font-medium text-slate-100">
                          {level.quantity}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">
                      No stock recorded
                    </span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  Recent movements
                </dt>

                <dd className="mt-2 space-y-2">
                  {selectedMovements.length ? (
                    selectedMovements.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0D1726] px-3 py-2.5"
                      >
                        <span className="truncate text-slate-300">
                          {entry.documentReference}
                        </span>

                        <span
                          className={`font-mono font-medium ${
                            entry.quantityChange > 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {entry.quantityChange > 0 ? "+" : ""}
                          {entry.quantityChange}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">
                      No recent movements
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </DetailDrawer>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add warehouse"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="warehouse-form"
              isLoading={saving}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              Create warehouse
            </Button>
          </>
        }
      >
        <form
          id="warehouse-form"
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={newWarehouse.name}
            onChange={(event) =>
              setNewWarehouse((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            required
          />

          <Input
            label="Code"
            value={newWarehouse.code}
            onChange={(event) =>
              setNewWarehouse((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
            required
          />

          <Input
            label="Location"
            value={newWarehouse.location}
            onChange={(event) =>
              setNewWarehouse((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            required
          />
        </form>
      </Modal>
    </AppShell>
  );
}
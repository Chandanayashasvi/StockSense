import { useState, useMemo } from "react";
import AppShell from "@/components/layout/AppLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import Table, { Column } from "@/components/ui/Table";
import DetailDrawer from "@/components/ui/DetailDrawer";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import DocumentFormModal from "./DocumentFormModal";
import { useAsync } from "@/hooks/useAsync";
import { fetchDocuments, fetchWarehouses, validateDocument } from "@/services/operationsService";
import { fetchProducts } from "@/services/productService";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/services/apiClient";
import type { StockDocument, OperationType, DocumentStatus, Warehouse, Product } from "@/types";

interface OperationsListPageProps {
  type: OperationType;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  newLabel: string;
}

const VALIDATE_LABEL: Record<OperationType, string> = {
  receipt: "Receive",
  delivery: "Deliver",
  transfer: "Complete transfer",
  adjustment: "Apply",
};

export default function OperationsListPage({ type, title, description, emptyTitle, emptyDescription, newLabel }: OperationsListPageProps) {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [pendingValidation, setPendingValidation] = useState<StockDocument | null>(null);

  const docsQuery = useAsync<StockDocument[]>(
    () => fetchDocuments({ type, status: (statusFilter || undefined) as DocumentStatus | undefined, warehouseId: warehouseFilter || undefined }),
    [type, statusFilter, warehouseFilter]
  );
  const warehousesQuery = useAsync<Warehouse[]>(fetchWarehouses, []);
  const productsQuery = useAsync<Product[]>(fetchProducts, []);

  const warehouseMap = useMemo(() => new Map((warehousesQuery.data ?? []).map((w) => [w.id, w])), [warehousesQuery.data]);
  const productMap = useMemo(() => new Map((productsQuery.data ?? []).map((p) => [p.id, p])), [productsQuery.data]);
  const selectedDoc = useMemo(() => (docsQuery.data ?? []).find((doc) => doc.id === selectedDocId) ?? null, [docsQuery.data, selectedDocId]);

  async function handleValidate(doc: StockDocument) {
    setValidatingId(doc.id);
    try {
      await validateDocument(doc.id);
      showToast(`${doc.reference} marked as Done — stock updated.`, "success");
      await docsQuery.refetch();
      setPendingValidation(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't complete this document.", "error");
    } finally {
      setValidatingId(null);
    }
  }

  const columns: Column<StockDocument>[] = [
    { header: "Reference", render: (d) => <span className="font-mono text-xs font-medium">{d.reference}</span> },
    ...(type === "transfer"
      ? [
          { header: "From", render: (d: StockDocument) => warehouseMap.get(d.warehouseId)?.name ?? "—" },
          { header: "To", render: (d: StockDocument) => (d.destinationWarehouseId ? warehouseMap.get(d.destinationWarehouseId)?.name : "—") ?? "—" },
        ]
      : [
          { header: "Warehouse", render: (d: StockDocument) => warehouseMap.get(d.warehouseId)?.name ?? "—" },
          ...(type !== "adjustment" ? [{ header: type === "receipt" ? "Supplier" : "Customer", render: (d: StockDocument) => d.partner ?? "—" }] : []),
        ]),
    {
      header: "Products",
      render: (d) => (
        <span className="text-steel-600">
          {d.lines
            .slice(0, 2)
            .map((l) => productMap.get(l.productId)?.name ?? l.productId)
            .join(", ")}
          {d.lines.length > 2 ? ` +${d.lines.length - 2} more` : ""}
        </span>
      ),
    },
    { header: "Scheduled", render: (d) => d.scheduledDate },
    { header: "Status", render: (d) => <StatusBadge status={d.status} /> },
    {
      header: "",
      className: "text-right",
      render: (d) =>
        d.status !== "Done" && d.status !== "Canceled" ? (
          <Button size="sm" variant="secondary" isLoading={validatingId === d.id} onClick={(event) => { event.stopPropagation(); setPendingValidation(d); }}>
            {VALIDATE_LABEL[type]}
          </Button>
        ) : null,
    },
  ];

  const isLoading = docsQuery.status === "loading" || warehousesQuery.status === "loading" || productsQuery.status === "loading";

  return (
    <AppShell title={title}>
      <div className="space-y-4">
        <PageHeader title={title} description={description} action={<Button onClick={() => setModalOpen(true)}>+ {newLabel}</Button>} />

        <Card>
          <div className="p-4 border-b border-steel-100 flex flex-wrap gap-2">
            <Select className="w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Waiting">Waiting</option>
              <option value="Ready">Ready</option>
              <option value="Done">Done</option>
              <option value="Canceled">Canceled</option>
            </Select>
            <Select className="w-44" value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)}>
              <option value="">All warehouses</option>
              {(warehousesQuery.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>

          {isLoading && <Spinner label="Loading…" />}
          {docsQuery.status === "error" && <ErrorState message={docsQuery.error ?? "Failed to load."} onRetry={docsQuery.refetch} />}
          {!isLoading && docsQuery.status === "success" && docsQuery.data && docsQuery.data.length === 0 && (
            <EmptyState title={emptyTitle} description={emptyDescription} action={<Button size="sm" onClick={() => setModalOpen(true)}>+ {newLabel}</Button>} />
          )}
          {!isLoading && docsQuery.data && docsQuery.data.length > 0 && <Table columns={columns} rows={docsQuery.data} keyField={(d) => d.id} onRowClick={(doc) => setSelectedDocId(doc.id)} />}
        </Card>
      </div>

      <DetailDrawer open={!!selectedDoc} title={selectedDoc?.reference ?? "Operation details"} onClose={() => setSelectedDocId(null)}>
        {selectedDoc && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-steel-50 p-3">
              <p className="text-xs uppercase tracking-[0.08em] text-steel-500">Status</p>
              <div className="mt-2">
                <StatusBadge status={selectedDoc.status} />
              </div>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-steel-500">Type</dt>
                <dd>{VALIDATE_LABEL[selectedDoc.type]}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Warehouse</dt>
                <dd>{warehouseMap.get(selectedDoc.warehouseId)?.name ?? selectedDoc.warehouseId}</dd>
              </div>
              {selectedDoc.destinationWarehouseId && (
                <div>
                  <dt className="text-steel-500">Destination</dt>
                  <dd>{warehouseMap.get(selectedDoc.destinationWarehouseId)?.name ?? selectedDoc.destinationWarehouseId}</dd>
                </div>
              )}
              {selectedDoc.partner && (
                <div>
                  <dt className="text-steel-500">Partner</dt>
                  <dd>{selectedDoc.partner}</dd>
                </div>
              )}
              <div>
                <dt className="text-steel-500">Scheduled</dt>
                <dd>{selectedDoc.scheduledDate}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Notes</dt>
                <dd>{selectedDoc.note || "—"}</dd>
              </div>
              <div>
                <dt className="text-steel-500">Products</dt>
                <dd className="space-y-1 pt-1">
                  {selectedDoc.lines.map((line) => (
                    <div key={line.id} className="flex justify-between gap-3 rounded-md border border-steel-200 px-2 py-1.5">
                      <span>{productMap.get(line.productId)?.name ?? line.productId}</span>
                      <span className="font-mono">{line.quantity}</span>
                    </div>
                  ))}
                </dd>
              </div>
            </dl>
            {selectedDoc.status !== "Done" && selectedDoc.status !== "Canceled" && (
              <Button className="w-full" onClick={() => setPendingValidation(selectedDoc)}>{VALIDATE_LABEL[selectedDoc.type]}</Button>
            )}
          </div>
        )}
      </DetailDrawer>

      <ConfirmDialog
        open={!!pendingValidation}
        onClose={() => setPendingValidation(null)}
        onConfirm={() => { if (pendingValidation) void handleValidate(pendingValidation); }}
        title="Confirm stock operation"
        description={pendingValidation ? `Complete ${pendingValidation.reference}? This applies its stock changes and records them in the ledger.` : "Confirm this stock operation?"}
        confirmLabel={validatingId ? "Processing…" : "Confirm and apply"}
      />

      <DocumentFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={docsQuery.refetch}
        type={type}
        products={productsQuery.data ?? []}
        warehouses={warehousesQuery.data ?? []}
      />
    </AppShell>
  );
}

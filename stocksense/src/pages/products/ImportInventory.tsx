import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Spinner from "@/components/ui/Spinner";
import { ApiError } from "@/services/apiClient";
import { commitInventoryImport, validateInventoryImport, type ImportResult, type ImportValidation } from "@/services/inventoryImportService";
import { useToast } from "@/context/ToastContext";

export default function ImportInventory() {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleFileChange(nextFile?: File) {
    setFile(nextFile ?? null);
    setValidation(null);
    setResult(null);
    if (!nextFile) return;
    setValidating(true);
    try {
      const response = await validateInventoryImport(nextFile);
      setValidation(response);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "Unable to validate this file.", "error");
    } finally {
      setValidating(false);
    }
  }

  async function handleCommit() {
    if (!file || !validation || validation.invalidRows || validation.missingHeaders.length) return;
    setImporting(true);
    try {
      const response = await commitInventoryImport(file);
      setResult(response);
      setConfirmOpen(false);
      showToast(`Imported ${response.totalRows} rows successfully.`, "success");
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      showToast(apiError?.message ?? "Import failed. No changes were committed.", "error");
    } finally {
      setImporting(false);
    }
  }

  const canImport = !!file && !!validation && validation.totalRows > 0 && validation.invalidRows === 0 && validation.missingHeaders.length === 0;

  return (
    <AppShell title="Import Inventory">
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title="Import Inventory" description="Upload a CSV or Excel workbook to update product and location stock." action={<Link className="text-sm font-medium text-ink-800 hover:underline" to="/products">Back to products</Link>} />

        <Card className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Inventory file</h2>
              <p className="mt-1 text-xs text-steel-500">Required columns: SKU, Product Name, Category, Unit of Measure, Warehouse, Location, Quantity, Reorder Point.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <a className="font-medium text-ink-800 underline underline-offset-2" href="/stocksense-inventory-template.csv" download>CSV template</a>
              <a className="font-medium text-ink-800 underline underline-offset-2" href="/stocksense-inventory-template.xlsx" download>Excel template</a>
            </div>
          </div>
          <label className="mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-steel-300 bg-steel-50/50 px-4 text-center hover:bg-steel-50">
            <span className="text-sm font-medium text-ink-900">{file?.name ?? "Choose a .csv or .xlsx file"}</span>
            <span className="mt-1 text-xs text-steel-500">Maximum file size: 5 MB</span>
            <input className="sr-only" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleFileChange(event.target.files?.[0])} />
          </label>
          {validating && <div className="mt-3"><Spinner label="Validating every row…" /></div>}
        </Card>

        {validation && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                ["Total rows", validation.totalRows],
                ["Valid rows", validation.validRows],
                ["Invalid rows", validation.invalidRows],
                ["Duplicates", validation.duplicates],
                ["Missing fields", validation.missingFields],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-steel-200 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-steel-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-ink-900">{value}</p>
                </div>
              ))}
            </div>
            {(validation.headerError || validation.missingHeaders.length > 0) && (
              <div role="alert" className="rounded-md border border-signal-red/30 bg-signal-red/5 px-3 py-2 text-sm text-signal-red">
                {validation.headerError ?? `Missing columns: ${validation.missingHeaders.join(", ")}`}
              </div>
            )}
            <Card>
              <div className="border-b border-steel-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-ink-900">Row validation</h2>
              </div>
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead className="sticky top-0 bg-steel-50 text-xs text-steel-500">
                    <tr>{["Row", "SKU", "Product", "Category", "Warehouse / Location", "Quantity", "Validation"].map((heading) => <th className="px-3 py-2 font-medium" key={heading}>{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {validation.rows.map((row) => (
                      <tr key={row.row} className="border-t border-steel-100 align-top">
                        <td className="px-3 py-2 font-mono">{row.row}</td>
                        <td className="px-3 py-2 font-mono">{row.sku || "—"}</td>
                        <td className="px-3 py-2">{row.productName || "—"}</td>
                        <td className="px-3 py-2">{row.category || "—"}</td>
                        <td className="px-3 py-2">{[row.warehouse, row.location].filter(Boolean).join(" / ") || "—"}</td>
                        <td className="px-3 py-2 font-mono">{Number.isFinite(row.quantity) ? row.quantity : "—"}</td>
                        <td className="px-3 py-2">
                          {row.errors.length ? <ul className="list-disc pl-4 text-xs text-signal-red">{row.errors.map((error) => <li key={error}>{error}</li>)}</ul> : <span className="text-xs font-medium text-signal-green">Valid</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-steel-500">Import is all-or-nothing. Invalid rows must be corrected before any database changes occur.</p>
              <Button disabled={!canImport || importing} isLoading={importing} onClick={() => setConfirmOpen(true)}>Confirm import</Button>
            </div>
          </>
        )}

        {result && (
          <Card className="border-signal-green/30 bg-signal-green/5 p-4">
            <h2 className="text-sm font-semibold text-ink-900">Import complete</h2>
            <p className="mt-1 text-sm text-steel-600">{result.created} products created, {result.updated} updated, {result.stockChanges} stock locations changed, and {result.ledgerEntries} ledger entries recorded.</p>
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleCommit()}
        title="Confirm inventory import"
        description={`Import ${validation?.validRows ?? 0} valid rows and apply the resulting stock changes to the live inventory and ledger? This cannot be automatically undone.`}
        confirmLabel={importing ? "Importing…" : "Import inventory"}
      />
    </AppShell>
  );
}

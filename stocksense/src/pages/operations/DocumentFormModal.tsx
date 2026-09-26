import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { createDocument } from "@/services/operationsService";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/services/apiClient";
import type { OperationType, Product, Warehouse } from "@/types";

interface LineDraft {
  productId: string;
  quantity: string;
}

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  type: OperationType;
  products: Product[];
  warehouses: Warehouse[];
}

const CONFIG: Record<OperationType, { title: string; partnerLabel?: string; allowNegativeQty: boolean; needsDestination: boolean }> = {
  receipt: { title: "New receipt", partnerLabel: "Supplier", allowNegativeQty: false, needsDestination: false },
  delivery: { title: "New delivery order", partnerLabel: "Customer", allowNegativeQty: false, needsDestination: false },
  transfer: { title: "New internal transfer", allowNegativeQty: false, needsDestination: true },
  adjustment: { title: "New stock adjustment", allowNegativeQty: true, needsDestination: false },
};

function emptyLine(): LineDraft {
  return { productId: "", quantity: "" };
}

export default function DocumentFormModal({ isOpen, onClose, onCreated, type, products, warehouses }: DocumentFormModalProps) {
  const config = CONFIG[type];
  const { showToast } = useToast();
  const [warehouseId, setWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [partner, setPartner] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setWarehouseId("");
      setDestinationWarehouseId("");
      setPartner("");
      setScheduledDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setLines([emptyLine()]);
      setFormError(null);
    }
  }, [isOpen]);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, emptyLine()]);
  }
  function removeLine(index: number) {
    setLines((ls) => (ls.length > 1 ? ls.filter((_, i) => i !== index) : ls));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!warehouseId) return setFormError("Select a warehouse.");
    if (config.needsDestination && !destinationWarehouseId) return setFormError("Select a destination location.");
    if (config.needsDestination && destinationWarehouseId === warehouseId) return setFormError("Source and destination must be different.");
    if (!scheduledDate) return setFormError("Pick a scheduled date.");

    const cleanLines = lines.filter((l) => l.productId && l.quantity.trim() !== "");
    if (cleanLines.length === 0) return setFormError("Add at least one product line with a quantity.");
    for (const l of cleanLines) {
      const n = Number(l.quantity);
      if (Number.isNaN(n)) return setFormError("Quantities must be numbers.");
      if (!config.allowNegativeQty && n <= 0) return setFormError("Quantities must be greater than zero.");
      if (config.allowNegativeQty && n === 0) return setFormError("Adjustment quantity can't be zero.");
    }

    setSubmitting(true);
    try {
      await createDocument({
        type,
        warehouseId,
        destinationWarehouseId: config.needsDestination ? destinationWarehouseId : undefined,
        partner: config.partnerLabel ? partner.trim() || undefined : undefined,
        scheduledDate,
        note: note.trim() || undefined,
        lines: cleanLines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) })),
      });
      showToast(`${config.title} saved as a draft.`, "success");
      onCreated();
      onClose();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't save this document. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="lg"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="document-form" isLoading={submitting}>
            Save as draft
          </Button>
        </>
      }
    >
      <form id="document-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="text-sm text-signal-red bg-signal-red/5 border border-signal-red/20 rounded-md px-3 py-2">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select label={config.needsDestination ? "From location" : "Warehouse"} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Select…</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          {config.needsDestination ? (
            <Select label="To location" value={destinationWarehouseId} onChange={(e) => setDestinationWarehouseId(e.target.value)}>
              <option value="">Select…</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input label="Scheduled date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          )}
        </div>

        {config.needsDestination && <Input label="Scheduled date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />}

        {config.partnerLabel && (
          <Input label={config.partnerLabel} placeholder={`${config.partnerLabel} name`} value={partner} onChange={(e) => setPartner(e.target.value)} />
        )}

        {type === "adjustment" && (
          <Input label="Reason / note" placeholder="e.g. Damaged in transit, cycle count correction" value={note} onChange={(e) => setNote(e.target.value)} />
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink-800">Product lines</p>
            <button type="button" onClick={addLine} className="text-xs font-medium text-ink-800 hover:underline">
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Select className="flex-1" value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
                <Input
                  className="w-28"
                  inputMode="numeric"
                  placeholder={config.allowNegativeQty ? "±qty" : "qty"}
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  aria-label="Remove line"
                  className="h-9 w-9 shrink-0 rounded-md flex items-center justify-center text-steel-400 hover:bg-steel-100 hover:text-signal-red"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {config.allowNegativeQty && <p className="text-xs text-steel-500 mt-1.5">Use a negative number to remove stock (e.g. damaged goods), positive to add it.</p>}
        </div>
      </form>
    </Modal>
  );
}

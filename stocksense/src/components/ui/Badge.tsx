import type { DocumentStatus } from "@/types";

const STATUS_STYLES: Record<DocumentStatus, string> = {
  Draft: "bg-steel-100 text-steel-600",
  Waiting: "bg-amber-400/15 text-amber-700",
  Ready: "bg-signal-blue/10 text-signal-blue",
  Done: "bg-signal-green/10 text-signal-green",
  Canceled: "bg-signal-red/10 text-signal-red",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function StockBadge({ quantity, reorderPoint }: { quantity: number; reorderPoint: number }) {
  if (quantity === 0) {
    return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-signal-red/10 text-signal-red">Out of stock</span>;
  }
  if (quantity <= reorderPoint) {
    return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-amber-400/15 text-amber-700">Low stock</span>;
  }
  return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-signal-green/10 text-signal-green">In stock</span>;
}

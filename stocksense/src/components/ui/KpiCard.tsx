import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone?: "default" | "warning" | "danger";
}

const TONE_STYLES: Record<string, string> = {
  default: "bg-ink-900/5 text-ink-800",
  warning: "bg-amber-400/15 text-amber-700",
  danger: "bg-signal-red/10 text-signal-red",
};

export default function KpiCard({ label, value, icon, tone = "default" }: KpiCardProps) {
  return (
    <div className="bg-white border border-steel-200 rounded-lg shadow-card p-4 flex items-center gap-3.5">
      <div className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${TONE_STYLES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-ink-900 leading-tight font-mono">{value}</p>
        <p className="text-xs text-steel-500 truncate">{label}</p>
      </div>
    </div>
  );
}

import { ReactNode } from "react";

// Shared shell for Login / Signup / Forgot Password: split panel with the
// brand story on the left (hidden on small screens) and the form on the right.
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[44%] bg-ink-900 flex-col justify-between p-10 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-amber-500 flex items-center justify-center text-ink-950 font-bold">S</div>
          <span className="text-white font-semibold text-lg">StockSense</span>
        </div>
        <div className="space-y-5 max-w-sm">
          <p className="text-2xl text-white font-semibold leading-snug">
            One ledger for every receipt, transfer, and delivery.
          </p>
          <p className="text-steel-400 text-sm leading-relaxed">
            Replace scattered spreadsheets with real-time stock visibility across every warehouse
            your team runs.
          </p>
          <div className="flex flex-col gap-2.5 font-mono text-xs text-steel-400 pt-2">
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-signal-green" /> WH/IN/00012 · Steel Rods +150</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> WH/OUT/00041 · awaiting pick</div>
            <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-signal-blue" /> WH/INT/00008 · in transit</div>
          </div>
        </div>
        <p className="text-steel-500 text-xs">© 2026 StockSense. Built for hackathon demo.</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
            <p className="text-sm text-steel-500 mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

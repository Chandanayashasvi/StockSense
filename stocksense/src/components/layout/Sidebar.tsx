import { NavLink } from "react-router-dom";
import { useState } from "react";

interface NavItem {
  label: string;
  to: string;
  icon: JSX.Element;
}

const icon = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const mainNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: icon("M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z") },
  { label: "Products", to: "/products", icon: icon("M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8") },
  { label: "Import Inventory", to: "/products/import", icon: icon("M12 16V4m0 0L7 9m5-5l5 5M4 20h16") },
];

const opsNav: NavItem[] = [
  { label: "Receipts", to: "/operations/receipts", icon: icon("M12 4v16m8-8H4") },
  { label: "Delivery Orders", to: "/operations/deliveries", icon: icon("M3 7h13l4 4v6h-2M3 7v10h10M3 7l3-4h7l3 4M7 20a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z") },
  { label: "Internal Transfers", to: "/operations/transfers", icon: icon("M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4") },
  { label: "Adjustments", to: "/operations/adjustments", icon: icon("M12 4.5v15m7.5-7.5h-15") },
  { label: "Move History", to: "/operations/history", icon: icon("M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z") },
];

const settingsNav: NavItem[] = [{ label: "Warehouses", to: "/settings/warehouses", icon: icon("M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1") }];

function NavGroup({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div className="space-y-0.5">
      {title && <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-steel-500">{title}</p>}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive ? "bg-ink-800 text-white font-medium" : "text-steel-300 hover:bg-ink-800/60 hover:text-white"
            }`
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-ink-800 shrink-0">
        <div className="h-8 w-8 rounded-md bg-amber-500 flex items-center justify-center text-ink-950 font-bold text-sm">S</div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">StockSense</p>
          <p className="text-steel-400 text-[11px] leading-tight">Inventory OS</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        <NavGroup items={mainNav} onNavigate={onNavigate} />
        <NavGroup title="Operations" items={opsNav} onNavigate={onNavigate} />
        <NavGroup title="Settings" items={settingsNav} onNavigate={onNavigate} />
      </nav>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-ink-900">
        <SidebarContent />
      </aside>

      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="md:hidden fixed top-3.5 left-3 z-30 h-9 w-9 rounded-md bg-ink-900 text-white flex items-center justify-center"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-ink-900 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-4 right-3 h-8 w-8 rounded-md flex items-center justify-center text-steel-300 hover:bg-ink-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

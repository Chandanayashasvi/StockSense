import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import InventoryIcon, { InventoryIconName } from "@/components/ui/InventoryIcon";

interface NavItem {
  label: string;
  to: string;
  icon: InventoryIconName;
}

const mainNav: NavItem[] = [
  { label: "Dashboard", to: "/", icon: "dashboard" },
  { label: "Products", to: "/products", icon: "package" },
  { label: "Import Inventory", to: "/products/import", icon: "barcode" },
];

const opsNav: NavItem[] = [
  { label: "Receipts", to: "/operations/receipts", icon: "packageIn" },
  { label: "Delivery Orders", to: "/operations/deliveries", icon: "truck" },
  { label: "Transfers", to: "/operations/transfers", icon: "transfer" },
  { label: "Adjustments", to: "/operations/adjustments", icon: "adjustment" },
  { label: "Move History", to: "/operations/history", icon: "history" },
];

const settingsNav: NavItem[] = [
  { label: "Warehouses", to: "/settings/warehouses", icon: "warehouse" },
  { label: "Settings", to: "/profile", icon: "settings" },
];

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
          className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-brand-600/30 font-medium text-white" : "text-steel-400 hover:bg-steel-100 hover:text-white"}`}
        >
          <InventoryIcon name={item.icon} className="h-[18px] w-[18px] shrink-0 text-icon-blue" />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function openProfile() {
    navigate("/profile");
    onNavigate?.();
  }

  function signOut() {
    logout();
    navigate("/login");
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-steel-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-icon-container text-icon-blue"><InventoryIcon name="warehouse" /></div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">StockSense</p>
          <p className="text-[11px] leading-tight text-steel-500">Inventory OS</p>
        </div>
      </div>
      <nav aria-label="Main navigation" className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
        <NavGroup items={mainNav} onNavigate={onNavigate} />
        <NavGroup title="Operations" items={opsNav} onNavigate={onNavigate} />
        <NavGroup title="Settings" items={settingsNav} onNavigate={onNavigate} />
      </nav>
      <div className="flex items-center gap-1 border-t border-steel-200 p-3">
        <button type="button" onClick={openProfile} aria-label="Open profile and notification preferences" className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1.5 text-left hover:bg-steel-100">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-icon-container text-xs font-semibold text-icon-blue">{user?.avatarInitials ?? <InventoryIcon name="user" className="h-4 w-4" />}</span>
          <span className="min-w-0"><span className="block truncate text-xs font-medium text-white">{user?.name ?? "Profile"}</span><span className="block truncate text-[10px] text-steel-500">{user?.role ?? "Preferences"}</span></span>
        </button>
        <button type="button" onClick={openProfile} aria-label="Notification preferences" title="Notification preferences" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-steel-400 hover:bg-steel-100 hover:text-white"><InventoryIcon name="bell" className="h-[18px] w-[18px]" /></button>
        <button type="button" onClick={signOut} aria-label="Log out" title="Log out" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-steel-400 hover:bg-steel-100 hover:text-white"><InventoryIcon name="logout" className="h-[18px] w-[18px]" /></button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      <aside className="fixed inset-y-0 hidden w-60 flex-col md:flex" style={{ backgroundColor: "var(--ss-sidebar)" }}><SidebarContent /></aside>
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" className="fixed left-3 top-3.5 z-30 flex h-9 w-9 items-center justify-center rounded-md text-white md:hidden" style={{ backgroundColor: "var(--ss-sidebar)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" /></svg>
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button type="button" className="absolute inset-0 bg-ink-950/70" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" />
          <div className="relative h-full w-64" style={{ backgroundColor: "var(--ss-sidebar)" }}>
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md text-steel-400 hover:bg-steel-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

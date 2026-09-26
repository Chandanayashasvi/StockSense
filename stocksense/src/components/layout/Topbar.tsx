import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import InventoryIcon from "@/components/ui/InventoryIcon";

export default function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="h-16 border-b border-steel-200 bg-steel-100/95 backdrop-blur flex items-center gap-3 px-4 md:px-6 sticky top-0 z-20">
      <h1 className="max-w-[7rem] truncate text-base font-semibold text-ink-900 pl-10 md:max-w-none md:pl-0">{title}</h1>
      <form onSubmit={handleSearch} role="search" className="relative mx-auto flex min-w-0 flex-1 max-w-xl">
        <InventoryIcon name="search" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-steel-500" />
        <input
          aria-label="Search products, SKU, warehouse"
          placeholder="Search products, SKU, warehouse..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-full min-w-0 rounded-md border border-steel-200 bg-steel-50 pl-9 pr-3 text-sm text-ink-900 placeholder:text-copy-placeholder focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </form>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notification preferences"
          title="Notification preferences"
          onClick={() => navigate("/profile")}
          className="flex h-9 w-9 items-center justify-center rounded-md text-steel-400 transition-colors hover:bg-steel-100 hover:text-ink-900"
        >
          <InventoryIcon name="bell" className="h-[18px] w-[18px]" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-steel-100 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-icon-container text-xs font-semibold text-icon-blue">
              {user?.avatarInitials ?? <InventoryIcon name="user" className="h-4 w-4" />}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-ink-900 leading-tight">{user?.name}</p>
              <p className="text-xs text-steel-500 leading-tight">{user?.role}</p>
            </div>
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-48 bg-white border border-steel-200 rounded-md shadow-card py-1">
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
                className="w-full text-left px-3 py-2 text-sm text-ink-800 hover:bg-steel-50"
              >
                My Profile
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full text-left px-3 py-2 text-sm text-signal-red hover:bg-steel-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

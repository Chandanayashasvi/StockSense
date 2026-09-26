import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-steel-200 bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <h1 className="text-lg font-semibold text-ink-900 pl-10 md:pl-0">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-steel-100 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="h-8 w-8 rounded-full bg-ink-800 text-white text-xs font-semibold flex items-center justify-center">
              {user?.avatarInitials ?? "?"}
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

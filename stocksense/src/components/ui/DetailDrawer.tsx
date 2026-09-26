import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function DetailDrawer({
  open,
  title,
  onClose,
  children,
  icon,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const dialog = document.querySelector<HTMLElement>("[data-detail-drawer]");
        const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')] : [];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-labelledby="detail-drawer-title" data-detail-drawer className="relative h-full w-full max-w-md overflow-y-auto border-l border-steel-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-steel-200 bg-white px-5 py-4">
          <h2 id="detail-drawer-title" className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close details"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-steel-500 transition-colors hover:bg-steel-100 hover:text-ink-900"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="space-y-5 p-5">
          {icon && <div className="flex justify-center"><div className="flex h-16 w-16 items-center justify-center rounded-lg bg-icon-container text-icon-blue">{icon}</div></div>}
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

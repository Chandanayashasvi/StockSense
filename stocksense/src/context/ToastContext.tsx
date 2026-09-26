import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const KIND_STYLES: Record<ToastKind, string> = {
  success: "bg-ink-900 border-signal-green/40",
  error: "bg-ink-900 border-signal-red/40",
  info: "bg-ink-900 border-steel-400/40",
};

const KIND_DOT: Record<ToastKind, string> = {
  success: "bg-signal-green",
  error: "bg-signal-red",
  info: "bg-steel-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((toast) => toast.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`${KIND_STYLES[t.kind]} border rounded-md shadow-card px-4 py-3 text-sm text-steel-100 flex items-start gap-2.5 animate-[fadeIn_0.15s_ease-out]`}
          >
            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${KIND_DOT[t.kind]}`} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

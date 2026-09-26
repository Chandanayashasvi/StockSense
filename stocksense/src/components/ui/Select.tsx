import { SelectHTMLAttributes, forwardRef, ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, id, className = "", children, ...rest }, ref) => {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-800">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={!!error}
        className={`rounded-md border bg-white px-3 py-2 text-sm text-ink-900 outline-none transition-colors focus:ring-2 focus:ring-amber-500/30 ${
          error ? "border-signal-red focus:border-signal-red" : "border-steel-200 focus:border-ink-700"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-signal-red">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";
export default Select;

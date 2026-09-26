import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  endAdornment?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, id, className = "", endAdornment, ...rest }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-800">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm text-ink-900 placeholder:text-steel-400 outline-none transition-colors focus:ring-2 focus:ring-amber-500/30 ${
            error ? "border-signal-red focus:border-signal-red" : "border-steel-200 focus:border-ink-700"
          } ${endAdornment ? "pr-10" : ""} ${className}`}
          {...rest}
        />
        {endAdornment && <div className="absolute inset-y-0 right-2 flex items-center">{endAdornment}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-signal-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-steel-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
Input.displayName = "Input";
export default Input;

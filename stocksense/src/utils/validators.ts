// Small, composable field validators. Every form in the app builds its
// rules from these instead of re-writing regex/length checks inline —
// keeps validation consistent and easy to audit (playbook §4).

export type Validator = (value: string) => string | null;

export const required =
  (label: string): Validator =>
  (value) =>
    value.trim().length === 0 ? `${label} is required.` : null;

export const minLength =
  (n: number, label: string): Validator =>
  (value) =>
    value.trim().length > 0 && value.trim().length < n ? `${label} must be at least ${n} characters.` : null;

export const maxLength =
  (n: number, label: string): Validator =>
  (value) =>
    value.trim().length > n ? `${label} must be ${n} characters or fewer.` : null;

export const isEmail: Validator = (value) =>
  value.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? "Enter a valid email address."
    : null;

export const isNumeric =
  (label: string): Validator =>
  (value) =>
    value.trim().length > 0 && Number.isNaN(Number(value)) ? `${label} must be a number.` : null;

export const isPositive =
  (label: string): Validator =>
  (value) =>
    value.trim().length > 0 && Number(value) <= 0 ? `${label} must be greater than zero.` : null;

export const isNonNegative =
  (label: string): Validator =>
  (value) =>
    value.trim().length > 0 && Number(value) < 0 ? `${label} cannot be negative.` : null;

export const matches =
  (otherValue: string, label: string): Validator =>
  (value) =>
    value !== otherValue ? `${label} does not match.` : null;

export const isSkuFormat: Validator = (value) =>
  value.trim().length > 0 && !/^[A-Za-z0-9][A-Za-z0-9-_]{1,19}$/.test(value.trim())
    ? "SKU must be 2–20 characters: letters, numbers, - or _."
    : null;

export const isOtpFormat: Validator = (value) =>
  value.trim().length > 0 && !/^\d{6}$/.test(value.trim()) ? "Enter the 6-digit code." : null;

/** Runs a field's value through each validator, returning the first error found. */
export function runValidators(value: string, validators: Validator[]): string | null {
  for (const validate of validators) {
    const error = validate(value);
    if (error) return error;
  }
  return null;
}

// File validation for future upload flows (e.g. bulk product import).
export function validateFile(
  file: File,
  { maxSizeMb, allowedTypes }: { maxSizeMb: number; allowedTypes: string[] }
): string | null {
  if (file.size > maxSizeMb * 1024 * 1024) return `File must be smaller than ${maxSizeMb}MB.`;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedTypes.includes(ext)) return `Unsupported file type ".${ext}". Allowed: ${allowedTypes.join(", ")}.`;
  return null;
}

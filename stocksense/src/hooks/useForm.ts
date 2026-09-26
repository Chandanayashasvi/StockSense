// Tiny generic form hook: tracks values + per-field errors, runs each
// field's validators on change and on submit, and blocks submission while
// any field is invalid — so malformed input never reaches a service call
// (playbook §4: "never allow malformed input to silently reach the backend").

import { useState, useCallback } from "react";
import { runValidators, Validator } from "@/utils/validators";

type Rules<T> = Partial<Record<keyof T, Validator[]>>;

export function useForm<T extends Record<string, string>>(initialValues: T, rules: Rules<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback(
    (field: keyof T, value: string) => {
      const fieldRules = rules[field];
      if (!fieldRules) return null;
      return runValidators(value, fieldRules);
    },
    [rules]
  );

  const setField = useCallback(
    (field: keyof T, value: string) => {
      setValues((v) => ({ ...v, [field]: value }));
      if (touched[field]) {
        setErrors((e) => ({ ...e, [field]: validateField(field, value) ?? undefined }));
      }
    },
    [touched, validateField]
  );

  const blurField = useCallback(
    (field: keyof T) => {
      setTouched((t) => ({ ...t, [field]: true }));
      setErrors((e) => ({ ...e, [field]: validateField(field, values[field]) ?? undefined }));
    },
    [validateField, values]
  );

  const validateAll = useCallback((): boolean => {
    const nextErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;
    for (const field of Object.keys(rules) as (keyof T)[]) {
      const error = validateField(field, values[field] ?? "");
      if (error) {
        nextErrors[field] = error;
        isValid = false;
      }
    }
    setErrors(nextErrors);
    setTouched(Object.fromEntries(Object.keys(rules).map((k) => [k, true])) as Partial<Record<keyof T, boolean>>);
    return isValid;
  }, [rules, validateField, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return { values, errors, setField, blurField, validateAll, reset, setValues };
}

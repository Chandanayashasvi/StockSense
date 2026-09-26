import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useForm } from "@/hooks/useForm";
import { required, isEmail } from "@/utils/validators";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError, USE_MOCKS } from "@/services/apiClient";

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { values, errors, setField, blurField, validateAll } = useForm(
    { email: "", password: "" },
    { email: [required("Email"), isEmail], password: [required("Password")] }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      showToast("Welcome back!", "success");
      const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to sign in right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Log in to StockSense" subtitle="Track receipts, deliveries and stock in real time.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="text-sm text-signal-red bg-signal-red/5 border border-signal-red/20 rounded-md px-3 py-2">
            {formError}
          </div>
        )}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          error={errors.email}
          onChange={(e) => setField("email", e.target.value)}
          onBlur={() => blurField("email")}
        />
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          error={errors.password}
          onChange={(e) => setField("password", e.target.value)}
          onBlur={() => blurField("password")}
          endAdornment={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="text-xs font-medium text-steel-500 hover:text-steel-700"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          }
        />
        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-xs text-steel-500 hover:text-ink-800">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" isLoading={submitting} className="w-full">
          Log in
        </Button>
        {USE_MOCKS && (
          <p className="text-xs text-steel-500 bg-steel-100 rounded-md px-3 py-2">
            Demo mode: any email + a password of 6+ characters signs you in.
          </p>
        )}
      </form>
      <p className="text-sm text-steel-500 mt-6 text-center">
        Don't have an account?{" "}
        <Link to="/signup" className="text-ink-900 font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

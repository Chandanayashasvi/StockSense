import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useForm } from "@/hooks/useForm";
import { required, isEmail, minLength } from "@/utils/validators";
import { useAuth } from "@/context/AuthContext";
import { resendVerification } from "@/services/authService";
import { ApiError } from "@/services/apiClient";

export default function Signup() {
  const { signup } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { values, errors, setField, blurField, validateAll } = useForm(
    { name: "", email: "", password: "", confirmPassword: "" },
    {
      name: [required("Full name")],
      email: [required("Email"), isEmail],
      password: [required("Password"), minLength(8, "Password")],
      confirmPassword: [required("Confirm password")],
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const baseValid = validateAll();
    const confirmError = values.confirmPassword && values.password !== values.confirmPassword;
    if (!baseValid || confirmError) {
      if (confirmError) setFormError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await signup(values.name, values.email, values.password);
      setCheckEmail(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to create your account right now.");
      if (err instanceof ApiError && err.status === 503) setShowResend(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMessage(null);
    try {
      const result = await resendVerification(values.email);
      setResendMessage(result.status === "already_verified"
        ? "This email is already verified. You can log in."
        : result.status === "sent"
          ? "A new verification link was accepted for delivery."
          : "If the address has an unverified account, a new link will be sent.");
    } catch (err) {
      setResendMessage(err instanceof ApiError ? err.message : "Unable to resend the verification email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title={checkEmail ? "Check your email" : "Create your account"}
      subtitle={checkEmail ? `We sent a verification link to ${values.email}. Open it to activate your account.` : "Set up StockSense for your team in under a minute."}
    >
      {checkEmail ? (
        <div className="space-y-4">
          <div className="rounded-md border border-steel-200 bg-steel-100 p-4 text-sm text-steel-400">
            Your account will be ready after you verify your email address.
          </div>
          <Button type="button" variant="secondary" isLoading={resending} onClick={handleResend} className="w-full">
            Resend verification email
          </Button>
          {resendMessage && <p role="status" className="text-sm text-steel-400">{resendMessage}</p>}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="text-sm text-signal-red bg-signal-red/5 border border-signal-red/20 rounded-md px-3 py-2">
              {formError}
            </div>
          )}
          <Input label="Full name" placeholder="Asha Rao" value={values.name} error={errors.name} onChange={(e) => setField("name", e.target.value)} onBlur={() => blurField("name")} />
          <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com" value={values.email} error={errors.email} onChange={(e) => setField("email", e.target.value)} onBlur={() => blurField("email")} />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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
          <Input
            label="Confirm password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={values.confirmPassword}
            error={errors.confirmPassword ?? (values.confirmPassword && values.confirmPassword !== values.password ? "Passwords do not match." : undefined)}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            onBlur={() => blurField("confirmPassword")}
            endAdornment={
              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="text-xs font-medium text-steel-500 hover:text-steel-700"
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            }
          />
          <Button type="submit" isLoading={submitting} className="w-full">
            Create account
          </Button>
        </form>
      )}
      {!checkEmail && showResend && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-steel-500">Email delivery was not confirmed. If your account was created, you can retry verification below.</p>
          <Button type="button" variant="secondary" isLoading={resending} onClick={handleResend} className="w-full">Retry verification email</Button>
          {resendMessage && <p role="status" className="text-sm text-steel-400">{resendMessage}</p>}
        </div>
      )}
      <p className="text-sm text-steel-500 mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-ink-900 font-medium hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useForm } from "@/hooks/useForm";
import { required, isEmail, isOtpFormat, minLength } from "@/utils/validators";
import * as authService from "@/services/authService";
import { useToast } from "@/context/ToastContext";
import { ApiError, USE_MOCKS } from "@/services/apiClient";

type Step = "request" | "verify";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("request");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm({ email: "" }, { email: [required("Email"), isEmail] });
  const resetForm = useForm(
    { otp: "", newPassword: "" },
    { otp: [required("Code"), isOtpFormat], newPassword: [required("New password"), minLength(8, "New password")] }
  );

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!emailForm.validateAll()) return;
    setSubmitting(true);
    try {
      await authService.requestPasswordReset(emailForm.values.email);
      showToast(`A 6-digit code was sent to ${emailForm.values.email}.`, "info");
      setStep("verify");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't send a reset code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!resetForm.validateAll()) return;
    setSubmitting(true);
    try {
      await authService.verifyOtpAndReset(emailForm.values.email, resetForm.values.otp, resetForm.values.newPassword);
      showToast("Password updated — log in with your new password.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "That code didn't work. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={step === "request" ? "Reset your password" : "Enter your code"}
      subtitle={step === "request" ? "We'll send a 6-digit verification code to your email." : `Sent to ${emailForm.values.email}.${USE_MOCKS ? " Demo code: 123456." : " Check your inbox."}`}
    >
      {formError && (
        <div role="alert" className="text-sm text-signal-red bg-signal-red/5 border border-signal-red/20 rounded-md px-3 py-2 mb-4">
          {formError}
        </div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequestOtp} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={emailForm.values.email}
            error={emailForm.errors.email}
            onChange={(e) => emailForm.setField("email", e.target.value)}
            onBlur={() => emailForm.blurField("email")}
          />
          <Button type="submit" isLoading={submitting} className="w-full">
            Send code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} noValidate className="space-y-4">
          <Input
            label="6-digit code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={resetForm.values.otp}
            error={resetForm.errors.otp}
            onChange={(e) => resetForm.setField("otp", e.target.value)}
            onBlur={() => resetForm.blurField("otp")}
          />
          <Input
            label="New password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            value={resetForm.values.newPassword}
            error={resetForm.errors.newPassword}
            onChange={(e) => resetForm.setField("newPassword", e.target.value)}
            onBlur={() => resetForm.blurField("newPassword")}
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
          <Button type="submit" isLoading={submitting} className="w-full">
            Reset password
          </Button>
          <button type="button" onClick={() => setStep("request")} className="text-xs text-steel-500 hover:text-ink-800 w-full text-center">
            Use a different email
          </button>
        </form>
      )}

      <p className="text-sm text-steel-500 mt-6 text-center">
        <Link to="/login" className="text-ink-900 font-medium hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthLayout>
  );
}

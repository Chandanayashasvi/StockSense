import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ApiError } from "@/services/apiClient";
import { resendVerification, verifyEmail } from "@/services/authService";

type VerificationState = "verifying" | "verified" | "already_verified" | "expired" | "invalid" | "service_error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerificationState>("verifying");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      setState("invalid");
      return () => { active = false; };
    }
    verifyEmail(token)
      .then((result) => { if (active) setState(result.status); })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 410) setState("expired");
        else if (error instanceof ApiError && error.status === 503) setState("service_error");
        else setState("invalid");
      });
    return () => { active = false; };
  }, [token]);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    setResending(true);
    setResendMessage(null);
    try {
      const result = await resendVerification(email);
      setResendMessage(result.status === "sent" ? "A new verification link was accepted for delivery." : "If an unverified account exists for that address, a new link will be sent.");
    } catch (error) {
      setResendMessage(error instanceof ApiError ? error.message : "Unable to resend the verification email.");
    } finally {
      setResending(false);
    }
  }

  const headings: Record<VerificationState, string> = {
    verifying: "Verifying your email",
    verified: "Email verified",
    already_verified: "Already verified",
    expired: "Link expired",
    invalid: "Link unavailable",
    service_error: "Email service unavailable",
  };
  const messages: Record<VerificationState, string> = {
    verifying: "Please wait while we confirm your address.",
    verified: "Your StockSense account is ready. You can now log in.",
    already_verified: "This email address has already been verified. You can log in.",
    expired: "This verification link has expired. Request a new link below.",
    invalid: "This verification link is invalid or has already been used.",
    service_error: "Email verification is temporarily unavailable. Please try again later.",
  };

  return (
    <AuthLayout title={headings[state]} subtitle={messages[state]}>
      {(state === "verified" || state === "already_verified") && (
        <Link to="/login" className="flex h-10 w-full items-center justify-center rounded-md bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Continue to login</Link>
      )}
      {state === "expired" && (
        <form onSubmit={handleResend} className="space-y-4">
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Button type="submit" isLoading={resending} className="w-full">Resend verification link</Button>
          {resendMessage && <p role="status" className="text-sm text-steel-400">{resendMessage}</p>}
        </form>
      )}
      {(state === "invalid" || state === "service_error") && <Link className="mt-4 block text-sm text-ink-900 underline" to="/signup">Return to signup</Link>}
    </AuthLayout>
  );
}
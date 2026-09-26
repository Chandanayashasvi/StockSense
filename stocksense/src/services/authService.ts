// Authentication and email verification use the real API outside explicit mock mode.

import { apiClient, USE_MOCKS, mockDelay, ApiError } from "./apiClient";
import { currentUser } from "./mockData";
import type { User } from "@/types";

const TOKEN_KEY = "stocksense_token";
const DEMO_OTP = "123456";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): Promise<User> {
  return apiClient.get<User>("/auth/me");
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  if (USE_MOCKS) {
    if (password.length < 6) throw new ApiError("Incorrect email or password.");
    const token = "mock-jwt-token";
    localStorage.setItem(TOKEN_KEY, token);
    return mockDelay({ user: { ...currentUser, email }, token }, 500);
  }
  const result = await apiClient.post<{ user: User; token: string }>("/auth/login", { email, password });
  localStorage.setItem(TOKEN_KEY, result.token);
  return result;
}

export async function signup(name: string, email: string, password: string): Promise<void> {
  if (USE_MOCKS) {
    throw new ApiError("Email verification requires the StockSense backend and configured SMTP.", 503);
  }
  await apiClient.post("/auth/signup", { name, email, password });
}

export async function resendVerification(email: string): Promise<{ status?: string }> {
  if (USE_MOCKS) throw new ApiError("Email verification requires the StockSense backend and configured SMTP.", 503);
  return apiClient.post<{ status?: string }>("/auth/resend-verification", { email });
}

export async function verifyEmail(token: string): Promise<{ status: "verified" | "already_verified" }> {
  if (USE_MOCKS) throw new ApiError("Email verification requires the StockSense backend.", 503);
  return apiClient.post<{ status: "verified" | "already_verified" }>("/auth/verify-email", { token });
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (USE_MOCKS) return mockDelay(undefined, 500);
  return apiClient.post("/auth/request-otp", { email });
}

export async function verifyOtpAndReset(email: string, otp: string, newPassword: string): Promise<void> {
  if (USE_MOCKS) {
    if (otp !== DEMO_OTP) throw new ApiError("That code is incorrect or has expired.");
    if (newPassword.length < 8) throw new ApiError("Password must be at least 8 characters.");
    return mockDelay(undefined, 500);
  }
  return apiClient.post("/auth/reset-password", { email, otp, newPassword });
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

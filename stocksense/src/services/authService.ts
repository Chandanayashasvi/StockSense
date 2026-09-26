// Authentication: sign up, log in, OTP-based password reset. In mock mode
// any well-formed credentials succeed and a fixed demo OTP (123456) is
// accepted, so the whole flow is demo-able with no backend running.

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

export async function signup(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
  if (USE_MOCKS) {
    const token = "mock-jwt-token";
    localStorage.setItem(TOKEN_KEY, token);
    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return mockDelay({ user: { ...currentUser, name, email, avatarInitials: initials }, token }, 500);
  }
  const result = await apiClient.post<{ user: User; token: string }>("/auth/signup", { name, email, password });
  localStorage.setItem(TOKEN_KEY, result.token);
  return result;
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

// Thin fetch wrapper: every API call in the app goes through here, so
// base URL, auth headers, timeouts and error shaping live in one place
// instead of being scattered across components (see playbook §5).

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
export const API_ORIGIN = new URL(BASE_URL).origin;
const TIMEOUT_MS = 10000;

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("stocksense_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...authHeaders(),
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      let message = `Request failed with status ${res.status}`;
      try {
        const body = await res.json();
        message = body.message ?? message;
      } catch {
        // response had no JSON body — keep the default message
      }
      throw new ApiError(message, res.status);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The request timed out. Check your connection and try again.");
    }
    throw new ApiError("Network error — is the backend reachable?");
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, body: FormData) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Central switch: true while there's no backend yet. Every service checks
// this flag and calls the matching mock function instead of apiClient.
// Flip VITE_USE_MOCKS=false once real endpoints exist — no component changes.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

// Simulated network latency so loading states are visible/testable in mock mode.
export function mockDelay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

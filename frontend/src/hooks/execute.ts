/**
 * execute.ts - Code execution via the Go backend
 *
 * Sends code to the self-hosted Go backend for execution.
 * Returns consistent RunOutput format.
 */

import type { Language, RunOutput } from "../types";

/** Primary backend API URL - use relative path in production */
const API_URL = import.meta.env.VITE_API_URL || "";

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 30000;

/**
 * Execution payload for code execution.
 */
export interface ExecutePayload {
  language: Language;
  code: string;
  stdin?: string;
}

/**
 * Execution result with source information.
 */
export interface ExecuteResult extends RunOutput {
  /** Which backend was used */
  source: "primary" | "offline";
  /** Whether execution was successful (no errors) */
  success: boolean;
}

/**
 * Check if the primary backend is healthy.
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${API_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Execute code using the Go backend.
 */
async function executePrimary(payload: ExecutePayload): Promise<ExecuteResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_URL}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: payload.language,
        code: payload.code,
        stdin: payload.stdin || "",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      source: "primary",
      success: !data.stderr,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Execute code on the self-hosted backend.
 *
 * 1. Check if browser is online
 * 2. Check if backend is healthy
 * 3. Execute on primary backend
 * 4. If unavailable, return error with instructions
 *
 * @param payload - Code execution payload
 * @returns ExecuteResult with output and source info
 */
export async function executeCode(
  payload: ExecutePayload,
): Promise<ExecuteResult> {
  // Check if browser is online
  if (!navigator.onLine) {
    return {
      stdout: "",
      stderr: "You are offline. Please check your internet connection.",
      source: "offline",
      success: false,
    };
  }

  // Check backend health and execute
  const isBackendHealthy = await checkBackendHealth();

  if (isBackendHealthy) {
    try {
      return await executePrimary(payload);
    } catch {
      // Primary failed after health check passed — transient error
    }
  }

  return {
    stdout: "",
    stderr:
      "Unable to execute code.\n\n" +
      "The backend server is unavailable.\n\n" +
      "Make sure it's running:\n" +
      "  cd backend && go run main.go\n\n" +
      "The server should be listening on http://localhost:8080",
    source: "offline",
    success: false,
  };
}

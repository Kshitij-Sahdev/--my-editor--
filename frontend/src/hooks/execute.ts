/**
 * execute.ts - Code execution with fallback support
 *
 * Provides code execution that:
 * - First attempts to use the primary Go backend
 * - Falls back to Judge0 public API if backend is unavailable
 * - Returns consistent RunOutput format regardless of source
 */

import type { Language, RunOutput } from "../types";

/** Primary backend API URL - use relative path in production */
const API_URL = import.meta.env.VITE_API_URL || "";

/** Judge0 API URL */
const JUDGE0_API = import.meta.env.VITE_JUDGE0_API || "https://judge0-ce.p.rapidapi.com";

/** Judge0 API Key (set via environment variable) */
const JUDGE0_API_KEY = import.meta.env.VITE_JUDGE0_API_KEY || "";

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT = 30000;

/**
 * Judge0 language IDs mapping.
 * See: https://ce.judge0.com/languages
 */
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71,      // Python 3.8.1
  cpp: 54,         // C++ (GCC 9.2.0)
  java: 62,        // Java (OpenJDK 13.0.1)
  go: 60,          // Go 1.13.5
  javascript: 63,  // JavaScript (Node.js 12.14.0)
};

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
  source: "primary" | "judge0" | "offline";
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
 * Execute code using the primary Go backend.
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
 * Execute code using Judge0 API as fallback.
 * Note: Requires RapidAPI key for production use.
 * Using public endpoint for demo purposes.
 */
async function executeJudge0(payload: ExecutePayload): Promise<ExecuteResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[payload.language];

  if (!languageId) {
    return {
      stdout: "",
      stderr: `Language "${payload.language}" is not supported by Judge0 fallback.`,
      source: "judge0",
      success: false,
    };
  }

  try {
    // Build headers - include API key if available
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (JUDGE0_API_KEY) {
      headers["X-RapidAPI-Key"] = JUDGE0_API_KEY;
      headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com";
    }

    // Submit code for execution
    const submitResponse = await fetch(`${JUDGE0_API}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        language_id: languageId,
        source_code: btoa(payload.code), // Base64 encode
        stdin: payload.stdin ? btoa(payload.stdin) : "",
      }),
    });

    if (!submitResponse.ok) {
      // Judge0 not available (likely needs API key)
      throw new Error("Judge0 API unavailable");
    }

    const result = await submitResponse.json();

    // Decode base64 output
    const stdout = result.stdout ? atob(result.stdout) : "";
    const stderr = result.stderr ? atob(result.stderr) : "";
    const compileOutput = result.compile_output ? atob(result.compile_output) : "";

    return {
      stdout,
      stderr: stderr || compileOutput,
      source: "judge0",
      success: result.status?.id === 3, // 3 = Accepted
    };
  } catch {
    throw new Error("Judge0 fallback failed");
  }
}

/**
 * Execute code with automatic fallback.
 *
 * 1. Check if primary backend is healthy
 * 2. If healthy, use primary backend
 * 3. If not healthy, try Judge0 fallback
 * 4. If both fail, return offline error
 *
 * @param payload - Code execution payload
 * @param forceBackend - Force specific backend ("primary" | "judge0")
 * @returns ExecuteResult with output and source info
 */
export async function executeCode(
  payload: ExecutePayload,
  forceBackend?: "primary" | "judge0"
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

  // Force specific backend if requested
  if (forceBackend === "primary") {
    return executePrimary(payload);
  }

  if (forceBackend === "judge0") {
    return executeJudge0(payload);
  }

  // Try primary backend first
  const isBackendHealthy = await checkBackendHealth();

  if (isBackendHealthy) {
    try {
      return await executePrimary(payload);
    } catch {
      // Primary failed, try fallback silently
    }
  }

  // Try Judge0 fallback
  try {
    return await executeJudge0(payload);
  } catch {
    // Both failed
    return {
      stdout: "",
      stderr:
        "Unable to execute code.\n\n" +
        "Primary backend is unavailable and Judge0 fallback failed.\n\n" +
        "To use the primary backend, make sure it's running:\n" +
        "  cd backend && go run main.go\n\n" +
        "The server should be listening on http://localhost:8080",
      source: "offline",
      success: false,
    };
  }
}

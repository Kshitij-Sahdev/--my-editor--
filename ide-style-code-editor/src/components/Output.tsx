/**
 * Output.tsx - Code execution output panel
 *
 * Displays the stdout and stderr from code execution.
 * Features:
 * - Success/error status indicator
 * - Clear button to dismiss the panel
 * - Colored output (green for stdout, red for stderr)
 * - Monospace font for proper code output rendering
 */

"use client";

import { X, Terminal, CheckCircle, XCircle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface OutputProps {
  /** Standard output from the executed code */
  stdout: string;
  /** Standard error (compilation errors, runtime errors, etc.) */
  stderr: string;
  /** Callback to clear/dismiss the output panel */
  onClear: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function Output({ stdout, stderr, onClear }: OutputProps) {
  /** Whether there's any output to display */
  const hasOutput = stdout || stderr;

  /** Whether there were errors in execution */
  const hasError = !!stderr;

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-t border-[var(--color-border)]">
      {/* Output header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]">
        <div className="flex items-center gap-3">
          {/* Terminal icon */}
          <Terminal size={14} className="text-[var(--color-text-muted)]" />

          {/* Title */}
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Output
          </span>

          {/* Status badge */}
          {hasOutput && (
            <div className="flex items-center gap-1.5 animate-scale-in">
              {hasError ? (
                // Error status
                <>
                  <XCircle size={12} className="text-[var(--color-error)]" />
                  <span className="text-[10px] font-semibold text-[var(--color-error)]">
                    Error
                  </span>
                </>
              ) : (
                // Success status
                <>
                  <CheckCircle
                    size={12}
                    className="text-[var(--color-success)]"
                  />
                  <span className="text-[10px] font-semibold text-[var(--color-success)]">
                    Success
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Clear button */}
        <button
          onClick={onClear}
          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer transition-all"
          title="Clear output"
        >
          <X size={14} />
        </button>
      </div>

      {/* Output content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
        {/* Standard output (green) */}
        {stdout && (
          <pre className="text-[var(--color-success)] whitespace-pre-wrap break-words animate-fade-in">
            {stdout}
          </pre>
        )}

        {/* Standard error (red) */}
        {stderr && (
          <pre
            className={`text-[var(--color-error)] whitespace-pre-wrap break-words animate-fade-in ${stdout ? "mt-3 pt-3 border-t border-[var(--color-border-subtle)]" : ""}`}
          >
            {stderr}
          </pre>
        )}

        {/* Empty state (shouldn't happen, but just in case) */}
        {!hasOutput && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] animate-pulse">
            <span>Waiting for output...</span>
          </div>
        )}
      </div>
    </div>
  );
}

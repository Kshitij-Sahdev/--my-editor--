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
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px 10px 48px',
    borderBottom: '1px solid var(--color-border-subtle)',
    backgroundColor: 'var(--color-surface-2)',
  } as React.CSSProperties,
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  terminalIcon: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  title: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  } as React.CSSProperties,
  statusText: {
    fontSize: '10px',
    fontWeight: 600,
  } as React.CSSProperties,
  errorStatus: {
    color: 'var(--color-error)',
  } as React.CSSProperties,
  successStatus: {
    color: 'var(--color-success)',
  } as React.CSSProperties,
  clearButton: {
    padding: '6px',
    color: 'var(--color-text-muted)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    lineHeight: 1.6,
  } as React.CSSProperties,
  stdout: {
    color: 'var(--color-success)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  } as React.CSSProperties,
  stderr: {
    color: 'var(--color-error)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    margin: 0,
  } as React.CSSProperties,
  stderrWithMargin: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  waiting: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function Output({ stdout, stderr, onClear }: OutputProps) {
  /** Whether there's any output to display */
  const hasOutput = stdout || stderr;

  /** Whether there were errors in execution */
  const hasError = !!stderr;

  return (
    <div style={styles.container}>
      {/* Output header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {/* Terminal icon */}
          <Terminal size={14} style={styles.terminalIcon} />

          {/* Title */}
          <span style={styles.title}>
            Output
          </span>

          {/* Status badge */}
          {hasOutput && (
            <div style={styles.statusBadge} className="animate-scale-in">
              {hasError ? (
                // Error status
                <>
                  <XCircle size={12} style={styles.errorStatus} />
                  <span style={{ ...styles.statusText, ...styles.errorStatus }}>
                    Error
                  </span>
                </>
              ) : (
                // Success status
                <>
                  <CheckCircle size={12} style={styles.successStatus} />
                  <span style={{ ...styles.statusText, ...styles.successStatus }}>
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
          style={styles.clearButton}
          title="Clear output"
        >
          <X size={14} />
        </button>
      </div>

      {/* Output content */}
      <div style={styles.content}>
        {/* Standard output (green) */}
        {stdout && (
          <pre style={styles.stdout} className="animate-fade-in">
            {stdout}
          </pre>
        )}

        {/* Standard error (red) */}
        {stderr && (
          <pre
            style={{
              ...styles.stderr,
              ...(stdout ? styles.stderrWithMargin : {}),
            }}
            className="animate-fade-in"
          >
            {stderr}
          </pre>
        )}

        {/* Empty state (shouldn't happen, but just in case) */}
        {!hasOutput && (
          <div style={styles.waiting} className="animate-pulse">
            <span>Waiting for output...</span>
          </div>
        )}
      </div>
    </div>
  );
}

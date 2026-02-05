/**
 * StatusBar.tsx - Fixed bottom status bar
 *
 * Always stays at the absolute bottom of the viewport.
 * Shows: language, encoding, run shortcut.
 * Completely independent of Editor and overlay panels.
 */

import type { Language } from "../types";
import { RUNNABLE_LANGUAGES, LANGUAGE_LABELS } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface StatusBarProps {
  /** Current file language */
  language: Language | null;
  /** Whether a file is currently open */
  hasFile: boolean;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  statusBar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    backgroundColor: 'var(--color-surface-2)',
    borderTop: '1px solid var(--color-border)',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    zIndex: 100, // Above everything
    userSelect: 'none',
  } as React.CSSProperties,
  statusBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  statusBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  statusKbd: {
    padding: '2px 6px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '10px',
  } as React.CSSProperties,
  warningText: {
    color: 'var(--color-warning)',
  } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function StatusBar({ language, hasFile }: StatusBarProps) {
  const isRunnable = language ? RUNNABLE_LANGUAGES.includes(language) : false;

  return (
    <div style={styles.statusBar}>
      <div style={styles.statusBarLeft}>
        {hasFile && language ? (
          <>
            <span>{LANGUAGE_LABELS[language]}</span>
            {!isRunnable && (
              <span style={styles.warningText}>
                Plain text mode - no execution
              </span>
            )}
          </>
        ) : (
          <span>No file open</span>
        )}
      </div>
      <div style={styles.statusBarRight}>
        {hasFile && isRunnable && (
          <span>
            Run:{" "}
            <kbd style={styles.statusKbd}>Ctrl+Enter</kbd>
          </span>
        )}
        <span>UTF-8</span>
      </div>
    </div>
  );
}

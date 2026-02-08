/**
 * Header.tsx - Top navigation bar
 *
 * Displays the app logo/name and the primary "Run Code" button.
 * On mobile/portrait mode, also shows toggle buttons for Files and Output panels.
 * The run button:
 * - Is disabled when no runnable file is selected
 * - Shows a spinner while code is executing
 * - Has keyboard shortcut hint (Ctrl+Enter)
 */

"use client";

import { Play, Terminal, FolderOpen, TerminalSquare } from "lucide-react";
import type { FileItem } from "../types";
import { RUNNABLE_LANGUAGES } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface HeaderProps {
  /** Currently active file (null if none selected) */
  activeFile: FileItem | null;
  /** Callback to run the current file's code */
  onRun: () => void;
  /** Whether code is currently being executed */
  isRunning: boolean;
  /** Whether the app is offline/disconnected */
  isOffline?: boolean;
  /** Whether the app is in mobile/portrait mode */
  isMobile?: boolean;
  /** Whether sidebar is visible (for mobile toggle) */
  sidebarVisible?: boolean;
  /** Toggle sidebar visibility (for mobile) */
  onToggleSidebar?: () => void;
  /** Whether output is visible (for mobile toggle) */
  outputVisible?: boolean;
  /** Toggle output visibility (for mobile) */
  onToggleOutput?: () => void;
  /** Whether output exists (to show output button) */
  hasOutput?: boolean;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--spacing-md, 20px)',
    height: '56px',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
    gap: 'var(--spacing-md, 16px)',
  } as React.CSSProperties,
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  logoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    backgroundColor: 'var(--color-accent-subtle)',
    transition: 'transform 0.2s',
  } as React.CSSProperties,
  logoIconInner: {
    color: 'var(--color-accent)',
  } as React.CSSProperties,
  logoText: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  logoName: {
    fontWeight: 700,
    fontSize: 'var(--font-size-base, 14px)',
    color: 'var(--color-accent)',
    letterSpacing: '-0.025em',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  logoVersion: {
    fontSize: 'var(--font-size-xs, 10px)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  // Mobile toggle buttons container
  mobileControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm, 8px)',
  } as React.CSSProperties,
  // Right side controls (run button + mobile toggles)
  rightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm, 8px)',
  } as React.CSSProperties,
  runButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: 'var(--font-size-base, 14px)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  } as React.CSSProperties,
  runButtonEnabled: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
  } as React.CSSProperties,
  runButtonDisabled: {
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text-muted)',
    cursor: 'not-allowed',
    opacity: 0.5,
  } as React.CSSProperties,
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTopColor: 'white',
    borderRadius: '50%',
  } as React.CSSProperties,
  playIcon: {
  } as React.CSSProperties,
  buttonText: {
  } as React.CSSProperties,
  kbd: {
    display: 'none',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 8px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: 'var(--font-size-xs, 10px)',
    fontFamily: 'var(--font-mono)',
    backdropFilter: 'blur(4px)',
  } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function Header({ 
  activeFile, 
  onRun, 
  isRunning,
  isOffline = false,
  isMobile = false,
  sidebarVisible = false,
  onToggleSidebar,
  outputVisible = false,
  onToggleOutput,
  hasOutput = false,
}: HeaderProps) {
  /**
   * Check if the current file's language can be executed.
   * Only Python, C++, Java, Go, and JavaScript are runnable.
   */
  const canRun = activeFile && RUNNABLE_LANGUAGES.includes(activeFile.language);

  return (
    <header style={styles.header}>
      {/* Left side: Logo and app name */}
      <div style={styles.logoContainer}>
        <div style={styles.logoContainer}>
          {/* Logo icon */}
          <div style={styles.logoIcon} className="hover-lift">
            <Terminal size={20} style={styles.logoIconInner} />
          </div>

          {/* App name */}
          <div style={styles.logoText}>
            <span style={styles.logoName}>
              run()
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Mobile controls + Run button */}
      <div style={styles.rightControls}>
        {/* Mobile toggle buttons - only visible on mobile/portrait */}
        {isMobile && (
          <div style={styles.mobileControls} className="mobile-only">
            {/* Files toggle button */}
            <button
              onClick={onToggleSidebar}
              className={`mobile-toggle-btn ${sidebarVisible ? 'active' : ''}`}
              title="Toggle Files"
              aria-label="Toggle file explorer"
            >
              <FolderOpen size={20} />
            </button>

            {/* Output toggle button - only show if there's output */}
            {hasOutput && (
              <button
                onClick={onToggleOutput}
                className={`mobile-toggle-btn ${outputVisible ? 'active' : ''}`}
                title="Toggle Output"
                aria-label="Toggle output panel"
              >
                <TerminalSquare size={20} />
              </button>
            )}
          </div>
        )}

        {/* Offline indicator */}
        {isOffline && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'var(--color-warning-subtle)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--color-warning)',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{ fontSize: '14px' }}>⚡</span>
            <span>Offline</span>
          </div>
        )}

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={isRunning || !canRun}
          style={{
            ...styles.runButton,
            ...(canRun && !isRunning ? styles.runButtonEnabled : styles.runButtonDisabled),
          }}
          className={canRun && !isRunning ? 'hover-lift' : ''}
          title={isOffline ? 'Running with fallback (backend unavailable)' : undefined}
        >
          {isRunning ? (
            // Spinning loader while executing
            <span style={styles.spinner} className="animate-spin" />
          ) : (
            // Play icon with glow
            <Play size={16} fill="currentColor" style={styles.playIcon} />
          )}
          <span style={styles.buttonText}>{isRunning ? "Running..." : "Run"}</span>

          {/* Keyboard shortcut hint - hide on mobile */}
          {canRun && !isRunning && !isMobile && (
            <kbd style={{ ...styles.kbd, display: 'inline-flex' }}>
              ⌘↵
            </kbd>
          )}
        </button>
      </div>
    </header>
  );
}

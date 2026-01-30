/**
 * Header.tsx - Top navigation bar
 *
 * Displays the app logo/name and the primary "Run Code" button.
 * The run button:
 * - Is disabled when no runnable file is selected
 * - Shows a spinner while code is executing
 * - Has keyboard shortcut hint (Ctrl+Enter)
 */

"use client";

import { Play, Terminal } from "lucide-react";
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
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function Header({ activeFile, onRun, isRunning }: HeaderProps) {
  /**
   * Check if the current file's language can be executed.
   * Only Python, C++, Java, Go, and JavaScript are runnable.
   */
  const canRun = activeFile && RUNNABLE_LANGUAGES.includes(activeFile.language);

  return (
    <header className="flex items-center justify-between px-5 h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
      {/* Left side: Logo and app name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          {/* Logo icon */}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--color-accent-subtle)] transition-transform hover:scale-110 hover:rotate-3 active:scale-95">
            <Terminal size={20} className="text-[var(--color-accent)] drop-shadow-[0_0_8px_var(--color-accent)]" />
          </div>

          {/* App name and version */}
          <div className="flex flex-col">
            <span className="font-bold text-sm text-[var(--color-accent)] tracking-tight font-mono drop-shadow-[0_0_10px_var(--color-accent)]">
              run()
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
              v2.0
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Run button */}
      <button
        onClick={onRun}
        disabled={isRunning || !canRun}
        className={`
          flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold 
          cursor-pointer transition-all duration-200
          ${
            canRun && !isRunning
              ? "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover-lift"
              : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] cursor-not-allowed opacity-50"
          }
        `}
      >
        {isRunning ? (
          // Spinning loader while executing
          <span className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
        ) : (
          // Play icon with glow
          <Play size={16} fill="currentColor" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.5)]" />
        )}
        <span className="drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">{isRunning ? "Running..." : "Run"}</span>

        {/* Keyboard shortcut hint */}
        {canRun && !isRunning && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 bg-white/20 rounded-md text-[10px] font-mono backdrop-blur-sm">
            ⌘↵
          </kbd>
        )}
      </button>
    </header>
  );
}

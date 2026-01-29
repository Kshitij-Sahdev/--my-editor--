/**
 * History.tsx - Version control / commit history panel
 *
 * Displays the commit history for the currently selected file.
 * Features:
 * - Create new commits with messages
 * - View timeline of previous commits
 * - Expand commits to preview content
 * - Restore file to any previous commit
 * - Shows "modified" indicator when there are uncommitted changes
 */

"use client";

import { useState } from "react";
import {
  GitCommit,
  RotateCcw,
  Plus,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
} from "lucide-react";
import type { Commit, FileItem } from "../types";
import { getFileCommits } from "../storage";

// =============================================================================
// TYPES
// =============================================================================

interface HistoryProps {
  /** All commits in the system */
  commits: Commit[];
  /** Currently selected file (null if none) */
  activeFile: FileItem | null;
  /** Current content in the editor */
  currentContent: string;
  /** Callback to create a new commit */
  onCommit: (message: string) => void;
  /** Callback to restore content from a commit */
  onRestore: (commit: Commit) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format a timestamp into a human-readable relative or absolute time.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "Just now", "5m ago", "2h ago", or "Jan 15"
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  // Less than 1 minute
  if (diff < 60000) return "Just now";

  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;

  // Less than 24 hours
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  // Same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Older - show date
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function History({
  commits,
  activeFile,
  currentContent,
  onCommit,
  onRestore,
}: HistoryProps) {
  /** Commit message input */
  const [message, setMessage] = useState("");

  /** ID of the expanded commit (for preview) */
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  // Get commits for the current file, sorted newest first
  const fileCommits = activeFile ? getFileCommits(commits, activeFile.id) : [];

  /**
   * Determine if there are uncommitted changes.
   * Compares current content with the latest commit (or original content).
   */
  const hasChanges =
    activeFile && fileCommits.length > 0
      ? currentContent !== fileCommits[0].content
      : activeFile && currentContent !== activeFile.content;

  /**
   * Handle creating a new commit.
   */
  const handleCommit = () => {
    if (!message.trim() || !hasChanges) return;
    onCommit(message.trim());
    setMessage("");
  };

  // ---------------------------------------------------------------------------
  // NO FILE SELECTED STATE
  // ---------------------------------------------------------------------------

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <GitCommit size={14} className="text-[var(--color-text-muted)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Version Control
          </span>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <FileText
            size={40}
            className="text-[var(--color-text-muted)] mb-4"
          />
          <p className="text-[var(--color-text-muted)] text-sm">
            Select a file to view its history
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <div className="flex items-center gap-2">
          <GitCommit size={14} className="text-[var(--color-text-muted)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Commits
          </span>
          {/* Commit count badge */}
          <span className="px-1.5 py-0.5 bg-[var(--color-surface-hover)] rounded text-[10px] font-mono text-[var(--color-text-muted)]">
            {fileCommits.length}
          </span>
        </div>
      </div>

      {/* Commit form */}
      <div className="p-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCommit();
          }}
          placeholder="Describe your changes..."
          className="w-full px-3 py-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] font-mono mb-2 transition-colors"
        />
        <button
          onClick={handleCommit}
          disabled={!message.trim() || !hasChanges}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white cursor-pointer transition-all hover-lift"
        >
          <Plus size={14} />
          Commit Changes
          {/* Modified indicator */}
          {hasChanges && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] animate-scale-in">
              modified
            </span>
          )}
        </button>
      </div>

      {/* Commit list */}
      <div className="flex-1 overflow-auto">
        {fileCommits.length === 0 ? (
          // Empty state - no commits yet
          <div className="px-4 py-12 text-center animate-fade-in">
            <GitCommit
              size={28}
              className="text-[var(--color-text-muted)] mx-auto mb-4"
            />
            <p className="text-[var(--color-text-muted)] text-sm mb-1">
              No commits yet
            </p>
            <p className="text-[var(--color-text-muted)] text-xs">
              Make changes and commit them above
            </p>
          </div>
        ) : (
          // Commit timeline
          <div className="py-2">
            {fileCommits.map((commit, index) => (
              <div key={commit.id} className="relative">
                {/* Commit row */}
                <div
                  className="group flex items-start gap-3 px-4 py-3 hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
                  onClick={() =>
                    setExpandedCommit(
                      expandedCommit === commit.id ? null : commit.id
                    )
                  }
                >
                  {/* Timeline dot and line */}
                  <div className="relative flex flex-col items-center pt-0.5">
                    {/* Dot - highlighted for most recent commit */}
                    <div
                      className={`w-3 h-3 rounded-full border-2 transition-all ${
                        index === 0
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    />
                    {/* Connecting line to next commit */}
                    {index < fileCommits.length - 1 && (
                      <div className="absolute top-4 w-0.5 h-[calc(100%+8px)] bg-[var(--color-border)]" />
                    )}
                  </div>

                  {/* Commit content */}
                  <div className="flex-1 min-w-0">
                    {/* Expand chevron + message */}
                    <div className="flex items-center gap-2 mb-1">
                      {expandedCommit === commit.id ? (
                        <ChevronDown
                          size={12}
                          className="text-[var(--color-text-muted)] shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={12}
                          className="text-[var(--color-text-muted)] shrink-0"
                        />
                      )}
                      <p className="text-sm text-[var(--color-text)] truncate font-medium">
                        {commit.message}
                      </p>
                    </div>
                    {/* Timestamp */}
                    <div className="flex items-center gap-2 ml-5">
                      <Clock
                        size={10}
                        className="text-[var(--color-text-muted)]"
                      />
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                        {formatTime(commit.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Restore button (shown on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(commit);
                    }}
                    className="hidden group-hover:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] rounded-lg cursor-pointer transition-colors"
                    title="Restore this version"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>

                {/* Expanded preview */}
                {expandedCommit === commit.id && (
                  <div className="mx-4 mb-3 ml-10 p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border-subtle)] animate-slide-down">
                    <pre className="text-xs text-[var(--color-text-secondary)] font-mono overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                      {commit.content.slice(0, 1000)}
                      {commit.content.length > 1000 && (
                        <span className="text-[var(--color-text-muted)]">
                          {"\n"}... ({commit.content.length - 1000} more chars)
                        </span>
                      )}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

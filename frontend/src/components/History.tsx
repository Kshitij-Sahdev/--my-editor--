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
  /** Content at last commit or when file was loaded (baseline for change detection) */
  savedContent: string;
  /** Callback to create a new commit */
  onCommit: (message: string) => void;
  /** Callback to restore content from a commit */
  onRestore: (commit: Commit) => void;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  headerIcon: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  headerTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  badge: {
    padding: '2px 6px',
    backgroundColor: 'var(--color-surface-hover)',
    borderRadius: '4px',
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  commitForm: {
    padding: '12px',
    borderBottom: '1px solid var(--color-border-subtle)',
    backgroundColor: 'var(--color-surface-2)',
  } as React.CSSProperties,
  commitInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    marginBottom: '8px',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  commitButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: 'var(--color-accent)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  } as React.CSSProperties,
  commitButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  modifiedBadge: {
    padding: '2px 6px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    fontSize: '10px',
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflow: 'auto',
  } as React.CSSProperties,
  emptyState: {
    padding: '48px 16px',
    textAlign: 'center',
  } as React.CSSProperties,
  emptyIcon: {
    color: 'var(--color-text-muted)',
    margin: '0 auto 16px',
  } as React.CSSProperties,
  emptyText: {
    color: 'var(--color-text-muted)',
    fontSize: '14px',
    marginBottom: '4px',
  } as React.CSSProperties,
  emptySubtext: {
    color: 'var(--color-text-muted)',
    fontSize: '12px',
  } as React.CSSProperties,
  commitList: {
    padding: '8px 0',
  } as React.CSSProperties,
  commitRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  timeline: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '2px',
  } as React.CSSProperties,
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  timelineDotRecent: {
    borderColor: 'var(--color-accent)',
    backgroundColor: 'var(--color-accent)',
  } as React.CSSProperties,
  timelineDotOld: {
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-surface)',
  } as React.CSSProperties,
  timelineLine: {
    position: 'absolute',
    top: '16px',
    width: '2px',
    height: 'calc(100% + 8px)',
    backgroundColor: 'var(--color-border)',
  } as React.CSSProperties,
  commitContent: {
    flex: 1,
    minWidth: 0,
  } as React.CSSProperties,
  commitHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  } as React.CSSProperties,
  chevronIcon: {
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  } as React.CSSProperties,
  commitMessage: {
    fontSize: '14px',
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  } as React.CSSProperties,
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '20px',
  } as React.CSSProperties,
  timestampIcon: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  timestampText: {
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  restoreButton: {
    display: 'none',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  preview: {
    margin: '0 16px 12px 40px',
    padding: '12px',
    backgroundColor: 'var(--color-bg)',
    borderRadius: '8px',
    border: '1px solid var(--color-border-subtle)',
  } as React.CSSProperties,
  previewCode: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-mono)',
    overflow: 'auto',
    maxHeight: '192px',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    margin: 0,
  } as React.CSSProperties,
  previewMore: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
};

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
  savedContent,
  onCommit,
  onRestore,
}: HistoryProps) {
  /** Commit message input */
  const [message, setMessage] = useState("");

  /** ID of the expanded commit (for preview) */
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  /** Currently hovered commit ID */
  const [hoveredCommit, setHoveredCommit] = useState<string | null>(null);

  // Get commits for the current file, sorted newest first
  const fileCommits = activeFile ? getFileCommits(commits, activeFile.id) : [];

  /**
   * Determine if there are uncommitted changes.
   * Compares current content with the saved content (last commit or original file content).
   */
  const hasChanges = activeFile && currentContent !== savedContent;

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
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <GitCommit size={14} style={styles.headerIcon} />
            <span style={styles.headerTitle}>
              Version Control
            </span>
          </div>
        </div>

        {/* Empty state */}
        <div style={styles.emptyState} className="animate-fade-in">
          <FileText size={40} style={styles.emptyIcon} />
          <p style={styles.emptyText}>
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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <GitCommit size={14} style={styles.headerIcon} />
          <span style={styles.headerTitle}>
            Commits
          </span>
          {/* Commit count badge */}
          <span style={styles.badge}>
            {fileCommits.length}
          </span>
        </div>
      </div>

      {/* Commit form */}
      <div style={styles.commitForm}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCommit();
          }}
          placeholder="Describe your changes..."
          style={styles.commitInput}
        />
        <button
          onClick={handleCommit}
          disabled={!message.trim() || !hasChanges}
          style={{
            ...styles.commitButton,
            ...(!message.trim() || !hasChanges ? styles.commitButtonDisabled : {}),
          }}
          className="hover-lift"
        >
          <Plus size={14} />
          Commit Changes
          {/* Modified indicator */}
          {hasChanges && (
            <span style={styles.modifiedBadge} className="animate-scale-in">
              modified
            </span>
          )}
        </button>
      </div>

      {/* Commit list */}
      <div style={styles.content}>
        {fileCommits.length === 0 ? (
          // Empty state - no commits yet
          <div style={styles.emptyState} className="animate-fade-in">
            <GitCommit size={28} style={styles.emptyIcon} />
            <p style={styles.emptyText}>
              No commits yet
            </p>
            <p style={styles.emptySubtext}>
              Make changes and commit them above
            </p>
          </div>
        ) : (
          // Commit timeline
          <div style={styles.commitList}>
            {fileCommits.map((commit, index) => (
              <div key={commit.id} style={{ position: 'relative' }}>
                {/* Commit row */}
                <div
                  style={{
                    ...styles.commitRow,
                    backgroundColor: hoveredCommit === commit.id ? 'var(--color-surface-hover)' : 'transparent',
                  }}
                  onMouseEnter={() => setHoveredCommit(commit.id)}
                  onMouseLeave={() => setHoveredCommit(null)}
                  onClick={() =>
                    setExpandedCommit(
                      expandedCommit === commit.id ? null : commit.id
                    )
                  }
                >
                  {/* Timeline dot and line */}
                  <div style={styles.timeline}>
                    {/* Dot - highlighted for most recent commit */}
                    <div
                      style={{
                        ...styles.timelineDot,
                        ...(index === 0 ? styles.timelineDotRecent : styles.timelineDotOld),
                      }}
                    />
                    {/* Connecting line to next commit */}
                    {index < fileCommits.length - 1 && (
                      <div style={styles.timelineLine} />
                    )}
                  </div>

                  {/* Commit content */}
                  <div style={styles.commitContent}>
                    {/* Expand chevron + message */}
                    <div style={styles.commitHeader}>
                      {expandedCommit === commit.id ? (
                        <ChevronDown size={12} style={styles.chevronIcon} />
                      ) : (
                        <ChevronRight size={12} style={styles.chevronIcon} />
                      )}
                      <p style={styles.commitMessage}>
                        {commit.message}
                      </p>
                    </div>
                    {/* Timestamp */}
                    <div style={styles.timestamp}>
                      <Clock size={10} style={styles.timestampIcon} />
                      <span style={styles.timestampText}>
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
                    style={{
                      ...styles.restoreButton,
                      display: hoveredCommit === commit.id ? 'flex' : 'none',
                    }}
                    title="Restore this version"
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>
                </div>

                {/* Expanded preview */}
                {expandedCommit === commit.id && (
                  <div style={styles.preview} className="animate-slide-down">
                    <pre style={styles.previewCode}>
                      {commit.content.slice(0, 1000)}
                      {commit.content.length > 1000 && (
                        <span style={styles.previewMore}>
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

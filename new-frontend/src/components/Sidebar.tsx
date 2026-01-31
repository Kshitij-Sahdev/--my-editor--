/**
 * Sidebar.tsx - Left sidebar with file explorer and version control tabs
 *
 * Contains two tabs:
 * 1. Files - File tree for browsing/creating/deleting files and folders
 * 2. Git - Version history with commit/restore functionality
 *
 * The active tab is stored in local component state.
 */

"use client";

import { useState } from "react";
import { FolderTree, GitBranch } from "lucide-react";
import FileTree from "./FileTree";
import History from "./History";
import type { FileSystemItem, FileItem, Commit, Language } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface SidebarProps {
  /** All files and folders in the system */
  files: FileSystemItem[];
  /** All commits across all files */
  commits: Commit[];
  /** ID of the currently selected file */
  activeFileId: string | null;
  /** The currently selected file object (for History tab) */
  activeFile: FileItem | null;
  /** Current content in the editor (for change detection) */
  currentContent: string;
  /** Content at last commit or when file was loaded (baseline for change detection) */
  savedContent: string;
  /** Callback when a file is selected */
  onSelectFile: (id: string) => void;
  /** Callback to create a new file */
  onCreateFile: (name: string, language: Language, parentId: string | null) => void;
  /** Callback to create a new folder */
  onCreateFolder: (name: string, parentId: string | null) => void;
  /** Callback to delete a file or folder */
  onDeleteItem: (id: string) => void;
  /** Callback to toggle folder open/closed */
  onToggleFolder: (id: string) => void;
  /** Callback to commit changes */
  onCommit: (message: string) => void;
  /** Callback to restore a previous commit */
  onRestore: (commit: Commit) => void;
}

/** Available sidebar tabs */
type Tab = "files" | "history";

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--color-surface)',
  } as React.CSSProperties,
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--color-border)',
  } as React.CSSProperties,
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 16px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  tabActive: {
    color: 'var(--color-accent)',
    backgroundColor: 'var(--color-accent-subtle)',
  } as React.CSSProperties,
  tabInactive: {
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: 'var(--color-accent)',
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflow: 'hidden',
  } as React.CSSProperties,
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function Sidebar({
  files,
  commits,
  activeFileId,
  activeFile,
  currentContent,
  savedContent,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onToggleFolder,
  onCommit,
  onRestore,
}: SidebarProps) {
  /** Currently active tab */
  const [activeTab, setActiveTab] = useState<Tab>("files");

  return (
    <div style={styles.container}>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {/* Files tab */}
        <button
          onClick={() => setActiveTab("files")}
          style={{
            ...styles.tab,
            ...(activeTab === "files" ? styles.tabActive : styles.tabInactive),
          }}
        >
          <FolderTree size={14} />
          Files
          {/* Active indicator */}
          {activeTab === "files" && (
            <span style={styles.tabIndicator} />
          )}
        </button>

        {/* Git/History tab */}
        <button
          onClick={() => setActiveTab("history")}
          style={{
            ...styles.tab,
            ...(activeTab === "history" ? styles.tabActive : styles.tabInactive),
          }}
        >
          <GitBranch size={14} />
          Git
          {/* Active indicator */}
          {activeTab === "history" && (
            <span style={styles.tabIndicator} />
          )}
        </button>
      </div>


      {/* Tab content */}
      <div style={styles.content}>
        {activeTab === "files" ? (
          <FileTree
            files={files}
            activeFileId={activeFileId}
            onSelectFile={onSelectFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteItem={onDeleteItem}
            onToggleFolder={onToggleFolder}
          />
        ) : (
          <History
            commits={commits}
            activeFile={activeFile}
            currentContent={currentContent}
            savedContent={savedContent}
            onCommit={onCommit}
            onRestore={onRestore}
          />
        )}
      </div>
    </div>
  );
}

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
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--color-border)]">
        {/* Files tab */}
        <button
          onClick={() => setActiveTab("files")}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3.5 
            text-xs font-semibold uppercase tracking-wider cursor-pointer 
            transition-all relative
            ${
              activeTab === "files"
                ? "text-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }
          `}
        >
          <FolderTree size={14} />
          Files
          {/* Active indicator */}
          {activeTab === "files" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]" />
          )}
        </button>

        {/* Git/History tab */}
        <button
          onClick={() => setActiveTab("history")}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-3.5 
            text-xs font-semibold uppercase tracking-wider cursor-pointer 
            transition-all relative
            ${
              activeTab === "history"
                ? "text-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }
          `}
        >
          <GitBranch size={14} />
          Git
          {/* Active indicator */}
          {activeTab === "history" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent)]" />
          )}
        </button>
      </div>


      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
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

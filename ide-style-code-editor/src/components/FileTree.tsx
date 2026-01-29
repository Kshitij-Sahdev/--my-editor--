/**
 * FileTree.tsx - File explorer tree view
 *
 * Displays all files and folders in a hierarchical tree structure.
 * Features:
 * - Create files and folders (at root or inside folders)
 * - Delete files and folders
 * - Expand/collapse folders
 * - Select files to open in editor
 * - Auto-detect language from file extension
 * - Different icons for files vs folders, code vs text files
 */

"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  FileCode,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Trash2,
} from "lucide-react";
import type { FileSystemItem, Language } from "../types";
import { getFilesInFolder, getLanguageFromFilename } from "../storage";

// =============================================================================
// TYPES
// =============================================================================

interface FileTreeProps {
  /** All file system items (files and folders) */
  files: FileSystemItem[];
  /** ID of the currently selected file */
  activeFileId: string | null;
  /** Callback when a file is selected */
  onSelectFile: (id: string) => void;
  /** Callback to create a new file */
  onCreateFile: (name: string, language: Language, parentId: string | null) => void;
  /** Callback to create a new folder */
  onCreateFolder: (name: string, parentId: string | null) => void;
  /** Callback to delete a file or folder */
  onDeleteItem: (id: string) => void;
  /** Callback to toggle folder expansion */
  onToggleFolder: (id: string) => void;
}

interface TreeItemProps extends Omit<FileTreeProps, "files"> {
  /** The specific item to render */
  item: FileSystemItem;
  /** All files (needed for rendering children) */
  files: FileSystemItem[];
  /** Depth in the tree (for indentation) */
  depth: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the appropriate icon for a file based on its language.
 * Code files get a colored code icon, text files get a document icon.
 */
function getFileIcon(language: string) {
  if (language === "text") {
    return (
      <FileText
        size={14}
        className="text-[var(--color-text-muted)] shrink-0"
      />
    );
  }
  return (
    <FileCode size={14} className="text-[var(--color-accent)] shrink-0" />
  );
}

// =============================================================================
// TREE ITEM COMPONENT
// =============================================================================

/**
 * Renders a single item in the file tree (file or folder).
 * Handles its own create input state for creating items inside folders.
 */
function TreeItem({
  item,
  files,
  activeFileId,
  depth,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onToggleFolder,
}: TreeItemProps) {
  /** Whether we're creating a new file or folder inside this folder */
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);

  /** Name input for the new item */
  const [newName, setNewName] = useState("");

  // Derived values
  const isFolder = item.type === "folder";
  const isActive = item.id === activeFileId;
  const children = isFolder ? getFilesInFolder(files, item.id) : [];

  /**
   * Handle creating a new item inside this folder.
   * Auto-detects language from extension for files.
   */
  const handleCreate = () => {
    if (!newName.trim()) {
      setIsCreating(null);
      return;
    }

    if (isCreating === "file") {
      const lang = getLanguageFromFilename(newName);
      // Add .txt extension if no extension provided
      const finalName = newName.includes(".") ? newName : newName + ".txt";
      onCreateFile(finalName, lang, item.id);
    } else {
      onCreateFolder(newName, item.id);
    }

    setNewName("");
    setIsCreating(null);
  };

  return (
    <div>
      {/* Item row */}
      <div
        className={`
          group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all
          ${
            isActive
              ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => {
          if (isFolder) {
            onToggleFolder(item.id);
          } else {
            onSelectFile(item.id);
          }
        }}
      >
        {/* Expand/collapse chevron for folders, spacer for files */}
        {isFolder ? (
          <>
            <span className="w-4 flex items-center justify-center">
              {item.isOpen ? (
                <ChevronDown
                  size={14}
                  className="text-[var(--color-text-muted)] transition-transform"
                />
              ) : (
                <ChevronRight
                  size={14}
                  className="text-[var(--color-text-muted)] transition-transform"
                />
              )}
            </span>
            {/* Folder icon (open vs closed) */}
            {item.isOpen ? (
              <FolderOpen
                size={14}
                className="text-[var(--color-warning)] shrink-0"
              />
            ) : (
              <Folder
                size={14}
                className="text-[var(--color-warning)] shrink-0"
              />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            {/* File icon based on language */}
            {getFileIcon(item.type === "file" ? item.language : "text")}
          </>
        )}

        {/* Item name */}
        <span className="text-sm truncate flex-1 font-mono">{item.name}</span>

        {/* Action buttons (shown on hover) */}
        <div className="hidden group-hover:flex items-center gap-1">
          {/* Create buttons for folders */}
          {isFolder && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating("file");
                }}
                className="p-1 hover:bg-[var(--color-border)] rounded cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                title="New file"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating("folder");
                }}
                className="p-1 hover:bg-[var(--color-border)] rounded cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                title="New folder"
              >
                <FolderPlus size={12} />
              </button>
            </>
          )}

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
            }}
            className="p-1 hover:bg-[var(--color-error-subtle)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)] cursor-pointer transition-colors"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Create new item input (inside folder) */}
      {isCreating && (
        <div
          className="flex items-center gap-2 px-3 py-2 animate-slide-down"
          style={{ paddingLeft: `${(depth + 1) * 16 + 12}px` }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(null);
            }}
            onBlur={handleCreate}
            placeholder={isCreating === "file" ? "filename.ext" : "folder name"}
            className="flex-1 px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-accent)] rounded-lg text-sm text-[var(--color-text)] outline-none font-mono transition-colors"
            autoFocus
          />
        </div>
      )}

      {/* Render children (for open folders) */}
      {isFolder && item.isOpen && (
        <div>
          {children.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              files={files}
              activeFileId={activeFileId}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDeleteItem={onDeleteItem}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function FileTree({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteItem,
  onToggleFolder,
}: FileTreeProps) {
  /** Whether we're creating a new item at the root level */
  const [isCreating, setIsCreating] = useState<"file" | "folder" | null>(null);

  /** Name input for the new root item */
  const [newName, setNewName] = useState("");

  // Get root-level items (parentId === null)
  const rootItems = getFilesInFolder(files, null);

  /**
   * Handle creating a new item at the root level.
   */
  const handleCreate = () => {
    if (!newName.trim()) {
      setIsCreating(null);
      return;
    }

    if (isCreating === "file") {
      const lang = getLanguageFromFilename(newName);
      const finalName = newName.includes(".") ? newName : newName + ".txt";
      onCreateFile(finalName, lang, null);
    } else {
      onCreateFolder(newName, null);
    }

    setNewName("");
    setIsCreating(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with create buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          {/* New file button */}
          <button
            onClick={() => setIsCreating("file")}
            className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            title="New file"
          >
            <Plus size={14} />
          </button>
          {/* New folder button */}
          <button
            onClick={() => setIsCreating("folder")}
            className="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            title="New folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {/* File tree content */}
      <div className="flex-1 overflow-auto py-2">
        {/* Root level create input */}
        {isCreating && (
          <div className="flex items-center gap-2 px-4 py-2 animate-slide-down">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setIsCreating(null);
              }}
              onBlur={handleCreate}
              placeholder={isCreating === "file" ? "filename.ext" : "folder name"}
              className="flex-1 px-3 py-1.5 bg-[var(--color-bg)] border border-[var(--color-accent)] rounded-lg text-sm text-[var(--color-text)] outline-none font-mono transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* Render root items */}
        {rootItems.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            files={files}
            activeFileId={activeFileId}
            depth={0}
            onSelectFile={onSelectFile}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            onDeleteItem={onDeleteItem}
            onToggleFolder={onToggleFolder}
          />
        ))}

        {/* Empty state */}
        {rootItems.length === 0 && !isCreating && (
          <div className="px-4 py-12 text-center animate-fade-in">
            <p className="text-[var(--color-text-muted)] text-sm mb-1">
              No files yet
            </p>
            <p className="text-[var(--color-text-muted)] text-xs">
              Click + to create one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

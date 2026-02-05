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
  headerTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  headerButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  headerButton: {
    padding: '6px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '8px 0',
  } as React.CSSProperties,
  createInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
  } as React.CSSProperties,
  input: {
    flex: 1,
    padding: '6px 12px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-accent)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  emptyState: {
    padding: '48px 16px',
    textAlign: 'center',
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
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  itemRowActive: {
    backgroundColor: 'var(--color-accent-subtle)',
    color: 'var(--color-accent)',
  } as React.CSSProperties,
  itemRowInactive: {
    color: 'var(--color-text-secondary)',
  } as React.CSSProperties,
  chevron: {
    width: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,
  chevronIcon: {
    color: 'var(--color-text-muted)',
    transition: 'transform 0.2s',
  } as React.CSSProperties,
  itemName: {
    fontSize: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  actions: {
    display: 'none',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
  actionButton: {
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  deleteButton: {
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  folderIcon: {
    color: 'var(--color-warning)',
    flexShrink: 0,
  } as React.CSSProperties,
  fileIconCode: {
    color: 'var(--color-accent)',
    flexShrink: 0,
  } as React.CSSProperties,
  fileIconText: {
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  } as React.CSSProperties,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the appropriate icon for a file based on its language.
 * Code files get a colored code icon, text files get a document icon.
 */
function getFileIcon(language: string) {
  if (language === "text") {
    return <FileText size={14} style={styles.fileIconText} />;
  }
  return <FileCode size={14} style={styles.fileIconCode} />;
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

  /** Whether this item is hovered */
  const [isHovered, setIsHovered] = useState(false);

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
        style={{
          ...styles.itemRow,
          ...(isActive ? styles.itemRowActive : styles.itemRowInactive),
          paddingLeft: `${depth * 16 + 12}px`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            <span style={styles.chevron}>
              {item.isOpen ? (
                <ChevronDown size={14} style={styles.chevronIcon} />
              ) : (
                <ChevronRight size={14} style={styles.chevronIcon} />
              )}
            </span>
            {/* Folder icon (open vs closed) */}
            {item.isOpen ? (
              <FolderOpen size={14} style={styles.folderIcon} />
            ) : (
              <Folder size={14} style={styles.folderIcon} />
            )}
          </>
        ) : (
          <>
            <span style={styles.chevron} />
            {/* File icon based on language */}
            {getFileIcon(item.type === "file" ? item.language : "text")}
          </>
        )}

        {/* Item name */}
        <span style={styles.itemName}>{item.name}</span>

        {/* Action buttons (shown on hover) */}
        <div style={{ ...styles.actions, display: isHovered ? 'flex' : 'none' }}>
          {/* Create buttons for folders */}
          {isFolder && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating("file");
                }}
                style={styles.actionButton}
                title="New file"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating("folder");
                }}
                style={styles.actionButton}
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
            style={styles.deleteButton}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Create new item input (inside folder) */}
      {isCreating && (
        <div
          style={{
            ...styles.createInput,
            paddingLeft: `${(depth + 1) * 16 + 12}px`,
          }}
          className="animate-slide-down"
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
            style={styles.input}
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
    <div style={styles.container}>
      {/* Header with create buttons */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>
          Explorer
        </span>
        <div style={styles.headerButtons}>
          {/* New file button */}
          <button
            onClick={() => setIsCreating("file")}
            style={styles.headerButton}
            title="New file"
          >
            <Plus size={14} />
          </button>
          {/* New folder button */}
          <button
            onClick={() => setIsCreating("folder")}
            style={styles.headerButton}
            title="New folder"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {/* File tree content */}
      <div style={styles.content}>
        {/* Root level create input */}
        {isCreating && (
          <div style={styles.createInput} className="animate-slide-down">
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
              style={styles.input}
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
          <div style={styles.emptyState} className="animate-fade-in">
            <p style={styles.emptyText}>
              No files yet
            </p>
            <p style={styles.emptySubtext}>
              Click + to create one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

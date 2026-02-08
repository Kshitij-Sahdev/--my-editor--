/**
 * storage.ts - LocalStorage persistence and data utilities
 * 
 * Handles saving/loading application state to localStorage for persistence
 * across browser sessions. Also provides factory functions for creating
 * new files, folders, and commits.
 */

import type { AppState, FileItem, FolderItem, Commit, FileSystemItem, Language } from "./types";
import { DEFAULT_CODE, EXTENSION_TO_LANGUAGE, DEFAULT_SETTINGS } from "./types";

// =============================================================================
// STORAGE CONFIGURATION
// =============================================================================

/**
 * LocalStorage key for persisting app state.
 * Increment version number when making breaking changes to state structure.
 */
const STORAGE_KEY = "code-editor-v4";

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generates a unique identifier for files, folders, and commits.
 * Combines random string with timestamp for uniqueness.
 * 
 * @returns A unique string ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

/**
 * Creates the initial application state for new users.
 * Sets up a default main.py file with Python Hello World code.
 * 
 * @returns Fresh AppState with a single Python file
 */
function createDefaultState(): AppState {
  const now = Date.now();
  
  // Create a default Python file as starting point
  const mainFile: FileItem = {
    id: generateId(),
    name: "main.py",
    type: "file",
    language: "python",
    content: DEFAULT_CODE.python,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    files: [mainFile],
    commits: [],
    activeFileId: mainFile.id,
    sidebarWidth: 260,    // Default sidebar width
    outputHeight: 200,    // Default output panel height
    settings: DEFAULT_SETTINGS,
  };
}

// =============================================================================
// PERSISTENCE FUNCTIONS
// =============================================================================

/**
 * Loads application state from localStorage.
 * Returns default state if nothing is stored or if parsing fails.
 * 
 * @returns The loaded AppState or a fresh default state
 */
export function loadState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AppState;
      
      // Validate that we have files (basic sanity check)
      if (parsed.files && parsed.files.length > 0) {
        return {
          ...parsed,
          // Ensure layout values have defaults if missing
          sidebarWidth: parsed.sidebarWidth || 260,
          outputHeight: parsed.outputHeight || 200,
          settings: parsed.settings || DEFAULT_SETTINGS,
        };
      }
    }
  } catch (e) {
    // Log error but don't crash - just use default state
    console.error("Failed to load state from localStorage:", e);
  }
  
  return createDefaultState();
}

/**
 * Saves application state to localStorage.
 * Called whenever state changes to ensure persistence.
 * 
 * @param state - The current AppState to persist
 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage might be full or disabled
    console.error("Failed to save state to localStorage:", e);
  }
}

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

/**
 * Determines the programming language from a filename's extension.
 * Returns "text" for unknown extensions (no syntax highlighting).
 * 
 * @param filename - The filename to analyze (e.g., "main.py")
 * @returns The detected Language type
 */
export function getLanguageFromFilename(filename: string): Language {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || "text";
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Creates a new file with default content for its language.
 * 
 * @param name - Filename including extension
 * @param language - The programming language
 * @param parentId - Parent folder ID, or null for root
 * @returns A new FileItem ready to add to state
 */
export function createFile(
  name: string,
  language: Language,
  parentId: string | null = null
): FileItem {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    type: "file",
    language,
    content: DEFAULT_CODE[language],
    parentId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a new folder.
 * 
 * @param name - Folder name
 * @param parentId - Parent folder ID, or null for root
 * @returns A new FolderItem ready to add to state
 */
export function createFolder(name: string, parentId: string | null = null): FolderItem {
  return {
    id: generateId(),
    name,
    type: "folder",
    parentId,
    isOpen: true,  // Start expanded
    createdAt: Date.now(),
  };
}

/**
 * Creates a new commit (version snapshot) for a file.
 * 
 * @param fileId - ID of the file being committed
 * @param content - Complete file content to snapshot
 * @param message - User's commit message describing changes
 * @returns A new Commit ready to add to state
 */
export function createCommit(fileId: string, content: string, message: string): Commit {
  return {
    id: generateId(),
    fileId,
    content,
    message,
    timestamp: Date.now(),
  };
}

// =============================================================================
// QUERY FUNCTIONS
// =============================================================================

/**
 * Gets all commits for a specific file, sorted newest first.
 * 
 * @param commits - All commits in the system
 * @param fileId - ID of the file to get commits for
 * @returns Array of commits for this file, newest first
 */
export function getFileCommits(commits: Commit[], fileId: string): Commit[] {
  return commits
    .filter((c) => c.fileId === fileId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Gets all items (files and folders) within a specific folder.
 * Sorted with folders first, then alphabetically by name.
 * 
 * @param files - All file system items
 * @param parentId - Parent folder ID, or null for root items
 * @returns Sorted array of items in the folder
 */
export function getFilesInFolder(
  files: FileSystemItem[],
  parentId: string | null
): FileSystemItem[] {
  return files
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => {
      // Folders come before files
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      // Then sort alphabetically
      return a.name.localeCompare(b.name);
    });
}

// =============================================================================
// EXECUTION PERSISTENCE
// =============================================================================

/** LocalStorage key for last execution result */
const EXECUTION_STORAGE_KEY = "code-editor-last-execution";

/**
 * Stored execution result with metadata.
 */
export interface StoredExecution {
  /** File ID that was executed */
  fileId: string;
  /** Language of the file */
  language: Language;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Which backend was used */
  source: "primary" | "judge0" | "offline";
  /** Timestamp of execution */
  timestamp: number;
}

/**
 * Save the last execution result to localStorage.
 * 
 * @param execution - Execution result to persist
 */
export function saveLastExecution(execution: StoredExecution): void {
  try {
    localStorage.setItem(EXECUTION_STORAGE_KEY, JSON.stringify(execution));
  } catch (error) {
    console.warn("Failed to save execution result:", error);
  }
}

/**
 * Load the last execution result from localStorage.
 * 
 * @returns The stored execution or null if none exists
 */
export function loadLastExecution(): StoredExecution | null {
  try {
    const stored = localStorage.getItem(EXECUTION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredExecution;
  } catch {
    return null;
  }
}

/**
 * Clear the last execution result from localStorage.
 */
export function clearLastExecution(): void {
  try {
    localStorage.removeItem(EXECUTION_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

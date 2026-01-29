/**
 * types.ts - Type definitions and constants for the code editor
 * 
 * This file contains all TypeScript interfaces, type aliases, and constant
 * configurations used throughout the application. It serves as the single
 * source of truth for data structures.
 */

// =============================================================================
// LANGUAGE TYPES
// =============================================================================

/**
 * Supported programming languages in the editor.
 * "text" is used for unsupported/unknown file extensions.
 */
export type Language = "python" | "cpp" | "java" | "go" | "javascript" | "text";

// =============================================================================
// API TYPES (matches Go backend structs)
// =============================================================================

/**
 * Request payload for the /run endpoint.
 * Maps directly to RunRequest struct in main.go
 */
export interface RunRequest {
  language: string;  // Language identifier (python, cpp, java, go, javascript)
  code: string;      // Source code to execute
  stdin: string;     // Standard input for the program
}

/**
 * Response from the /run endpoint.
 * Maps directly to RunResponse struct in main.go
 */
export interface RunOutput {
  stdout: string;    // Standard output from execution
  stderr: string;    // Standard error (compilation errors, runtime errors)
}

// =============================================================================
// FILE SYSTEM TYPES
// =============================================================================

/**
 * Represents a file in the virtual file system.
 * Files contain editable content and are associated with a language.
 */
export interface FileItem {
  id: string;              // Unique identifier (generated with generateId())
  name: string;            // Filename including extension (e.g., "main.py")
  type: "file";            // Discriminator for union type
  language: Language;      // Detected from file extension
  content: string;         // Current file content
  parentId: string | null; // Parent folder ID, null if in root
  createdAt: number;       // Unix timestamp of creation
  updatedAt: number;       // Unix timestamp of last modification
}

/**
 * Represents a folder in the virtual file system.
 * Folders can contain files and other folders.
 */
export interface FolderItem {
  id: string;              // Unique identifier
  name: string;            // Folder name
  type: "folder";          // Discriminator for union type
  parentId: string | null; // Parent folder ID, null if in root
  isOpen: boolean;         // Whether folder is expanded in tree view
  createdAt: number;       // Unix timestamp of creation
}

/**
 * Union type for any item in the file system.
 * Use type guards (item.type === "file") to narrow the type.
 */
export type FileSystemItem = FileItem | FolderItem;

// =============================================================================
// VERSION CONTROL TYPES
// =============================================================================

/**
 * Represents a commit (snapshot) in the version history.
 * Each commit stores the complete file content at that point in time.
 */
export interface Commit {
  id: string;        // Unique identifier
  fileId: string;    // ID of the file this commit belongs to
  content: string;   // Complete file content at commit time
  message: string;   // User-provided commit message
  timestamp: number; // Unix timestamp of commit
}

// =============================================================================
// APPLICATION STATE
// =============================================================================

/**
 * Root state object persisted to localStorage.
 * Contains all data needed to restore the application state.
 */
export interface AppState {
  files: FileSystemItem[];     // All files and folders
  commits: Commit[];           // All version history commits
  activeFileId: string | null; // Currently selected file ID
  sidebarWidth: number;        // Sidebar panel width in pixels
  outputHeight: number;        // Output panel height in pixels
}

// =============================================================================
// LANGUAGE CONFIGURATION
// =============================================================================

/**
 * Maps language identifiers to their typical file extensions.
 * Used when creating new files with a specific language.
 */
export const LANGUAGE_EXTENSIONS: Record<Language, string> = {
  python: ".py",
  cpp: ".cpp",
  java: ".java",
  go: ".go",
  javascript: ".js",
  text: ".txt",
};

/**
 * Maps file extensions to language identifiers.
 * Used to auto-detect language when creating/opening files.
 * Extensions not in this map default to "text" (plain text mode).
 */
export const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  // Python
  ".py": "python",
  
  // C++
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".c": "cpp",
  ".h": "cpp",
  ".hpp": "cpp",
  
  // Java
  ".java": "java",
  
  // Go
  ".go": "go",
  
  // JavaScript/TypeScript (all run as JS)
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "javascript",
  ".tsx": "javascript",
  ".mjs": "javascript",
  
  // Plain text / unsupported (no syntax highlighting, not runnable)
  ".txt": "text",
  ".md": "text",
  ".json": "text",
  ".yaml": "text",
  ".yml": "text",
  ".toml": "text",
  ".xml": "text",
  ".html": "text",
  ".css": "text",
  ".sql": "text",
  ".sh": "text",
  ".bash": "text",
  ".env": "text",
};

/**
 * Languages that can be executed by the Go backend.
 * The backend has Docker images for these: runner-python, runner-cpp, etc.
 */
export const RUNNABLE_LANGUAGES: Language[] = ["python", "cpp", "java", "go", "javascript"];

/**
 * Default "Hello World" code templates for each language.
 * Used when creating new files to give users a starting point.
 */
export const DEFAULT_CODE: Record<Language, string> = {
  python: `# Python - Hello World
# Run with Ctrl+Enter

print("Hello, World!")
`,
  cpp: `// C++ - Hello World
// Run with Ctrl+Enter

#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
  java: `// Java - Hello World
// Note: Class name must be "Main" for the runner
// Run with Ctrl+Enter

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  go: `// Go - Hello World
// Run with Ctrl+Enter

package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
`,
  javascript: `// JavaScript - Hello World
// Run with Ctrl+Enter

console.log("Hello, World!");
`,
  text: ``,  // Empty for plain text files
};

/**
 * Human-readable labels for each language.
 * Displayed in the UI (language badge, status bar, etc.)
 */
export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  cpp: "C++",
  java: "Java",
  go: "Go",
  javascript: "JavaScript",
  text: "Plain Text",
};

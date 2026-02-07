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
 * "markdown" is for .md files with syntax highlighting.
 */
export type Language = "python" | "cpp" | "java" | "go" | "javascript" | "markdown" | "text";

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
// EDITOR SETTINGS TYPES
// =============================================================================

/**
 * Available theme options
 */
export interface ThemeOption {
  id: string;
  name: string;
}

/**
 * Available font options
 */
export interface FontOption {
  id: string;
  name: string;
  css: string;
}

/**
 * Editor settings that can be customized
 */
export interface EditorSettings {
  theme: string;
  fontFamily: string;
  fontSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
  bracketMatching: boolean;
  highlightActiveLine: boolean;
  tabSize: number;
  autoShowOutput: boolean;
}

/**
 * Available themes
 */
export const AVAILABLE_THEMES: ThemeOption[] = [
  { id: 'amoled-black', name: 'AMOLED Black' },
  { id: 'one-dark', name: 'One Dark' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'nord', name: 'Nord' },
  { id: 'github-dark', name: 'GitHub Dark' },
  { id: 'monokai', name: 'Monokai' },
  { id: 'solarized-dark', name: 'Solarized Dark' },
  { id: 'tokyo-night', name: 'Tokyo Night' },
];

/**
 * Website theme CSS variables for each theme
 * These define the overall look of the app (backgrounds, borders, accents)
 */
export const THEME_CSS_VARS: Record<string, Record<string, string>> = {
  'amoled-black': {
    '--color-bg': '#000000',
    '--color-surface': '#050505',
    '--color-surface-2': '#0a0a0a',
    '--color-surface-hover': '#141414',
    '--color-border': '#1a1a1a',
    '--color-border-subtle': '#101010',
    '--color-text': '#fafafa',
    '--color-text-secondary': '#a8a8b3',
    '--color-text-muted': '#5c5c6a',
    '--color-accent': '#10b981',
    '--color-accent-hover': '#059669',
    '--color-accent-subtle': 'rgba(16, 185, 129, 0.12)',
    '--color-accent-glow': 'rgba(16, 185, 129, 0.6)',
  },
  'one-dark': {
    '--color-bg': '#21252b',
    '--color-surface': '#282c34',
    '--color-surface-2': '#2c313a',
    '--color-surface-hover': '#3a3f4b',
    '--color-border': '#3e4451',
    '--color-border-subtle': '#353b45',
    '--color-text': '#abb2bf',
    '--color-text-secondary': '#9da5b4',
    '--color-text-muted': '#5c6370',
    '--color-accent': '#61afef',
    '--color-accent-hover': '#4d99d4',
    '--color-accent-subtle': 'rgba(97, 175, 239, 0.12)',
    '--color-accent-glow': 'rgba(97, 175, 239, 0.6)',
  },
  'dracula': {
    '--color-bg': '#1e1f29',
    '--color-surface': '#282a36',
    '--color-surface-2': '#2d303e',
    '--color-surface-hover': '#383a4a',
    '--color-border': '#44475a',
    '--color-border-subtle': '#3a3d4e',
    '--color-text': '#f8f8f2',
    '--color-text-secondary': '#d0d0d0',
    '--color-text-muted': '#6272a4',
    '--color-accent': '#bd93f9',
    '--color-accent-hover': '#a87de8',
    '--color-accent-subtle': 'rgba(189, 147, 249, 0.12)',
    '--color-accent-glow': 'rgba(189, 147, 249, 0.6)',
  },
  'nord': {
    '--color-bg': '#242933',
    '--color-surface': '#2e3440',
    '--color-surface-2': '#3b4252',
    '--color-surface-hover': '#434c5e',
    '--color-border': '#4c566a',
    '--color-border-subtle': '#3b4252',
    '--color-text': '#eceff4',
    '--color-text-secondary': '#d8dee9',
    '--color-text-muted': '#616e88',
    '--color-accent': '#88c0d0',
    '--color-accent-hover': '#7ab0c0',
    '--color-accent-subtle': 'rgba(136, 192, 208, 0.12)',
    '--color-accent-glow': 'rgba(136, 192, 208, 0.6)',
  },
  'github-dark': {
    '--color-bg': '#010409',
    '--color-surface': '#0d1117',
    '--color-surface-2': '#161b22',
    '--color-surface-hover': '#21262d',
    '--color-border': '#30363d',
    '--color-border-subtle': '#21262d',
    '--color-text': '#c9d1d9',
    '--color-text-secondary': '#8b949e',
    '--color-text-muted': '#6e7681',
    '--color-accent': '#58a6ff',
    '--color-accent-hover': '#4090e8',
    '--color-accent-subtle': 'rgba(88, 166, 255, 0.12)',
    '--color-accent-glow': 'rgba(88, 166, 255, 0.6)',
  },
  'monokai': {
    '--color-bg': '#1e1f1c',
    '--color-surface': '#272822',
    '--color-surface-2': '#2d2e27',
    '--color-surface-hover': '#3e3d32',
    '--color-border': '#49483e',
    '--color-border-subtle': '#3c3d34',
    '--color-text': '#f8f8f2',
    '--color-text-secondary': '#cfcfc2',
    '--color-text-muted': '#75715e',
    '--color-accent': '#f92672',
    '--color-accent-hover': '#e01d60',
    '--color-accent-subtle': 'rgba(249, 38, 114, 0.12)',
    '--color-accent-glow': 'rgba(249, 38, 114, 0.6)',
  },
  'solarized-dark': {
    '--color-bg': '#00212b',
    '--color-surface': '#002b36',
    '--color-surface-2': '#073642',
    '--color-surface-hover': '#0a4050',
    '--color-border': '#094959',
    '--color-border-subtle': '#073d49',
    '--color-text': '#93a1a1',
    '--color-text-secondary': '#839496',
    '--color-text-muted': '#586e75',
    '--color-accent': '#268bd2',
    '--color-accent-hover': '#1e7abe',
    '--color-accent-subtle': 'rgba(38, 139, 210, 0.12)',
    '--color-accent-glow': 'rgba(38, 139, 210, 0.6)',
  },
  'tokyo-night': {
    '--color-bg': '#16161e',
    '--color-surface': '#1a1b26',
    '--color-surface-2': '#1f202e',
    '--color-surface-hover': '#292e42',
    '--color-border': '#3b4261',
    '--color-border-subtle': '#2a2e42',
    '--color-text': '#a9b1d6',
    '--color-text-secondary': '#9aa5ce',
    '--color-text-muted': '#565f89',
    '--color-accent': '#7aa2f7',
    '--color-accent-hover': '#6691e6',
    '--color-accent-subtle': 'rgba(122, 162, 247, 0.12)',
    '--color-accent-glow': 'rgba(122, 162, 247, 0.6)',
  },
};

/**
 * Available fonts
 */
export const AVAILABLE_FONTS: FontOption[] = [
  { id: 'jetbrains-mono', name: 'JetBrains Mono', css: '"JetBrains Mono", monospace' },
  { id: 'fira-code', name: 'Fira Code', css: '"Fira Code", monospace' },
  { id: 'source-code-pro', name: 'Source Code Pro', css: '"Source Code Pro", monospace' },
  { id: 'ubuntu-mono', name: 'Ubuntu Mono', css: '"Ubuntu Mono", monospace' },
  { id: 'ibm-plex-mono', name: 'IBM Plex Mono', css: '"IBM Plex Mono", monospace' },
  { id: '3270', name: 'IBM 3270', css: '"3270", monospace' },
  { id: 'roboto-mono', name: 'Roboto Mono', css: '"Roboto Mono", monospace' },
  { id: 'inconsolata', name: 'Inconsolata', css: '"Inconsolata", monospace' },
  { id: 'space-mono', name: 'Space Mono', css: '"Space Mono", monospace' },
];

/**
 * Default editor settings - AMOLED Black theme by default
 */
export const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'amoled-black',
  fontFamily: 'jetbrains-mono',
  fontSize: 14,
  lineNumbers: true,
  wordWrap: false,
  bracketMatching: true,
  highlightActiveLine: true,
  tabSize: 4,
  autoShowOutput: true,
};

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
  settings: EditorSettings;    // Editor customization settings
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
  markdown: ".md",
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
  
  // Markdown
  ".md": "markdown",
  ".markdown": "markdown",
  ".mdx": "markdown",
  
  // Plain text / unsupported (no syntax highlighting, not runnable)
  ".txt": "text",
  ".json": "text",
  ".conf": "text",
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

print("Hello from python!")
`,
  cpp: `// C++ - Hello World
// Run with Ctrl+Enter

#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}
`,
  java: `// Java - Hello World
// Note: Class name must be "Main" for the runner
// Run with Ctrl+Enter

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}
`,
  go: `// Go - Hello World
// Run with Ctrl+Enter

package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
}
`,
  javascript: `// JavaScript - Hello World
// Run with Ctrl+Enter

console.log("Hello from JavaScript!");
`,
  markdown: `# Welcome to Markdown

This is a **markdown** file with *syntax highlighting*.

## Features

- Lists
- Code blocks
- And more!

\`\`\`javascript
console.log("Code block example");
\`\`\`
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
  markdown: "Markdown",
  text: "Plain Text",
};

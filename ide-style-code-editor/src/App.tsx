/**
 * App.tsx - Main application component
 *
 * This is the root component that orchestrates the entire code editor.
 * It manages global state (files, commits, layout), handles persistence,
 * and coordinates communication between child components.
 *
 * Architecture:
 * - State is loaded from localStorage on mount
 * - State changes trigger auto-save to localStorage
 * - Child components receive callbacks to update state
 * - The Go backend at localhost:8080/run handles code execution
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Output from "./components/Output";
import type { AppState, FileItem, Commit, Language, RunOutput } from "./types";
import {
  loadState,
  saveState,
  createFile,
  createFolder,
  createCommit,
  getFileCommits,
} from "./storage";

// =============================================================================
// LAYOUT CONSTRAINTS
// =============================================================================

/** Default width for the sidebar panel in pixels */
const SIDEBAR_WIDTH = 280;

/** Default height for the output panel in pixels */
const OUTPUT_HEIGHT = 250;

/**
 * Go backend URL for code execution.
 * The backend should be running at this address (see main.go).
 * It accepts POST requests with { language, code, stdin }.
 */
const API_URL = "http://localhost:8080";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function App() {
  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  /** Main application state - null until loaded from localStorage */
  const [state, setState] = useState<AppState | null>(null);

  /** Output from the last code execution */
  const [output, setOutput] = useState<RunOutput | null>(null);

  /** Whether code is currently being executed */
  const [isRunning, setIsRunning] = useState(false);

  /** 
   * Track current editor content AS STATE so components re-render.
   * This replaces currentContentRef for passing to child components.
   */
  const [editorContent, setEditorContent] = useState<string>("");

  /**
   * Track the "saved" content - the content at the last commit or when the file was loaded.
   * Used to determine if there are uncommitted changes.
   */
  const [savedContent, setSavedContent] = useState<string>("");

  /** Whether the sidebar is pinned open */
  const [sidebarPinned, setSidebarPinned] = useState(false);

  /** Whether the sidebar is being hovered */
  const [sidebarHovered, setSidebarHovered] = useState(false);

  /** Whether the output panel is pinned open */
  const [outputPinned, setOutputPinned] = useState(false);

  /** Whether the output panel is being hovered */
  const [outputHovered, setOutputHovered] = useState(false);

  /**
   * Ref to track current editor content without triggering re-renders.
   * Still used internally for immediate access (e.g., in runCode).
   */
  const currentContentRef = useRef<string>("");

  // ---------------------------------------------------------------------------
  // INITIALIZATION & PERSISTENCE
  // ---------------------------------------------------------------------------

  /**
   * Load state from localStorage on component mount.
   * This runs once when the app first opens.
   */
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);

    // Initialize content ref with active file's content
    const activeFile = loaded.files.find(
      (f) => f.id === loaded.activeFileId && f.type === "file"
    ) as FileItem | undefined;

    if (activeFile) {
      currentContentRef.current = activeFile.content;
      setEditorContent(activeFile.content);
      
      // Set saved content to the latest commit or original file content
      const fileCommits = getFileCommits(loaded.commits, activeFile.id);
      setSavedContent(fileCommits.length > 0 ? fileCommits[0].content : activeFile.content);
    }
  }, []);

  /**
   * Auto-save state to localStorage whenever it changes.
   * This ensures persistence across browser refreshes.
   */
  useEffect(() => {
    if (state) {
      saveState(state);
    }
  }, [state]);

  // ---------------------------------------------------------------------------
  // DERIVED VALUES
  // ---------------------------------------------------------------------------

  /** Currently selected file (if any) */
  const activeFile = state?.files.find(
    (f) => f.id === state.activeFileId && f.type === "file"
  ) as FileItem | undefined;

  /**
   * Whether the current file has uncommitted changes.
   * Compares current content with the saved content.
   */
  const hasChanges = activeFile && editorContent !== savedContent;

  // ---------------------------------------------------------------------------
  // FILE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Select a file to open in the editor.
   * Updates activeFileId and syncs the content ref.
   */
  const handleSelectFile = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;

      const file = prev.files.find(
        (f) => f.id === id && f.type === "file"
      ) as FileItem | undefined;

      if (file) {
        currentContentRef.current = file.content;
        setEditorContent(file.content);
        
        // Set saved content to the latest commit or original file content
        const fileCommits = getFileCommits(prev.commits, file.id);
        setSavedContent(fileCommits.length > 0 ? fileCommits[0].content : file.content);
      }

      return { ...prev, activeFileId: id };
    });
  }, []);

  /**
   * Create a new file with the given name and language.
   * The file is created with default template code and auto-selected.
   */
  const handleCreateFile = useCallback(
    (name: string, language: Language, parentId: string | null) => {
      const newFile = createFile(name, language, parentId);

      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          files: [...prev.files, newFile],
          activeFileId: newFile.id,
        };
      });

      // Set content ref to the new file's default code
      currentContentRef.current = newFile.content;
      setEditorContent(newFile.content);
      // New file has no commits, so saved content is the original content
      setSavedContent(newFile.content);
    },
    []
  );

  /**
   * Create a new folder in the file tree.
   */
  const handleCreateFolder = useCallback(
    (name: string, parentId: string | null) => {
      const newFolder = createFolder(name, parentId);
      setState((prev) => {
        if (!prev) return prev;
        return { ...prev, files: [...prev.files, newFolder] };
      });
    },
    []
  );

  /**
   * Delete a file or folder (and all its descendants).
   * If the deleted item was active, selects the first remaining file.
   */
  const handleDeleteItem = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;

      // Recursively get all descendant IDs (for folders)
      const getDescendants = (parentId: string): string[] => {
        const children = prev.files.filter((f) => f.parentId === parentId);
        return children.flatMap((child) => [
          child.id,
          ...getDescendants(child.id),
        ]);
      };

      const idsToDelete = [id, ...getDescendants(id)];
      const newFiles = prev.files.filter((f) => !idsToDelete.includes(f.id));
      const newCommits = prev.commits.filter(
        (c) => !idsToDelete.includes(c.fileId)
      );

      // Update active file if it was deleted
      let newActiveId = prev.activeFileId;
      if (idsToDelete.includes(prev.activeFileId || "")) {
        const firstFile = newFiles.find((f) => f.type === "file");
        newActiveId = firstFile?.id || null;

        if (firstFile && firstFile.type === "file") {
          currentContentRef.current = (firstFile as FileItem).content;
        }
      }

      return {
        ...prev,
        files: newFiles,
        commits: newCommits,
        activeFileId: newActiveId,
      };
    });
  }, []);

  /**
   * Toggle a folder's open/closed state in the file tree.
   */
  const handleToggleFolder = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map((f) =>
          f.id === id && f.type === "folder" ? { ...f, isOpen: !f.isOpen } : f
        ),
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // EDITOR OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Handle content changes from the editor.
   * Updates both the content ref and the file in state.
   */
  const handleContentChange = useCallback((content: string) => {
    currentContentRef.current = content;
    setEditorContent(content);  // <-- ADD THIS

    setState((prev) => {
      if (!prev || !prev.activeFileId) return prev;
      return {
        ...prev,
        files: prev.files.map((f) =>
          f.id === prev.activeFileId && f.type === "file"
            ? { ...f, content, updatedAt: Date.now() }
            : f
        ),
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // VERSION CONTROL OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Create a new commit for the current file.
   * Saves the current content with the provided message.
   */
  const handleCommit = useCallback((message: string) => {
    // Update saved content to current content (since we're committing it)
    setSavedContent(currentContentRef.current);
    
    setState((prev) => {
      if (!prev || !prev.activeFileId) return prev;

      const file = prev.files.find(
        (f) => f.id === prev.activeFileId && f.type === "file"
      ) as FileItem | undefined;

      if (!file) return prev;

      const commit = createCommit(file.id, currentContentRef.current, message);
      return { ...prev, commits: [...prev.commits, commit] };
    });
  }, []);

  /**
   * Restore file content from a previous commit.
   * Replaces the current content with the commit's snapshot.
   */
  const handleRestore = useCallback((commit: Commit) => {
    currentContentRef.current = commit.content;
    setEditorContent(commit.content);
    // After restore, this content becomes the new "saved" baseline
    setSavedContent(commit.content);

    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        files: prev.files.map((f) =>
          f.id === commit.fileId && f.type === "file"
            ? { ...f, content: commit.content, updatedAt: Date.now() }
            : f
        ),
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // CODE EXECUTION
  // ---------------------------------------------------------------------------

  /**
   * Execute the current file's code via the Go backend.
   *
   * Sends a POST request to /run with:
   * - language: The file's programming language
   * - code: The current editor content
   * - stdin: Standard input (empty for now)
   *
   * The backend runs the code in a Docker container and returns stdout/stderr.
   */
  const runCode = useCallback(async () => {
    if (isRunning || !activeFile) return;

    setIsRunning(true);

    try {
      const response = await fetch(`${API_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: activeFile.language,
          code: currentContentRef.current,
          stdin: "",
        }),
      });

      const data = await response.json();
      setOutput(data);
    } catch {
      // Network error (backend not running, CORS, etc.)
      setOutput({
        stdout: "",
        stderr:
          "Network error: Could not reach the backend server.\n\n" +
          "Make sure the Go backend is running:\n" +
          "  go run main.go\n\n" +
          "The server should be listening on http://localhost:8080",
      });
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, isRunning]);

  /**
   * Clear the output panel.
   */
  const clearOutput = useCallback(() => setOutput(null), []);

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------

  if (!state) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 border-2 border-transparent border-t-[var(--color-accent)] rounded-full animate-spin" />
          <span className="text-sm text-[var(--color-text-muted)] font-mono">
            Loading editor...
          </span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  const sidebarVisible = sidebarPinned || sidebarHovered;
  const outputVisible = outputPinned || outputHovered;

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-bg)] animate-fade-in overflow-hidden">
      {/* Top header with logo and run button */}
      <Header
        activeFile={activeFile || null}
        onRun={runCode}
        isRunning={isRunning}
      />

      {/* Main content area */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* Editor area - takes full space */}
        <div className="absolute inset-0">
          {activeFile ? (
            <Editor
              key={activeFile.id}
              fileId={activeFile.id}
              fileName={activeFile.name}
              language={activeFile.language}
              content={activeFile.content}
              hasChanges={hasChanges || false}
              onContentChange={handleContentChange}
              onRun={runCode}
              onCommit={handleCommit}
            />
          ) : (
            // Empty state when no file is selected
            <div className="h-full flex items-center justify-center bg-[var(--color-bg)]">
              <div className="text-center animate-fade-in">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center transition-transform hover:scale-105 border border-[var(--color-border)]">
                  <span className="text-4xl text-[var(--color-text-muted)]">
                    +
                  </span>
                </div>
                <p className="text-lg font-medium text-[var(--color-text-secondary)] mb-2">
                  No file selected
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Hover left edge for files
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar hover trigger zone - always present on left edge */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-5 z-40"
          onMouseEnter={() => setSidebarHovered(true)}
        >
          {/* Visual indicator - only show when sidebar is hidden */}
          {!sidebarVisible && (
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-20 bg-gradient-to-b from-transparent via-[var(--color-accent)] to-transparent rounded-full opacity-50 animate-pulse" />
          )}
        </div>

        {/* Left sidebar panel */}
        <div 
          className={`sidebar-container absolute left-0 top-0 bottom-0 z-30 transition-transform duration-300 ease-out ${
            sidebarVisible ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: SIDEBAR_WIDTH }}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <div className="h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl shadow-black/80 flex flex-col relative">
            {/* Pin button */}
            <button
              onClick={() => setSidebarPinned(!sidebarPinned)}
              className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                sidebarPinned 
                  ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/30' 
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              }`}
              title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
              </svg>
            </button>
            
            <Sidebar
              files={state.files}
              commits={state.commits}
              activeFileId={state.activeFileId}
              activeFile={activeFile || null}
              currentContent={editorContent}
              savedContent={savedContent}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onDeleteItem={handleDeleteItem}
              onToggleFolder={handleToggleFolder}
              onCommit={handleCommit}
              onRestore={handleRestore}
            />
          </div>
        </div>

        {/* Output hover trigger zone - always present at bottom edge when output exists */}
        {output && (
          <div 
            className="absolute left-0 right-0 bottom-0 h-5 z-40"
            onMouseEnter={() => setOutputHovered(true)}
          >
            {/* Visual indicator - only show when output is hidden */}
            {!outputVisible && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-20 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent rounded-full opacity-50 animate-pulse" />
            )}
          </div>
        )}

        {/* Output panel */}
        {output && (
          <div 
            className={`output-container absolute left-0 right-0 bottom-0 z-30 transition-transform duration-300 ease-out ${
              outputVisible ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{ height: OUTPUT_HEIGHT }}
            onMouseEnter={() => setOutputHovered(true)}
            onMouseLeave={() => setOutputHovered(false)}
          >
            <div className="h-full bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-2xl shadow-black/80 flex flex-col relative">
              {/* Pin button */}
              <button
                onClick={() => setOutputPinned(!outputPinned)}
                className={`absolute top-3 right-12 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  outputPinned 
                    ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/30' 
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
                title={outputPinned ? 'Unpin output' : 'Pin output'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                </svg>
              </button>
              
              <Output
                stdout={output.stdout}
                stderr={output.stderr}
                onClear={clearOutput}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

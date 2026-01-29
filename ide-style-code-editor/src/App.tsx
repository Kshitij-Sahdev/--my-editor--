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
import Resizer from "./components/Resizer";
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

/** Minimum width for the sidebar panel in pixels */
const MIN_SIDEBAR_WIDTH = 200;

/** Maximum width for the sidebar panel in pixels */
const MAX_SIDEBAR_WIDTH = 400;

/** Minimum height for the output panel in pixels */
const MIN_OUTPUT_HEIGHT = 100;

/** Maximum height for the output panel in pixels */
const MAX_OUTPUT_HEIGHT = 400;

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
   * Ref to track current editor content without triggering re-renders.
   * This is updated by the Editor component on every keystroke.
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

  /** Commits for the currently selected file */
  const fileCommits =
    activeFile && state ? getFileCommits(state.commits, activeFile.id) : [];

  /**
   * Whether the current file has uncommitted changes.
   * Compares current content with the latest commit (or original content).
   */
  const hasChanges =
    activeFile && fileCommits.length > 0
      ? currentContentRef.current !== fileCommits[0].content
      : activeFile && currentContentRef.current !== activeFile.content;

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
  // LAYOUT OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Handle sidebar width changes from the resizer.
   * Clamps the value within min/max bounds.
   */
  const handleSidebarResize = useCallback((delta: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const newWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, prev.sidebarWidth + delta)
      );
      return { ...prev, sidebarWidth: newWidth };
    });
  }, []);

  /**
   * Handle output panel height changes from the resizer.
   * Note: delta is negated because dragging up should increase height.
   */
  const handleOutputResize = useCallback((delta: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const newHeight = Math.min(
        MAX_OUTPUT_HEIGHT,
        Math.max(MIN_OUTPUT_HEIGHT, prev.outputHeight - delta)
      );
      return { ...prev, outputHeight: newHeight };
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-bg)] animate-fade-in">
      {/* Top header with logo and run button */}
      <Header
        activeFile={activeFile || null}
        onRun={runCode}
        isRunning={isRunning}
      />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left sidebar (file tree + version control) */}
        <div
          style={{ width: state.sidebarWidth }}
          className="shrink-0 border-r border-[var(--color-border)]"
        >
          <Sidebar
            files={state.files}
            commits={state.commits}
            activeFileId={state.activeFileId}
            activeFile={activeFile || null}
            currentContent={currentContentRef.current}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteItem={handleDeleteItem}
            onToggleFolder={handleToggleFolder}
            onCommit={handleCommit}
            onRestore={handleRestore}
          />
        </div>

        {/* Sidebar resize handle */}
        <Resizer direction="horizontal" onResize={handleSidebarResize} />

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
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
            <div className="flex-1 flex items-center justify-center bg-[var(--color-surface)]">
              <div className="text-center animate-fade-in">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center transition-transform hover:scale-105">
                  <span className="text-4xl text-[var(--color-text-muted)]">
                    +
                  </span>
                </div>
                <p className="text-lg font-medium text-[var(--color-text-secondary)] mb-2">
                  No file selected
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Create or select a file from the sidebar
                </p>
              </div>
            </div>
          )}

          {/* Output panel (shown after running code) */}
          {output && (
            <>
              <Resizer direction="vertical" onResize={handleOutputResize} />
              <div
                style={{ height: state.outputHeight }}
                className="shrink-0 animate-slide-up"
              >
                <Output
                  stdout={output.stdout}
                  stderr={output.stderr}
                  onClear={clearOutput}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

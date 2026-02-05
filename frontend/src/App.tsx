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
 * - Responsive layout adapts to mobile/portrait orientation
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Output from "./components/Output";
import Settings from "./components/Settings";
import StatusBar from "./components/StatusBar";
import Resizer from "./components/Resizer";
import { useIsMobile } from "./hooks/useIsMobile";
import type { AppState, FileItem, Commit, Language, RunOutput, EditorSettings } from "./types";
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

/** Default height for the output panel in pixels (always at bottom) */
const OUTPUT_HEIGHT = 250;

/**
 * Go backend URL for code execution.
 * The backend should be running at this address (see main.go).
 * It accepts POST requests with { language, code, stdin }.
 */
const API_URL = "http://localhost:8080";

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: 'var(--color-bg)',
  } as React.CSSProperties,
  loadingContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  spinner: {
    width: '40px',
    height: '40px',
    border: '2px solid transparent',
    borderTopColor: 'var(--color-accent)',
    borderRadius: '50%',
  } as React.CSSProperties,
  loadingText: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--color-bg)',
    overflow: 'hidden',
    paddingBottom: '28px', // Space for fixed status bar
  } as React.CSSProperties,
  mainContent: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
    overflow: 'hidden',
  } as React.CSSProperties,
  editorArea: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  } as React.CSSProperties,
  emptyState: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg)',
  } as React.CSSProperties,
  emptyStateContent: {
    textAlign: 'center',
  } as React.CSSProperties,
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 24px',
    borderRadius: '16px',
    backgroundColor: 'var(--color-surface)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s',
    border: '1px solid var(--color-border)',
    fontSize: '32px',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '8px',
  } as React.CSSProperties,
  emptyStateSubtitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  sidebarTrigger: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '20px',
    zIndex: 40,
  } as React.CSSProperties,
  sidebarIndicator: {
    position: 'absolute',
    left: '4px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '4px',
    height: '80px',
    background: 'linear-gradient(to bottom, transparent, var(--color-accent), transparent)',
    borderRadius: '9999px',
    opacity: 0.5,
  } as React.CSSProperties,
  sidebarPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 30,
    transition: 'transform 0.3s ease-out',
  } as React.CSSProperties,
  sidebarInner: {
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    borderRight: '1px solid var(--color-border)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  } as React.CSSProperties,
  pinButton: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    zIndex: 10,
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    cursor: 'pointer',
    border: 'none',
  } as React.CSSProperties,
  pinButtonActive: {
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
  } as React.CSSProperties,
  pinButtonInactive: {
    backgroundColor: 'var(--color-surface-2)',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  outputTrigger: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '20px',
    zIndex: 40,
  } as React.CSSProperties,
  outputIndicator: {
    position: 'absolute',
    left: '50%',
    bottom: '4px',
    transform: 'translateX(-50%)',
    width: '80px',
    height: '4px',
    background: 'linear-gradient(to right, transparent, var(--color-accent), transparent)',
    borderRadius: '9999px',
    opacity: 0.5,
  } as React.CSSProperties,
  outputPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    transition: 'transform 0.3s ease-out',
  } as React.CSSProperties,
  outputInner: {
    height: '100%',
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)',
    boxShadow: '0 -25px 50px -12px rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  } as React.CSSProperties,
  outputPinButton: {
    position: 'absolute',
    top: '8px',
    left: '12px',
    zIndex: 10,
  } as React.CSSProperties,
};

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

  /** Resizable sidebar width */
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH);

  /** Resizable output height */
  const [outputHeight, setOutputHeight] = useState(OUTPUT_HEIGHT);

  /** Detect mobile/portrait mode */
  const isMobile = useIsMobile();

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
    setEditorContent(content);

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
    
    // Auto-show output panel if setting is enabled
    if (state?.settings?.autoShowOutput) {
      setOutputPinned(true);
    }

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
  }, [activeFile, isRunning, state?.settings?.autoShowOutput]);

  /**
   * Clear the output panel.
   */
  const clearOutput = useCallback(() => setOutput(null), []);

  // ---------------------------------------------------------------------------
  // MOBILE TOGGLE HANDLERS
  // ---------------------------------------------------------------------------

  // Mobile toggle handlers - must be defined before any early returns
  const handleToggleSidebar = useCallback(() => {
    setSidebarPinned(prev => !prev);
    setSidebarHovered(false);
  }, []);

  const handleToggleOutput = useCallback(() => {
    setOutputPinned(prev => !prev);
    setOutputHovered(false);
  }, []);

  // ---------------------------------------------------------------------------
  // RESIZE HANDLERS
  // ---------------------------------------------------------------------------

  /** Handle sidebar width resize */
  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(prev => Math.max(200, Math.min(500, prev + delta)));
  }, []);

  /** Handle output height resize */
  const handleOutputResize = useCallback((delta: number) => {
    // Negative delta because dragging up should increase height
    setOutputHeight(prev => Math.max(150, Math.min(500, prev - delta)));
  }, []);

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Check if current file is settings.conf
   */
  const isSettingsFile = activeFile?.name === 'settings.conf';

  /**
   * Handle settings changes
   */
  const handleSettingsChange = useCallback((newSettings: EditorSettings) => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, settings: newSettings };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------

  if (!state) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent} className="animate-fade-in">
          <div style={styles.spinner} className="animate-spin" />
          <span style={styles.loadingText}>
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
    <div style={styles.appContainer} className="animate-fade-in">
      {/* Top header with logo, mobile toggles, and run button */}
      <Header
        activeFile={activeFile || null}
        onRun={runCode}
        isRunning={isRunning}
        isMobile={isMobile}
        sidebarVisible={sidebarVisible}
        onToggleSidebar={handleToggleSidebar}
        outputVisible={outputVisible}
        onToggleOutput={handleToggleOutput}
        hasOutput={!!output}
      />

      {/* Main content area */}
      <div style={styles.mainContent}>
        {/* Output hover trigger zone - on BOTTOM edge when output exists (desktop only) */}
        {output && !outputVisible && !isMobile && (
          <div 
            className="hover-trigger-zone"
            style={styles.outputTrigger}
            onMouseEnter={() => setOutputHovered(true)}
          >
            <div style={styles.outputIndicator} className="animate-pulse" />
          </div>
        )}

        {/* Output panel - BOTTOM on both desktop and mobile */}
        {output && (
          <div 
            className={`output-container ${isMobile ? 'mobile' : ''}`}
            style={{
              ...styles.outputPanel,
              height: outputHeight,
              // Respect sidebar width so they don't overlap
              left: sidebarVisible ? sidebarWidth : 0,
              transform: outputVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.3s ease-out, left 0.3s ease-out',
            }}
            onMouseEnter={() => !isMobile && setOutputHovered(true)}
            onMouseLeave={() => !isMobile && setOutputHovered(false)}
          >
            <div style={styles.outputInner}>
              {/* Vertical resizer on top edge of output */}
              {outputVisible && !isMobile && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  height: '6px',
                  zIndex: 50,
                }}>
                  <Resizer direction="vertical" onResize={handleOutputResize} />
                </div>
              )}

              {/* Pin button - hide on mobile since we use header buttons */}
              {!isMobile && (
                <button
                  onClick={() => setOutputPinned(!outputPinned)}
                  style={{
                    ...styles.pinButton,
                    ...styles.outputPinButton,
                    ...(outputPinned ? styles.pinButtonActive : styles.pinButtonInactive),
                  }}
                  title={outputPinned ? 'Unpin output' : 'Pin output'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                  </svg>
                </button>
              )}
              
              <Output
                stdout={output.stdout}
                stderr={output.stderr}
                onClear={clearOutput}
              />
            </div>
          </div>
        )}

        {/* Editor area - takes full space, shifts when panels are visible */}
        <div 
          className="editor-area"
          style={{
            ...styles.editorArea,
            // Sidebar on LEFT, Output on BOTTOM
            marginLeft: sidebarVisible ? sidebarWidth : 0,
            marginBottom: outputVisible ? outputHeight : 0,
            transition: 'margin-left 0.3s ease-out, margin-bottom 0.3s ease-out',
          }}
        >
          {isSettingsFile ? (
            // Show settings panel for settings.conf
            <Settings
              settings={state.settings}
              onSettingsChange={handleSettingsChange}
            />
          ) : activeFile ? (
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
              settings={state.settings}
            />
          ) : (
            // Empty state when no file is selected
            <div style={styles.emptyState}>
              <div style={styles.emptyStateContent} className="animate-fade-in">
                <div style={styles.emptyStateIcon}>
                  +
                </div>
                <p style={styles.emptyStateTitle}>
                  No file selected
                </p>
                <p style={styles.emptyStateSubtitle}>
                  {isMobile ? 'Tap 📁 for files' : 'Hover left edge for files'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar hover trigger zone - on LEFT edge (desktop only) */}
        {!isMobile && (
          <div 
            className="hover-trigger-zone"
            style={styles.sidebarTrigger}
            onMouseEnter={() => setSidebarHovered(true)}
          >
            {/* Visual indicator - only show when sidebar is hidden */}
            {!sidebarVisible && (
              <div style={styles.sidebarIndicator} className="animate-pulse" />
            )}
          </div>
        )}

        {/* Sidebar panel - LEFT side (both desktop and mobile) */}
        <div 
          className="sidebar-container"
          style={{
            ...styles.sidebarPanel,
            width: sidebarWidth,
            // Respect output panel height so they don't overlap
            bottom: outputVisible ? outputHeight : 0,
            transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-out, bottom 0.3s ease-out',
          }}
          onMouseEnter={() => !isMobile && setSidebarHovered(true)}
          onMouseLeave={() => !isMobile && setSidebarHovered(false)}
        >
          <div style={styles.sidebarInner}>
            {/* Pin button - hide on mobile since we use header buttons */}
            {!isMobile && (
              <button
                onClick={() => setSidebarPinned(!sidebarPinned)}
                style={{
                  ...styles.pinButton,
                  ...(sidebarPinned ? styles.pinButtonActive : styles.pinButtonInactive),
                }}
                title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                </svg>
              </button>
            )}

            {/* Horizontal resizer on right edge of sidebar */}
            {sidebarVisible && !isMobile && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '6px',
                zIndex: 50,
              }}>
                <Resizer direction="horizontal" onResize={handleSidebarResize} />
              </div>
            )}
            
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
      </div>

      {/* Fixed status bar - always at the absolute bottom */}
      <StatusBar 
        language={activeFile?.language || null}
        hasFile={!!activeFile}
      />
    </div>
  );
}

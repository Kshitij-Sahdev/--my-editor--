/**
 * Editor.tsx - CodeMirror 6 editor component
 *
 * This is the main code editing area using CodeMirror 6.
 * Features:
 * - Syntax highlighting for Python, C++, Java, Go, JavaScript
 * - Plain text mode for unsupported file types
 * - Keyboard shortcuts (Ctrl+Enter to run, Ctrl+S to commit)
 * - Inline commit input in the toolbar
 * - Line numbers, active line highlighting, bracket matching
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { javascript } from "@codemirror/lang-javascript";
import { GitCommit, Save, X, AlertCircle } from "lucide-react";
import type { Language } from "../types";
import { RUNNABLE_LANGUAGES, LANGUAGE_LABELS } from "../types";

// =============================================================================
// TYPES
// =============================================================================

interface EditorProps {
  /** Unique ID of the file being edited (used as React key) */
  fileId: string;
  /** Display name of the file */
  fileName: string;
  /** Programming language for syntax highlighting */
  language: Language;
  /** Initial content to display in the editor */
  content: string;
  /** Whether there are uncommitted changes */
  hasChanges: boolean;
  /** Callback when content changes (every keystroke) */
  onContentChange: (content: string) => void;
  /** Callback to run the code */
  onRun: () => void;
  /** Callback to commit changes with a message */
  onCommit: (message: string) => void;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    backgroundColor: 'var(--color-surface)',
  } as React.CSSProperties,
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid var(--color-border-subtle)',
    backgroundColor: 'var(--color-surface-2)',
  } as React.CSSProperties,
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  fileName: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '200px',
  } as React.CSSProperties,
  languageBadge: {
    padding: '4px 10px',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderRadius: '6px',
    fontWeight: 600,
    transition: 'all 0.2s',
  } as React.CSSProperties,
  runnableBadge: {
    backgroundColor: 'var(--color-accent-subtle)',
    color: 'var(--color-accent)',
  } as React.CSSProperties,
  nonRunnableBadge: {
    backgroundColor: 'var(--color-warning-subtle)',
    color: 'var(--color-warning)',
  } as React.CSSProperties,
  warningIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--color-warning)',
  } as React.CSSProperties,
  warningText: {
    fontSize: '10px',
    fontWeight: 500,
  } as React.CSSProperties,
  changesIndicator: {
    position: 'relative',
  } as React.CSSProperties,
  changesDot: {
    display: 'block',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-warning)',
  } as React.CSSProperties,
  changesDotPing: {
    position: 'absolute',
    inset: 0,
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-warning)',
  } as React.CSSProperties,
  committedBadge: {
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--color-success)',
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderRadius: '4px',
  } as React.CSSProperties,
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  commitForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  commitInput: {
    padding: '6px 12px',
    width: '256px',
    backgroundColor: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    color: 'var(--color-text)',
    outline: 'none',
    fontFamily: 'var(--font-mono)',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'var(--color-accent)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  } as React.CSSProperties,
  saveButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  } as React.CSSProperties,
  closeButton: {
    padding: '6px',
    color: 'var(--color-text-muted)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  commitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    color: 'var(--color-text-secondary)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    background: 'none',
  } as React.CSSProperties,
  kbd: {
    display: 'none',
    padding: '2px 6px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-muted)',
  } as React.CSSProperties,
  editorContainer: {
    flex: 1,
    overflow: 'hidden',
  } as React.CSSProperties,
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    borderTop: '1px solid var(--color-border-subtle)',
    backgroundColor: 'var(--color-surface-2)',
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
  } as React.CSSProperties,
  statusBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  statusBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  statusKbd: {
    padding: '2px 4px',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
  } as React.CSSProperties,
};

// =============================================================================
// LANGUAGE EXTENSIONS
// =============================================================================

/**
 * CodeMirror language extensions for syntax highlighting.
 * "text" language is not included - it gets no syntax highlighting.
 */
const languageExtensions: Partial<
  Record<Language, ReturnType<typeof python>>
> = {
  python: python(),
  cpp: cpp(),
  java: java(),
  go: go(),
  javascript: javascript(),
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function Editor({
  fileId,
  fileName,
  language,
  content,
  hasChanges,
  onContentChange,
  onRun,
  onCommit,
}: EditorProps) {
  // ---------------------------------------------------------------------------
  // REFS
  // ---------------------------------------------------------------------------

  /** Container element for CodeMirror to mount into */
  const containerRef = useRef<HTMLDivElement>(null);

  /** Reference to the CodeMirror EditorView instance */
  const viewRef = useRef<EditorView | null>(null);

  /**
   * Refs to hold latest callback functions.
   * This prevents recreating the editor when callbacks change.
   */
  const onRunRef = useRef(onRun);
  const onContentChangeRef = useRef(onContentChange);

  // Keep refs in sync with props
  onRunRef.current = onRun;
  onContentChangeRef.current = onContentChange;

  // ---------------------------------------------------------------------------
  // LOCAL STATE
  // ---------------------------------------------------------------------------

  /** Current commit message input */
  const [commitMessage, setCommitMessage] = useState("");

  /** Whether the commit input is visible */
  const [showCommit, setShowCommit] = useState(false);

  /** Whether we just committed (for animation) */
  const [justCommitted, setJustCommitted] = useState(false);

  // ---------------------------------------------------------------------------
  // DERIVED VALUES
  // ---------------------------------------------------------------------------

  /**
   * Whether this file type can be executed.
   * Only runnable languages have Docker runner images.
   */
  const isRunnable = RUNNABLE_LANGUAGES.includes(language);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Handle run keyboard shortcut (Ctrl+Enter).
   * Only runs if the language is supported.
   */
  const handleRun = useCallback(() => {
    if (isRunnable) {
      onRunRef.current();
    }
    return true; // Prevent default
  }, [isRunnable]);

  /**
   * Handle commit button/enter press.
   * Creates a commit and shows success animation.
   */
  const handleCommit = useCallback(() => {
    if (commitMessage.trim() && hasChanges) {
      onCommit(commitMessage.trim());
      setCommitMessage("");
      setShowCommit(false);

      // Show success animation
      setJustCommitted(true);
      setTimeout(() => setJustCommitted(false), 1500);
    }
  }, [commitMessage, hasChanges, onCommit]);

  // ---------------------------------------------------------------------------
  // CODEMIRROR INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize CodeMirror editor when component mounts or file changes.
   * The editor is recreated when fileId or language changes.
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up existing editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    // Custom keybindings for run and commit
    const runKeymap = keymap.of([
      {
        key: "Mod-Enter", // Ctrl+Enter (Cmd+Enter on Mac)
        run: handleRun,
        preventDefault: true,
      },
      {
        key: "Mod-s", // Ctrl+S (Cmd+S on Mac)
        run: () => {
          setShowCommit(true);
          return true;
        },
        preventDefault: true,
      },
    ]);

    // Listen for document changes
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onContentChangeRef.current(newContent);
      }
    });

    // Assemble extensions
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      oneDark, // Dark theme
      runKeymap,
      keymap.of([...defaultKeymap, ...historyKeymap]),
      updateListener,
      EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { overflow: "auto" },
      }),
    ];

    // Add language extension if supported (not for plain text)
    const langExt = languageExtensions[language];
    if (langExt) {
      extensions.push(langExt);
    }

    // Create editor state with content
    const state = EditorState.create({
      doc: content,
      extensions,
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    view.focus();

    // Cleanup on unmount
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [fileId, language, handleRun]);

  /**
   * Sync external content changes (e.g., from restoring a commit).
   * Only updates if the content is actually different.
   */
  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString();
      if (currentContent !== content) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        });
      }
    }
  }, [content]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div style={styles.container}>
      {/* Editor toolbar */}
      <div style={styles.toolbar}>
        {/* Left side: filename + language badge */}
        <div style={styles.toolbarLeft}>
          <span style={styles.fileName}>
            {fileName}
          </span>

          {/* Language badge with animation */}
          <span
            style={{
              ...styles.languageBadge,
              ...(isRunnable ? styles.runnableBadge : styles.nonRunnableBadge),
            }}
          >
            {LANGUAGE_LABELS[language]}
          </span>

          {/* Unsupported language warning */}
          {!isRunnable && (
            <div style={styles.warningIndicator} className="animate-fade-in">
              <AlertCircle size={12} />
              <span style={styles.warningText}>Not executable</span>
            </div>
          )}

          {/* Uncommitted changes indicator */}
          {hasChanges && (
            <div style={styles.changesIndicator} className="animate-scale-in">
              <span
                style={styles.changesDot}
                title="Uncommitted changes"
              />
              <span style={styles.changesDotPing} className="animate-ping" />
            </div>
          )}

          {/* Commit success indicator */}
          {justCommitted && (
            <span style={styles.committedBadge} className="animate-bounce-in">
              Committed!
            </span>
          )}
        </div>

        {/* Right side: commit controls */}
        <div style={styles.toolbarRight}>
          {showCommit ? (
            // Commit input form
            <div style={styles.commitForm} className="animate-slide-down">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommit();
                  if (e.key === "Escape") setShowCommit(false);
                }}
                placeholder="Describe your changes..."
                style={styles.commitInput}
                autoFocus
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || !hasChanges}
                style={{
                  ...styles.saveButton,
                  ...(!commitMessage.trim() || !hasChanges ? styles.saveButtonDisabled : {}),
                }}
                className="hover-lift"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={() => setShowCommit(false)}
                style={styles.closeButton}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            // Commit button
            <button
              onClick={() => setShowCommit(true)}
              style={styles.commitButton}
              title="Commit changes (Ctrl+S)"
            >
              <GitCommit size={14} />
              <span>Commit</span>
              <kbd style={{ ...styles.kbd, display: 'inline' }}>
                Ctrl+S
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror editor container */}
      <div ref={containerRef} style={styles.editorContainer} />

      {/* Status bar */}
      <div style={styles.statusBar}>
        <div style={styles.statusBarLeft}>
          <span>{LANGUAGE_LABELS[language]}</span>
          {!isRunnable && (
            <span style={{ color: 'var(--color-warning)' }}>
              Plain text mode - no execution available
            </span>
          )}
        </div>
        <div style={styles.statusBarRight}>
          {isRunnable && (
            <span>
              Run:{" "}
              <kbd style={styles.statusKbd}>
                Ctrl+Enter
              </kbd>
            </span>
          )}
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}

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
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--color-surface)]">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]">
        {/* Left side: filename + language badge */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[var(--color-text)] truncate max-w-[200px]">
            {fileName}
          </span>

          {/* Language badge with animation */}
          <span
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-md font-semibold transition-all ${
              isRunnable
                ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]"
            }`}
          >
            {LANGUAGE_LABELS[language]}
          </span>

          {/* Unsupported language warning */}
          {!isRunnable && (
            <div className="flex items-center gap-1.5 text-[var(--color-warning)] animate-fade-in">
              <AlertCircle size={12} />
              <span className="text-[10px] font-medium">Not executable</span>
            </div>
          )}

          {/* Uncommitted changes indicator */}
          {hasChanges && (
            <div className="relative animate-scale-in">
              <span
                className="block w-2.5 h-2.5 rounded-full bg-[var(--color-warning)]"
                title="Uncommitted changes"
              />
              <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--color-warning)] animate-ping" />
            </div>
          )}

          {/* Commit success indicator */}
          {justCommitted && (
            <span className="px-2 py-0.5 text-[10px] font-medium text-[var(--color-success)] bg-[var(--color-success)]/10 rounded animate-bounce-in">
              Committed!
            </span>
          )}
        </div>

        {/* Right side: commit controls */}
        <div className="flex items-center gap-2">
          {showCommit ? (
            // Commit input form
            <div className="flex items-center gap-2 animate-slide-down">
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCommit();
                  if (e.key === "Escape") setShowCommit(false);
                }}
                placeholder="Describe your changes..."
                className="px-3 py-1.5 w-64 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] font-mono transition-colors"
                autoFocus
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || !hasChanges}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white cursor-pointer transition-all hover-lift"
              >
                <Save size={14} />
                Save
              </button>
              <button
                onClick={() => setShowCommit(false)}
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            // Commit button
            <button
              onClick={() => setShowCommit(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] rounded-lg text-sm cursor-pointer transition-all"
              title="Commit changes (Ctrl+S)"
            >
              <GitCommit size={14} />
              <span className="hidden sm:inline">Commit</span>
              <kbd className="hidden md:inline px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[10px] font-mono text-[var(--color-text-muted)]">
                Ctrl+S
              </kbd>
            </button>
          )}
        </div>
      </div>

      {/* CodeMirror editor container */}
      <div ref={containerRef} className="flex-1 overflow-hidden" />

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-[10px] text-[var(--color-text-muted)] font-mono">
        <div className="flex items-center gap-4">
          <span>{LANGUAGE_LABELS[language]}</span>
          {!isRunnable && (
            <span className="text-[var(--color-warning)]">
              Plain text mode - no execution available
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isRunnable && (
            <span className="hidden sm:inline">
              Run:{" "}
              <kbd className="px-1 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded">
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

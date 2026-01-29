// CodeMirror editor setup and state management
import { useEffect, useRef } from "react";
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { basicSetup } from "@codemirror/basic-setup";
// Language support imports
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { HighlightStyle, tags } from "@codemirror/highlight";

// Supported languages
type Language = "python" | "cpp" | "java" | "go" | "javascript";

// Component props
type Props = {
  value: string;
  onEdit: (v: string) => void;
  language: Language;
  editorRef: React.MutableRefObject<EditorView | null>;
};

// Returns language extension for CodeMirror
function languageExt(lang: Language) {
  switch (lang) {
    case "python":
      return python();
    case "cpp":
      return cpp();
    case "java":
      return java();
    case "javascript":
      return javascript({ typescript: true });
    default:
      return [];
  }
}

// Dark theme for editor
const theme = EditorView.theme(
  {
    "&": { backgroundColor: "#0f1117", color: "#e5e7eb" },
    ".cm-content": { fontFamily: "JetBrains Mono, monospace", padding: "12px 0" },
    ".cm-gutters": { backgroundColor: "#0f1117", color: "#6b7280", border: "none" },
    ".cm-cursor": { borderLeftColor: "#7c7cff" },
    ".cm-selectionBackground": { backgroundColor: "rgba(124,124,255,0.3)" },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.04)" },
  },
  { dark: true }
);

// Syntax highlighting colors
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#c792ea" },
  { tag: tags.string, color: "#ecc48d" },
  { tag: tags.comment, color: "#637777", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
]);

export default function EditText({ value, onEdit, language, editorRef }: Props) {
  // Container for editor DOM element
  const container = useRef<HTMLDivElement>(null);

  // create editor ONCE
  useEffect(() => {
    if (!container.current) return;

    // Initial editor state with extensions
    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        indentOnInput(),
        theme,
        syntaxHighlighting(highlight),
        languageExt(language),
        // Callback when document changes
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onEdit(u.state.doc.toString());
        }),
      ],
    });

    // Create and mount editor view
    const view = new EditorView({ state, parent: container.current });
    editorRef.current = view;

    // Cleanup on unmount
    return () => {
      view.destroy();
      editorRef.current = null;
    };
  }, []);

  // update language only
  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;

    // Reconfigure editor with new language extension
    view.dispatch({
      effects: StateEffect.reconfigure.of([
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        bracketMatching(),
        indentOnInput(),
        theme,
        syntaxHighlighting(highlight),
        languageExt(language),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onEdit(u.state.doc.toString());
        }),
      ]),
    });
  }, [language]);

  return <div ref={container} style={{ height: "100%", borderRadius: 8, overflow: "hidden" }} />;
}

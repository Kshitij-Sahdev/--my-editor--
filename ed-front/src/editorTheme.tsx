// Custom editor theme and syntax highlighting
import { EditorView } from "@codemirror/view";
import { HighlightStyle, tags } from "@codemirror/highlight";

// Dark theme configuration for CodeMirror
export const editorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0f1117",
      color: "#e5e7eb",
      fontSize: "14px",
    },

    ".cm-content": {
      fontFamily: "JetBrains Mono, monospace",
      padding: "12px 0",
    },

    ".cm-gutters": {
      backgroundColor: "#0f1117",
      color: "#6b7280",
      border: "none",
    },

    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px",
    },

    ".cm-cursor": {
      borderLeftColor: "#7c7cff",
    },

    ".cm-selectionBackground": {
      backgroundColor: "rgba(124,124,255,0.25)",
    },

    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(124,124,255,0.35)",
    },

    ".cm-activeLine": {
      backgroundColor: "rgba(255,255,255,0.04)",
    },

    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255,255,255,0.04)",
    },
  },
  { dark: true }
);

// Syntax highlighting color scheme
export const syntaxHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#c792ea" },
  { tag: tags.string, color: "#ecc48d" },
  { tag: tags.comment, color: "#637777", fontStyle: "italic" },
  { tag: tags.number, color: "#f78c6c" },
  { tag: tags.function(tags.variableName), color: "#82aaff" },
  { tag: tags.typeName, color: "#7fdbca" },
  { tag: tags.operator, color: "#89ddff" },
  { tag: tags.variableName, color: "#e5e7eb" },
]);

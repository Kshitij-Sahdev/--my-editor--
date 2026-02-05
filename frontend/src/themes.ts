/**
 * themes.ts - CodeMirror 6 theme definitions
 *
 * Custom themes for the editor. Each theme is a CodeMirror Extension.
 * Themes define colors for the editor background, text, syntax highlighting, etc.
 */

import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

/**
 * AMOLED Black theme - Pure black background with neon green accents
 */
const amoledBlackTheme = EditorView.theme({
  "&": {
    backgroundColor: "#000000",
    color: "#fafafa",
  },
  ".cm-content": {
    caretColor: "#10b981",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#10b981",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
  ".cm-panels": {
    backgroundColor: "#050505",
    color: "#fafafa",
  },
  ".cm-searchMatch": {
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "rgba(16, 185, 129, 0.5)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    outline: "1px solid #10b981",
  },
  ".cm-gutters": {
    backgroundColor: "#000000",
    color: "#5c5c6a",
    borderRight: "1px solid #1a1a1a",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#0a0a0a",
    color: "#10b981",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "transparent",
    border: "none",
    color: "#10b981",
  },
}, { dark: true });

const amoledBlackHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#ff00ff", fontWeight: "bold" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#00ffff" },
  { tag: [t.function(t.variableName), t.labelName], color: "#00bfff" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#ff6600" },
  { tag: [t.definition(t.name), t.separator], color: "#fafafa" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#bf00ff" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#ffff00" },
  { tag: [t.meta, t.comment], color: "#666666", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#10b981", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#10b981" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#ff6600" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#39ff14" },
  { tag: t.invalid, color: "#ff4757" },
]);

/**
 * One Dark theme - Based on Atom One Dark
 */
const oneDarkCustomTheme = EditorView.theme({
  "&": {
    backgroundColor: "#282c34",
    color: "#abb2bf",
  },
  ".cm-content": {
    caretColor: "#528bff",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#528bff",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(97, 175, 239, 0.3)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(97, 175, 239, 0.1)",
  },
  ".cm-gutters": {
    backgroundColor: "#282c34",
    color: "#636d83",
    borderRight: "1px solid #3e4451",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#2c313c",
    color: "#abb2bf",
  },
}, { dark: true });

const oneDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#c678dd" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#e06c75" },
  { tag: [t.function(t.variableName), t.labelName], color: "#61afef" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#d19a66" },
  { tag: [t.definition(t.name), t.separator], color: "#abb2bf" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#e5c07b" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#56b6c2" },
  { tag: [t.meta, t.comment], color: "#5c6370", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#61afef", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#e06c75" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#d19a66" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#98c379" },
  { tag: t.invalid, color: "#ff4757" },
]);

/**
 * Dracula theme
 */
const draculaTheme = EditorView.theme({
  "&": {
    backgroundColor: "#282a36",
    color: "#f8f8f2",
  },
  ".cm-content": {
    caretColor: "#f8f8f2",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#f8f8f2",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(68, 71, 90, 0.8)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(68, 71, 90, 0.4)",
  },
  ".cm-gutters": {
    backgroundColor: "#282a36",
    color: "#6272a4",
    borderRight: "1px solid #44475a",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#44475a",
    color: "#f8f8f2",
  },
}, { dark: true });

const draculaHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#ff79c6" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#50fa7b" },
  { tag: [t.function(t.variableName), t.labelName], color: "#8be9fd" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#bd93f9" },
  { tag: [t.definition(t.name), t.separator], color: "#f8f8f2" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#ffb86c" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#ff79c6" },
  { tag: [t.meta, t.comment], color: "#6272a4", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#8be9fd", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#bd93f9" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#bd93f9" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#f1fa8c" },
  { tag: t.invalid, color: "#ff5555" },
]);

/**
 * Nord theme
 */
const nordTheme = EditorView.theme({
  "&": {
    backgroundColor: "#2e3440",
    color: "#d8dee9",
  },
  ".cm-content": {
    caretColor: "#88c0d0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#88c0d0",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(136, 192, 208, 0.3)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(136, 192, 208, 0.1)",
  },
  ".cm-gutters": {
    backgroundColor: "#2e3440",
    color: "#4c566a",
    borderRight: "1px solid #3b4252",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#3b4252",
    color: "#d8dee9",
  },
}, { dark: true });

const nordHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#81a1c1" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#88c0d0" },
  { tag: [t.function(t.variableName), t.labelName], color: "#8fbcbb" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#b48ead" },
  { tag: [t.definition(t.name), t.separator], color: "#d8dee9" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#ebcb8b" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#81a1c1" },
  { tag: [t.meta, t.comment], color: "#616e88", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#88c0d0", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#88c0d0" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#b48ead" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#a3be8c" },
  { tag: t.invalid, color: "#bf616a" },
]);

/**
 * GitHub Dark theme
 */
const githubDarkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#0d1117",
    color: "#c9d1d9",
  },
  ".cm-content": {
    caretColor: "#58a6ff",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#58a6ff",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(88, 166, 255, 0.3)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(88, 166, 255, 0.1)",
  },
  ".cm-gutters": {
    backgroundColor: "#0d1117",
    color: "#484f58",
    borderRight: "1px solid #21262d",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#161b22",
    color: "#c9d1d9",
  },
}, { dark: true });

const githubDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#ff7b72" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#79c0ff" },
  { tag: [t.function(t.variableName), t.labelName], color: "#d2a8ff" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#79c0ff" },
  { tag: [t.definition(t.name), t.separator], color: "#c9d1d9" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#ffa657" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#ff7b72" },
  { tag: [t.meta, t.comment], color: "#8b949e", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#58a6ff", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#79c0ff" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#79c0ff" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#a5d6ff" },
  { tag: t.invalid, color: "#f85149" },
]);

/**
 * Monokai theme
 */
const monokaiTheme = EditorView.theme({
  "&": {
    backgroundColor: "#272822",
    color: "#f8f8f2",
  },
  ".cm-content": {
    caretColor: "#f8f8f2",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#f8f8f2",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(73, 72, 62, 0.8)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(73, 72, 62, 0.4)",
  },
  ".cm-gutters": {
    backgroundColor: "#272822",
    color: "#75715e",
    borderRight: "1px solid #3e3d32",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#3e3d32",
    color: "#f8f8f2",
  },
}, { dark: true });

const monokaiHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#f92672" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#f8f8f2" },
  { tag: [t.function(t.variableName), t.labelName], color: "#a6e22e" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#ae81ff" },
  { tag: [t.definition(t.name), t.separator], color: "#f8f8f2" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#66d9ef" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#f92672" },
  { tag: [t.meta, t.comment], color: "#75715e", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#66d9ef", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#a6e22e" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#ae81ff" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#e6db74" },
  { tag: t.invalid, color: "#f92672" },
]);

/**
 * Solarized Dark theme
 */
const solarizedDarkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#002b36",
    color: "#839496",
  },
  ".cm-content": {
    caretColor: "#268bd2",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#268bd2",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(38, 139, 210, 0.3)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(38, 139, 210, 0.1)",
  },
  ".cm-gutters": {
    backgroundColor: "#002b36",
    color: "#586e75",
    borderRight: "1px solid #073642",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#073642",
    color: "#839496",
  },
}, { dark: true });

const solarizedDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#859900" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#268bd2" },
  { tag: [t.function(t.variableName), t.labelName], color: "#268bd2" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#cb4b16" },
  { tag: [t.definition(t.name), t.separator], color: "#839496" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#b58900" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#859900" },
  { tag: [t.meta, t.comment], color: "#586e75", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#268bd2", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#268bd2" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#d33682" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#2aa198" },
  { tag: t.invalid, color: "#dc322f" },
]);

/**
 * Tokyo Night theme
 */
const tokyoNightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1a1b26",
    color: "#a9b1d6",
  },
  ".cm-content": {
    caretColor: "#7aa2f7",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#7aa2f7",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "rgba(122, 162, 247, 0.3)",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(122, 162, 247, 0.1)",
  },
  ".cm-gutters": {
    backgroundColor: "#1a1b26",
    color: "#3b4261",
    borderRight: "1px solid #24283b",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#24283b",
    color: "#a9b1d6",
  },
}, { dark: true });

const tokyoNightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#bb9af7" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#7dcfff" },
  { tag: [t.function(t.variableName), t.labelName], color: "#7aa2f7" },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: "#ff9e64" },
  { tag: [t.definition(t.name), t.separator], color: "#a9b1d6" },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: "#e0af68" },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: "#89ddff" },
  { tag: [t.meta, t.comment], color: "#565f89", fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: "#7aa2f7", textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: "#7aa2f7" },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: "#ff9e64" },
  { tag: [t.processingInstruction, t.string, t.inserted], color: "#9ece6a" },
  { tag: t.invalid, color: "#f7768e" },
]);

// =============================================================================
// THEME MAP
// =============================================================================

/**
 * Map of theme IDs to their CodeMirror extensions
 */
export const editorThemes: Record<string, Extension> = {
  'amoled-black': [amoledBlackTheme, syntaxHighlighting(amoledBlackHighlight)],
  'one-dark': [oneDarkCustomTheme, syntaxHighlighting(oneDarkHighlight)],
  'dracula': [draculaTheme, syntaxHighlighting(draculaHighlight)],
  'nord': [nordTheme, syntaxHighlighting(nordHighlight)],
  'github-dark': [githubDarkTheme, syntaxHighlighting(githubDarkHighlight)],
  'monokai': [monokaiTheme, syntaxHighlighting(monokaiHighlight)],
  'solarized-dark': [solarizedDarkTheme, syntaxHighlighting(solarizedDarkHighlight)],
  'tokyo-night': [tokyoNightTheme, syntaxHighlighting(tokyoNightHighlight)],
};

/**
 * Get the theme extension for a given theme ID
 * Falls back to AMOLED Black if not found
 */
export function getTheme(themeId: string): Extension {
  return editorThemes[themeId] || editorThemes['amoled-black'];
}

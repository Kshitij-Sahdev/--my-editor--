import { useEffect, useRef } from "react";
import { EditorState, StateEffect } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "@codemirror/basic-setup";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";

type Language = "python" | "cpp" | "java" | "go" | "javascript";

type Props = {
  value: string;
  onEdit: (v: string) => void;
  language: Language;
};

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

export default function EditText({ value, onEdit, language }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // 1️⃣ Create editor ONCE
  useEffect(() => {
    if (!container.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        languageExt(language),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            onEdit(u.state.doc.toString());
          }
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: container.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []); // 👈 EMPTY DEP ARRAY

  // 2️⃣ Update language WITHOUT recreating editor
  useEffect(() => {
    if (!viewRef.current) return;

    viewRef.current.dispatch({
      effects: StateEffect.reconfigure.of([
        basicSetup,
        languageExt(language),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) {
            onEdit(u.state.doc.toString());
          }
        }),
      ]),
    });
  }, [language]);

  return <div ref={container} style={{ height: 300, border: "1px solid #444" }} />;
}

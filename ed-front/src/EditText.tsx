import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "@codemirror/basic-setup";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";


type Props = {
  value: string;
  onEdit: (v: string) => void;
  language: "python" | "cpp" | "java" | "go" | "javascript";

};

function getLanguageExtension(language: Props["language"]) {
  switch (language) {
    case "python":
      return python();
    case "cpp":
      return cpp();
    case "java":
      return java();
    case "javascript":
      return javascript({ typescript: true });
    case "go":
      return []; // fallback, no official CM6 Go yet
    default:
      return [];
  }
}


export default function EditText({ value, onEdit, language }: Props) {
  const box = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!box.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          getLanguageExtension(language),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              onEdit(u.state.doc.toString());
            }
          }),
        ],
      }),
      parent: box.current,
    });

    return () => view.destroy();
  }, [value, language]);

  return <div ref={box} style={{ height: 300, border: "1px solid #444" }} />;
}

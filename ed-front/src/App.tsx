// React imports for state and lifecycle management
import { useEffect, useRef, useState } from "react";
import EditText from "./EditText";
import { EditorView } from "@codemirror/view";

// Supported programming languages
type Language = "python" | "cpp" | "java" | "go" | "javascript";

// Default code templates for each language
const templates: Record<Language, string> = {
  python: `print("hello world")`,

  cpp: `#include <iostream>
using namespace std;

int main() {
  cout << "hello world";
  return 0;
}`,

  java: `public class Main {
  public static void main(String[] args) {
    System.out.println("hello world");
  }
}`,

  go: `package main

import "fmt"

func main() {
  fmt.Println("hello world")
}`,

  javascript: `console.log("hello world")`,
};

export default function App() {
  // Current selected language
  const [language, setLanguage] = useState<Language>("python");
  // Code text in editor
  const [text, setText] = useState(templates.python);
  // Execution output
  const [output, setOutput] = useState("");
  // Track if code is currently running
  const [running, setRunning] = useState(false);

  // Reference to the CodeMirror editor instance
  const editorRef = useRef<EditorView | null>(null);

  // 🔑 reset editor content when language changes
  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;

    // Get template for selected language
    const template = templates[language];

    // Replace entire editor content with new template
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: template,
      },
    });

    // Update state
    setText(template);
    setOutput("");
  }, [language]);

  // Execute code on backend
  // Execute code on backend
  async function run() {
    setRunning(true);
    setOutput("");

    try {
      // Send code to backend API
      const res = await fetch("http://localhost:8080/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code: text,
          stdin: "",
        }),
      });

      // Display stdout or stderr
      const data = await res.json();
      setOutput(data.stderr || data.stdout || "");
    } catch (e) {
      setOutput("failed to run code");
    } finally {
      setRunning(false);
    }
  }

  // Ctrl / Cmd + Enter
  useEffect(() => {
    // Keyboard shortcut to run code
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  return (
    <div className="app-root">
      {/* top bar */}
      <div className="top-bar">
        <div style={{ fontWeight: 600 }}>run()</div>

        <div style={{ display: "flex", gap: 8 }}>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
            <option value="javascript">JavaScript</option>
          </select>

          <button onClick={run} disabled={running}>
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      {/* editor */}
      <div className="editor-wrap">
        <EditText
          value={text}
          language={language}
          onEdit={setText}
          editorRef={editorRef}
        />
      </div>

      {/* output */}
      <div className="output-wrap">
        <div className="output-title">Output</div>
          <pre className="output-body">
            {output || "(no output yet)"}
          </pre>
        </div>
      </div>
  );
}

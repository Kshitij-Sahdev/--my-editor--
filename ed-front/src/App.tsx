import { useEffect, useState } from "react";
import EditText from "./EditText.tsx";

  const templates = {
  python: `print("hello world")`,

  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "hello world" << endl;
    return 0;
}
`,

  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("hello world");
    }
}
`,

  go: `package main

import "fmt"

func main() {
    fmt.Println("hello world")
}
`,

  javascript: `console.log("hello world");`,
  } as const;

export default function ControlApp() {

  const [language, setLanguage] = useState<"python" | "cpp" | "java" | "go" | "javascript">(
  "python"
  );

  const [text, setText] = useState<string>(
    templates[language]
  );

  const [result, setResult] = useState(
    "aint shi will be executed"
  );

  function run() {
    setResult("connect the backend stupid");
  }

  useEffect(() => {
    setText(templates[language]);
  }, [language]);


  return (
    <div style={{ padding: 16 }}>
      <h1>Code Runner</h1>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as typeof language)}
      >
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
        <option value="go">Go</option>
        <option value="javascript">JavaScript</option>
      </select>


      <EditText
        value={text}
        onEdit={setText}
        language={language}
      />

      <button onClick={run}>
        Run
      </button>

      <pre>
        {result}
      </pre>
    </div>
  );
}

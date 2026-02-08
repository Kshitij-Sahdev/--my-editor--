import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// Get computed CSS variable value
const getCSSVar = (name: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";
};

interface TerminalProps {
  isVisible: boolean;
  onClose?: () => void;
}

// WebSocket connection state
type WSState = "disconnected" | "connecting" | "connected" | "running";

interface WSMessage {
  type: "init" | "stdin" | "kill";
  language?: string;
  code?: string;
  data?: string;
}

interface WSResponse {
  type: "stdout" | "stderr" | "exit" | "error";
  data?: string;
  code?: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const WS_URL = API_URL.replace(/^http/, "ws") + "/ws";

export function XTerminal({ isVisible, onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<WSState>("disconnected");

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      allowProposedApi: true,
      disableStdin: false,
      theme: {
        background: getCSSVar("--color-bg") || "#000000",
        foreground: getCSSVar("--color-text") || "#fafafa",
        cursor: getCSSVar("--color-accent") || "#10b981",
        cursorAccent: getCSSVar("--color-bg") || "#000000",
        selectionBackground: getCSSVar("--color-surface-hover") || "#141414",
        black: getCSSVar("--color-bg") || "#000000",
        red: getCSSVar("--color-error") || "#ff4757",
        green: getCSSVar("--neon-green") || "#39ff14",
        yellow: getCSSVar("--neon-yellow") || "#ffff00",
        blue: getCSSVar("--neon-blue") || "#00bfff",
        magenta: getCSSVar("--neon-pink") || "#ff00ff",
        cyan: getCSSVar("--neon-cyan") || "#00ffff",
        white: getCSSVar("--color-text") || "#fafafa",
        brightBlack: getCSSVar("--color-text-muted") || "#5c5c6a",
        brightRed: "#ff6b6b",
        brightGreen: getCSSVar("--color-success") || "#2ed573",
        brightYellow: getCSSVar("--color-warning") || "#ffa502",
        brightBlue: getCSSVar("--neon-blue") || "#00bfff",
        brightMagenta: getCSSVar("--neon-purple") || "#bf00ff",
        brightCyan: getCSSVar("--neon-cyan") || "#00ffff",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    
    // Focus terminal for keyboard input
    terminal.focus();
    fitAddon.fit();

    terminal.writeln("\x1b[36m╔═══════════════════════════════════════╗\x1b[0m");
    terminal.writeln("\x1b[36m║\x1b[0m   \x1b[1;33mInteractive Terminal\x1b[0m                \x1b[36m║\x1b[0m");
    terminal.writeln("\x1b[36m╠═══════════════════════════════════════╣\x1b[0m");
    terminal.writeln("\x1b[36m║\x1b[0m  Press \x1b[32mRun\x1b[0m to execute your code       \x1b[36m║\x1b[0m");
    terminal.writeln("\x1b[36m║\x1b[0m  Press \x1b[33mCtrl+C\x1b[0m to kill the process     \x1b[36m║\x1b[0m");
    terminal.writeln("\x1b[36m╚═══════════════════════════════════════╝\x1b[0m");
    terminal.writeln("");

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle keyboard input - set up once here
    terminal.onData((data) => {
      const term = terminalRef.current;
      if (!term) return;

      // Ctrl+C (ASCII code 3) - kill the process
      if (data === "\x03") {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const msg: WSMessage = { type: "kill" };
          wsRef.current.send(JSON.stringify(msg));
        }
        term.writeln("\r\n\x1b[33m[Ctrl+C]\x1b[0m");
        return;
      }
      
      // Echo input locally
      if (data === "\r") {
        term.write("\r\n");
      } else if (data === "\x7f") {
        // Backspace
        term.write("\b \b");
      } else if (data.charCodeAt(0) >= 32) {
        // Printable characters
        term.write(data);
      }
      
      // Send to backend if running
      const wsState = wsRef.current?.readyState;
      const runState = stateRef.current;
      
      if (wsState === WebSocket.OPEN && runState === "running") {
        // Convert Enter (\r) to newline (\n) for stdin - Python expects \n
        let stdinData = data;
        if (data === "\r") {
          stdinData = "\n";
          console.log("[stdin] Converting \\r to \\n");
        }
        const msg: WSMessage = { type: "stdin", data: stdinData };
        wsRef.current!.send(JSON.stringify(msg));
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  // Fit and focus terminal when visibility changes
  useEffect(() => {
    if (isVisible && fitAddonRef.current && terminalRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        terminalRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  // Connect to WebSocket and run code
  const runCode = useCallback((language: string, code: string) => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    terminal.clear();
    terminal.writeln(`\x1b[90m[Connecting to server...]\x1b[0m`);
    stateRef.current = "connecting";

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      terminal.writeln(`\x1b[32m[Connected]\x1b[0m`);
      terminal.writeln(`\x1b[90m[Running ${language}...]\x1b[0m`);
      terminal.writeln("");
      stateRef.current = "running";

      // Send init message with code
      const initMsg: WSMessage = {
        type: "init",
        language,
        code,
      };
      ws.send(JSON.stringify(initMsg));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSResponse = JSON.parse(event.data);
        switch (msg.type) {
          case "stdout":
            // Convert \n to \r\n for proper terminal line handling
            terminal.write((msg.data || "").replace(/\n/g, "\r\n"));
            break;
          case "stderr":
            terminal.write(`\x1b[31m${(msg.data || "").replace(/\n/g, "\r\n")}\x1b[0m`);
            break;
          case "exit":
            terminal.writeln("");
            if (msg.code === 0) {
              terminal.writeln(`\x1b[32m[Process exited with code ${msg.code}]\x1b[0m`);
            } else {
              terminal.writeln(`\x1b[31m[Process exited with code ${msg.code}]\x1b[0m`);
            }
            stateRef.current = "connected";
            break;
          case "error":
            terminal.writeln(`\x1b[31m[Error: ${msg.data}]\x1b[0m`);
            stateRef.current = "connected";
            break;
        }
      } catch {
        terminal.write(event.data);
      }
    };

    ws.onerror = () => {
      terminal.writeln(`\x1b[31m[Connection error]\x1b[0m`);
      stateRef.current = "disconnected";
    };

    ws.onclose = () => {
      if (stateRef.current === "running") {
        terminal.writeln(`\x1b[90m[Disconnected]\x1b[0m`);
      }
      stateRef.current = "disconnected";
    };
  }, []);

  // Kill running process
  const killProcess = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: WSMessage = { type: "kill" };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // Expose methods to parent
  useEffect(() => {
    window.terminalAPI = {
      run: runCode,
      kill: killProcess,
      clear: () => terminalRef.current?.clear(),
      write: (text: string) => terminalRef.current?.write(text),
      writeln: (text: string) => terminalRef.current?.writeln(text),
    };

    return () => {
      delete window.terminalAPI;
    };
  }, [runCode, killProcess]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--color-bg)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "var(--color-surface-2)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span style={{ color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 500 }}>
          TERMINAL
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={killProcess}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "var(--color-error-subtle)",
              color: "var(--color-error)",
              border: "1px solid var(--color-error)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Kill
          </button>
          <button
            onClick={() => terminalRef.current?.clear()}
            style={{
              padding: "4px 8px",
              fontSize: "11px",
              backgroundColor: "var(--color-surface-hover)",
              color: "var(--color-text-muted)",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: "4px 8px",
                fontSize: "11px",
                backgroundColor: "var(--color-surface-hover)",
                color: "var(--color-text-muted)",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Terminal container */}
      <div
        ref={containerRef}
        onClick={() => terminalRef.current?.focus()}
        onFocus={() => terminalRef.current?.focus()}
        tabIndex={0}
        style={{
          flex: 1,
          padding: "8px",
          overflow: "hidden",
          cursor: "text",
        }}
      />
    </div>
  );
}

// Type declaration for global terminal API
declare global {
  interface Window {
    terminalAPI?: {
      run: (language: string, code: string) => void;
      kill: () => void;
      clear: () => void;
      write: (text: string) => void;
      writeln: (text: string) => void;
    };
  }
}

export default XTerminal;

# Code Runner — System Design Document

> A browser-based, multi-language code execution platform with a real-time interactive terminal, file system, and lightweight version control — built on a Go backend and a React frontend.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend — Go Server](#3-backend--go-server)
   - 3.1 [Configuration](#31-configuration)
   - 3.2 [Language Registry](#32-language-registry)
   - 3.3 [API Surface](#33-api-surface)
   - 3.4 [Execution Modes](#34-execution-modes)
   - 3.5 [Security & Sandboxing](#35-security--sandboxing)
   - 3.6 [Rate Limiting](#36-rate-limiting)
   - 3.7 [WebSocket Protocol](#37-websocket-protocol)
   - 3.8 [Static File Serving & SPA Fallback](#38-static-file-serving--spa-fallback)
4. [Frontend — React Application](#4-frontend--react-application)
   - 4.1 [Entry Point](#41-entry-point)
   - 4.2 [Application State Model](#42-application-state-model)
   - 4.3 [Component Hierarchy](#43-component-hierarchy)
   - 4.4 [Layout System](#44-layout-system)
   - 4.5 [Persistence Layer](#45-persistence-layer)
   - 4.6 [Theming & Fonts](#46-theming--fonts)
   - 4.7 [Code Execution Flow](#47-code-execution-flow)
   - 4.8 [Version Control (Commits)](#48-version-control-commits)
5. [Containerization](#5-containerization)
6. [Data Flow Diagrams](#6-data-flow-diagrams)
7. [Non-Functional Properties](#7-non-functional-properties)
8. [Scalability & Future Considerations](#8-scalability--future-considerations)

---

## 1. Project Overview

**Code Runner** is a self-hostable, full-stack online IDE that lets users write, run, and iterate on code in five languages directly in the browser — no installation, no sign-in. The system is designed around two pillars:

- **Security first**: user code runs inside Docker containers with all network, filesystem, process, and capability restrictions applied.
- **Interactive by default**: rather than a static batch "run and wait" model, execution is streamed character-by-character over a WebSocket so programs that prompt for `stdin` work naturally.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser                          │
│                                                      │
│   ┌─────────────┐   ┌──────────────────────────┐     │
│   │  React SPA  │   │    XTerminal (xterm.js)  │     │
│   │  (App.tsx)  │◄──►  WebSocket /api/ws       │     │
│   └──────┬──────┘   └──────────────────────────┘     │
│          │ POST /api/run (batch fallback)            │
└──────────┼───────────────────────────────────────────┘
           │ HTTP / WebSocket
           ▼
┌──────────────────────────────────────────────────────┐
│              Go HTTP Server (main.go)                │
│                                                      │
│  /api/health   /api/run (HTTP POST)   /api/ws (WS)   │
│                                                      │
│   ┌────────────┐    ┌─────────────────────────────┐  │
│   │Rate Limiter│    │     Execution Engine        │  │
│   │(per-IP,    │    │                             │  │
│   │ in-memory) │    │  ┌──────────┐ ┌──────────┐  │  │
│   └────────────┘    │  │ Docker   │ │  Native  │  │  │
│                     │  │ (secure) │ │(fallback)│  │  │
│                     │  └────┬─────┘ └────┬─────┘  │  │
│                     └───────┼────────────┼────────┘  │
└─────────────────────────────┼────────────┼───────────┘
                              │            │
          ┌───────────────────┘            │
          ▼                                ▼
  ┌──────────────────┐          ┌─────────────────────┐
  │  Docker Daemon   │          │ Host Runtime        │
  │                  │          │ python3 / node      │
  │  runner-python   │          │ (Termux / no Docker)│
  │  runner-js       │          └─────────────────────┘
  │  runner-go       │
  │  runner-cpp      │
  │  runner-java     │
  └──────────────────┘
```

The Go server is stateless — every execution spawns a fresh child process (or Docker container) and cleans up after itself. All user-facing state (files, editor content, commits, settings) lives in the **browser's `localStorage`**, making the system trivially horizontally scalable: any replica can serve any request.

---

## 3. Backend — Go Server

### 3.1 Configuration

All tunables are collected into a single anonymous struct at startup, populated from environment variables with safe defaults:

| Key | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | TCP port the server binds on |
| `MaxCodeSize` | 64 KB | Maximum bytes accepted for source code |
| `MaxStdinSize` | 1 MB | Maximum bytes accepted for stdin |
| `MaxOutputSize` | 1 MB | stdout/stderr capture cap (prevents runaway output) |
| `MaxConcurrent` | `3` | Max simultaneous executions per client IP |
| `TimeoutBatch` | 10 s | Deadline for `/api/run` executions |
| `TimeoutStream` | 5 min | Deadline for `/api/ws` sessions |
| `DockerAvail` | auto-detected | Whether Docker daemon is accessible |

`DockerAvail` is probed at startup by running `docker info` — if it exits cleanly, Docker mode is activated; otherwise the server falls back to native process execution. This lets the server run on constrained environments (Termux on Android, minimal CI runners) without reconfiguration.

### 3.2 Language Registry

Each supported language is described by a `LangConfig` struct:

```go
type LangConfig struct {
    Filename string        // source file written inside the temp dir
    Image    string        // Docker image tag to use
    Compile  string        // optional compile step; empty = interpreted
    Run      string        // run command
    Timeout  time.Duration // per-language execution deadline
}
```

Languages supported out of the box:

| Language | Filename | Compile step | Run command | Timeout |
|---|---|---|---|---|
| Python | `main.py` | — | `python3 main.py` | 5 s |
| JavaScript | `main.js` | — | `node main.js` | 5 s |
| Go | `main.go` | `go build -o /tmp/prog main.go` | `/tmp/prog` | 10 s |
| C++ | `main.cpp` | `g++ -O2 -o /tmp/prog main.cpp` | `/tmp/prog` | 10 s |
| Java | `Main.java` | `javac -d /tmp Main.java` | `java -cp /tmp Main` | 10 s |

Adding a new language requires only a new entry in the `languages` map — no handler code changes.

### 3.3 API Surface

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Returns `{"status":"ok","docker":bool}` |
| `/api/run` | POST | Batch execution — runs code and returns complete output |
| `/api/ws` | WebSocket | Streaming execution with interactive stdin |
| `/` (static) | GET | Serves the React SPA from `../frontend/dist` (if built) |

CORS is applied to all HTTP endpoints via a dedicated middleware function, allowing any origin so the React dev server can communicate freely during development.

### 3.4 Execution Modes

**Docker mode (`executeDocker`)** — primary path when Docker is available:

1. Create a uniquely-named temp directory on the host (`os.MkdirTemp`).
2. Write the source file into it.
3. If the language needs compilation, join compile and run commands with `&&`.
4. Launch `docker run` with the temp directory bind-mounted as `/app`, passing stdin through a pipe.
5. Capture stdout and stderr through `limitedWriter` wrappers to enforce `MaxOutputSize`.
6. Remove the temp directory (`defer os.RemoveAll`).

**Native mode (`executeNative`)** — fallback for environments without Docker:

Supports only Python and JavaScript (interpreted, lower risk). For compiled languages, returns an explanatory error rather than silently running unsafe code.

For WebSocket sessions, the same two paths exist but the process is launched with full pipe plumbing (`StdinPipe`, `StdoutPipe`, `StderrPipe`) and goroutines stream each pipe concurrently to the WebSocket connection.

### 3.5 Security & Sandboxing

Every Docker execution is hardened with the following flags:

| Flag | Effect |
|---|---|
| `--network=none` | No outbound or inbound network access |
| `--memory=256m --memory-swap=256m` | Hard memory ceiling, no swap |
| `--cpus=1.0` | CPU quota capped to one core |
| `--pids-limit=128` | Prevents fork bombs |
| `--read-only` | Container root filesystem is read-only |
| `--cap-drop=ALL` | All Linux capabilities dropped |
| `--security-opt no-new-privileges` | Prevents privilege escalation via `setuid` |
| `--ulimit fsize=10485760` | 10 MB max file write |
| `--ulimit nofile=256` | Max 256 open file descriptors |
| `--tmpfs /tmp:rw,exec,size=64m` | 64 MB writable tmpfs at `/tmp` (compile output) |

The user-supplied code file is bind-mounted read-write (needed for compiled languages to produce their binary) but the container filesystem itself is read-only, so the code cannot escape to the host.

The Dockerfile for the C++ runner (representative of the compiled language images) runs as a non-root `runner` user from the start, providing an additional layer of isolation.

### 3.6 Rate Limiting

A simple in-memory map tracks concurrent executions per client IP address:

```
rateLimiter: map[string]int  (IP → active slot count)
```

`acquireSlot` increments the counter and returns `false` (→ HTTP 429) if the count would exceed `MaxConcurrent`. `releaseSlot` decrements via `defer`, ensuring cleanup even on panics. The IP is extracted from `X-Forwarded-For` (respecting reverse proxy headers) with fallback to `RemoteAddr`.

This is an in-process, non-persistent counter — it resets on restart and does not coordinate across replicas. For a multi-replica deployment, this should be replaced with a Redis-backed counter.

### 3.7 WebSocket Protocol

The client speaks a simple JSON protocol over a single WebSocket connection:

**Client → Server messages:**

| `type` | Extra fields | Meaning |
|---|---|---|
| `init` | `language`, `code` | Start a new execution |
| `stdin` | `data` | Send a character or line to the process's stdin |
| `eof` | — | Close stdin (equivalent to Ctrl+D) |
| `kill` | — | Terminate the running process immediately |

**Server → Client messages:**

| `type` | Extra fields | Meaning |
|---|---|---|
| `stdout` | `data` | Chunk of stdout from the process |
| `stderr` | `data` | Chunk of stderr from the process |
| `exit` | `code` | Process terminated; includes exit code |
| `error` | `data` | Protocol or execution setup error |

The server spawns three goroutines for each session: one to read stdout, one to read stderr, and one to forward incoming WebSocket messages to stdin. A `sync.WaitGroup` ensures all goroutines complete before the exit message is sent and the connection is closed.

### 3.8 Static File Serving & SPA Fallback

When `../frontend/dist` exists (i.e., the React app has been built), the server mounts a file handler at `/` that implements the SPA fallback pattern: any path that does not match an existing file is served `index.html`, allowing React Router (or equivalent) to handle client-side routing.

---

## 4. Frontend — React Application

### 4.1 Entry Point

`main.tsx` is the Vite entry point. It renders `<App />` inside React 18's `StrictMode`, which activates double-invocation of effects in development to surface side-effects:

```tsx
createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
```

A global stylesheet (`styles/index.css`) is imported here, setting base resets and CSS custom property defaults.

### 4.2 Application State Model

`App.tsx` owns all mutable application state. The state surface is explicitly typed as `AppState | null` (null before localStorage hydration completes):

| State variable | Type | Description |
|---|---|---|
| `state` | `AppState \| null` | Full persisted state (files, commits, settings, activeFileId) |
| `output` | `RunOutput \| null` | stdout/stderr from the last execution |
| `isRunning` | `boolean` | Locks the Run button during execution |
| `editorContent` | `string` | Live content of the active file (drives dirty indicator) |
| `savedContent` | `string` | Content at last commit (used to compute `hasChanges`) |
| `sidebarPinned / Hovered` | `boolean` | Controls sidebar overlay visibility |
| `outputPinned / Hovered` | `boolean` | Controls output panel overlay visibility |
| `sidebarWidth` | `number` | Resizable sidebar width (px), default 280 |
| `outputHeight` | `number` | Resizable output height (px), default 250 |
| `isMobile` | `boolean` | From `useIsMobile` hook; triggers responsive layout |
| `networkStatus` | `object` | From `useNetworkStatus` hook; drives offline indicator |

Additionally, a `currentContentRef` (`useRef`) mirrors `editorContent` for use inside callbacks without triggering re-renders — important for `runCode`, which must read the very latest content at call time.

### 4.3 Component Hierarchy

```
App (state owner)
├── Header          — logo, Run button, mobile sidebar/output toggles, offline badge
├── main content div
│   ├── Sidebar     — file tree, commit history, diff indicator
│   │   └── (Resizer — horizontal drag handle)
│   ├── Editor      — Monaco / CodeMirror instance
│   ├── Settings    — shown in place of Editor for settings.conf
│   ├── XTerminal   — xterm.js instance; communicates via window.terminalAPI
│   │   └── (Resizer — vertical drag handle)
│   └── (hover trigger zones — invisible edge strips)
└── StatusBar       — language indicator, always-visible bottom bar
```

**Key design decision**: the `Sidebar` and `XTerminal` (output) panels are rendered as absolutely-positioned overlays that slide in via CSS `transform: translateX/Y`. The `Editor` responds by adjusting its `marginLeft` and `marginBottom` with matching CSS transitions, creating a smooth push-aside effect on desktop and a full-cover sheet on mobile.

### 4.4 Layout System

The layout uses two complementary overlay patterns:

**Hover-to-reveal (desktop):** thin trigger zones (20 px strips) sit on the left and bottom edges of the main content area. Hovering over them sets `sidebarHovered` or `outputHovered` to true, which slides in the panel. Moving the mouse back out collapses it unless the panel is pinned.

**Pin / always-open (desktop + mobile):** a pin button inside each panel sets `sidebarPinned` / `outputPinned`, keeping the panel visible regardless of hover state. On mobile, the header provides toggle buttons that flip pinned state directly.

**Z-index layering:**
- Sidebar: `z-index: 35`
- Output panel: `z-index: 25`
- Hover trigger zones: `z-index: 40`
- Resizer handles: `z-index: 50`

The sidebar deliberately sits above the output panel so that when both are open, the sidebar cleanly overlaps the output corner.

**Resizing:** `Resizer` components emit delta values on mouse drag. Sidebar width is clamped to `[200, 500]` px; output height to `[150, 500]` px. The sidebar bottom edge also tracks `outputHeight` when the output is pinned open, preventing the two panels from visually overlapping.

### 4.5 Persistence Layer

All application state is serialized to `localStorage` on every state change (via a `useEffect` on `state`). On mount, `loadState()` hydrates the initial state. The storage module also persists the last execution result separately (`saveLastExecution` / `loadLastExecution`), so output survives a page refresh even without re-running.

The storage module exposes pure functions:

| Function | Purpose |
|---|---|
| `loadState()` | Deserialize full `AppState` from localStorage |
| `saveState(state)` | Serialize full `AppState` to localStorage |
| `createFile(name, lang, parentId)` | Factory — new `FileItem` with default template code |
| `createFolder(name, parentId)` | Factory — new folder node |
| `createCommit(fileId, content, message)` | Factory — new `Commit` snapshot |
| `getFileCommits(commits, fileId)` | Returns commits for a file, newest first |
| `saveLastExecution(result)` | Persist last run output |
| `loadLastExecution()` | Restore last run output |

### 4.6 Theming & Fonts

Themes are applied by writing CSS custom properties directly to `document.documentElement.style`. The `THEME_CSS_VARS` map (from `types.ts`) associates each theme ID with a full set of CSS variable values (`--color-bg`, `--color-surface`, `--color-accent`, etc.). A `useEffect` that watches `state.settings.theme` applies the variables on every change, making theme switching instant without a page reload.

Fonts follow the same pattern: `AVAILABLE_FONTS` maps font IDs to CSS `font-family` strings, applied to the `--font-mono` variable used by the editor and terminal.

### 4.7 Code Execution Flow

```
User clicks Run
    │
    ▼
runCode() callback
    │
    ├─ window.terminalAPI exists?
    │       │ YES → terminalAPI.run(language, code)
    │       │       (XTerminal handles WS session directly)
    │       │       return
    │       │
    │       NO ↓
    │
    ├─ POST /api/run { language, code, stdin }
    │       │
    │       ▼
    │   executeCode() (hooks/execute.ts)
    │       │
    │       ▼
    │   RunResponse { stdout, stderr, success }
    │       │
    │       ▼
    │   setOutput({ stdout, stderr })
    │   saveLastExecution(...)
    │
    └─ setIsRunning(false)
```

The `XTerminal` component exposes a `window.terminalAPI` object when mounted, giving `App` a way to delegate execution to it without prop drilling. When the terminal is visible, it takes priority because it supports interactive stdin; the HTTP batch path is only used as a fallback.

If `state.settings.autoShowOutput` is enabled, `runCode` sets `outputPinned = true` before launching execution, ensuring the output panel is visible by the time the first output arrives.

### 4.8 Version Control (Commits)

The app includes a lightweight, local-only version control system:

- A `Commit` is a snapshot of a file's content at a point in time, stored in the `AppState.commits` array alongside an ISO timestamp and a user-provided message.
- `hasChanges` is a derived boolean computed by comparing `editorContent` (live) with `savedContent` (the content at the most recent commit, or the file's original content if no commits exist). This drives the dirty indicator in the editor and sidebar.
- `handleCommit` creates a new commit and updates `savedContent` to the current content.
- `handleRestore` replaces the editor content with a past commit's snapshot and resets `savedContent` to that snapshot, making the restored state the new baseline.

---

## 5. Containerization

The provided `Dockerfile` (C++ runner, representative of all compiled-language images) illustrates the runner image pattern:

```dockerfile
FROM gcc:13
RUN useradd -m runner      # create non-root user
USER runner                # drop privileges immediately
WORKDIR /app               # code is mounted here at runtime
CMD ["bash", "-c", "g++ main.cpp -O2 -o main && ./main"]
```

Each language has its own image (`runner-python`, `runner-js`, `runner-go`, `runner-cpp`, `runner-java`) built from the appropriate base. The images are intentionally minimal — no package managers, no shells beyond `sh/bash` (needed to chain compile+run). They are never updated during execution; all user code is injected via bind mount.

---

## 6. Data Flow Diagrams

### Batch Execution (HTTP)

```
Browser                 Go Server              Docker
   │                        │                     │
   │  POST /api/run         │                     │
   │  {language,code,stdin} │                     │
   │───────────────────────►│                     │
   │                        │  os.MkdirTemp()     │
   │                        │  WriteFile(code)    │
   │                        │  docker run ...     │
   │                        │────────────────────►│
   │                        │       (compile)     │
   │                        │       (run)         │
   │                        │◄────────────────────│
   │                        │  {stdout,stderr}    │
   │  {stdout,stderr,       │                     │
   │   success:bool}        │  RemoveAll(tmp)     │
   │◄───────────────────────│                     │
```

### Interactive Execution (WebSocket)

```
Browser (XTerminal)       Go Server              Docker
   │                          │                     │
   │  WS connect /api/ws      │                     │
   │─────────────────────────►│                     │
   │  {type:"init",           │                     │
   │   language,code}         │                     │
   │─────────────────────────►│                     │
   │                          │  WriteFile(code)    │
   │                          │  docker run -i ...  │
   │                          │────────────────────►│
   │                          │                     │
   │  {type:"stdin",data:"x"} │                     │
   │─────────────────────────►│  stdin pipe write   │
   │                          │────────────────────►│
   │                          │  stdout chunk       │
   │  {type:"stdout",         │◄────────────────────│
   │   data:"x\n"}            │                     │
   │◄─────────────────────────│                     │
   │  {type:"eof"}            │                     │
   │─────────────────────────►│  stdinPipe.Close()  │
   │                          │────────────────────►│
   │                          │  process exits      │
   │  {type:"exit",code:0}    │◄────────────────────│
   │◄─────────────────────────│                     │
```

---

## 7. Non-Functional Properties

### Security

- User code cannot access the network, the host filesystem beyond `/app`, or the host process table.
- All Linux capabilities are dropped; `no-new-privileges` prevents escalation.
- Output is hard-capped at 1 MB to prevent memory exhaustion from runaway print loops.
- Request bodies are capped via `http.MaxBytesReader` before JSON decoding.
- Process lifetime is bounded by per-language timeouts and the global 5-minute WebSocket limit.

### Reliability

- Each execution is fully isolated (separate temp dir, separate container); a crash in one session cannot affect another.
- Goroutine cleanup is guaranteed by `defer` and `sync.WaitGroup`; no goroutine leaks on normal or error paths.
- Frontend state is persisted on every change; users never lose work on refresh.

### Performance

- The Go server is single-binary, stateless, and starts in milliseconds.
- Docker container startup adds ~200–500 ms latency; the first byte of output streams immediately after.
- The React SPA is served as static assets with no server-side rendering overhead.
- CSS transitions for panel animations are GPU-accelerated (`transform` only, no layout-triggering properties).

### Portability

- The server auto-detects Docker availability and degrades gracefully to native execution.
- Frontend state lives entirely in `localStorage` — no backend database is required.
- The Dockerfile uses official base images, making multi-architecture builds straightforward.

---

## 8. Scalability & Future Considerations

| Area | Current | Production Path |
|---|---|---|
| Rate limiting | In-memory, per-process | Redis-backed sliding window counter |
| State storage | `localStorage` (client) | Optional cloud sync (user accounts) |
| Execution backend | Single Go binary | Kubernetes Jobs or AWS Lambda per execution |
| Language support | 5 languages, hard-coded map | Plugin registry loaded from config file |
| Terminal protocol | Custom JSON-over-WebSocket | Adopt `ttyd`/`gotty` or PTY-based protocol for full ANSI support |
| Output streaming | Per-chunk WebSocket frames | Server-Sent Events as a lighter fallback for read-only output |
| Build pipeline | Vite dev server + manual Docker builds | CI/CD with multi-stage Dockerfiles and image caching |
| Auth | None | OAuth (GitHub/Google) for saving state server-side |
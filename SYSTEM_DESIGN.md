# System Design: Online Code Editor

**Author:** Kshitij  
**Project:** run() - Browser-based Code Execution Platform

---

## 1. Problem Statement

Design a **browser-based code editor** that allows users to:
- Write code in multiple languages (Python, JavaScript, Go, C++, Java)
- Execute code with **real-time interactive I/O** (stdin/stdout streaming)
- Run untrusted code **securely** in isolated environments

### Functional Requirements
- Multi-language support with syntax highlighting
- Real-time code execution with streaming output
- Interactive stdin (user can type input during execution)
- File management (create, rename, delete files)
- Execution history
- Works offline (with fallback)

### Non-Functional Requirements
- **Low latency** (<100ms to first output)
- **Security** (untrusted code must not compromise host)
- **Scalability** (handle concurrent executions)
- **Availability** (graceful degradation when backend unavailable)

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │   CodeMirror │  │   XTerm.js   │  │   LocalStorage/IndexedDB │   │
│  │   (Editor)   │  │  (Terminal)  │  │   (Persistence Layer)    │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘   │
│         │                 │                                          │
│         │    ┌────────────┴────────────┐                            │
│         │    │    WebSocket Manager    │                            │
│         │    │  (Bidirectional Comm)   │                            │
│         └────┴────────────┬────────────┘                            │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ WSS/HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Go Server)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │   HTTP API   │  │  WebSocket   │  │     Rate Limiter         │   │
│  │   /run       │  │  Handler /ws │  │   (Token Bucket)         │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────┘   │
│         │                 │                                          │
│         └────────┬────────┘                                          │
│                  ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Execution Engine                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │   Input     │  │   Process   │  │   Output            │  │    │
│  │  │   Validator │  │   Manager   │  │   Streamer          │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DOCKER CONTAINERS                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Python  │  │   JS    │  │   Go    │  │   C++   │  │  Java   │   │
│  │ Runner  │  │ Runner  │  │ Runner  │  │ Runner  │  │ Runner  │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
│                                                                      │
│  Security: --network=none, --memory=256m, --pids-limit=50           │
│            --read-only, --no-new-privileges, tmpfs mounts           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Deep Dive

### 3.1 Frontend Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── Editor.tsx      # CodeMirror 6 wrapper
│   │   ├── XTerminal.tsx   # xterm.js + WebSocket
│   │   ├── FileTree.tsx    # Virtual file system UI
│   │   ├── Header.tsx      # Language selector, run button
│   │   └── ...
│   ├── storage.ts          # LocalStorage abstraction
│   ├── network.ts          # Online/offline detection
│   └── types.ts            # TypeScript interfaces
```

#### Key Design Decisions

| Component | Technology | Why |
|-----------|------------|-----|
| Editor | CodeMirror 6 | Modular, tree-sitter support, mobile-friendly |
| Terminal | xterm.js | Industry standard, GPU-accelerated rendering |
| State | React useState + localStorage | Simple, persistent, no external deps |
| Styling | CSS Variables | Theme switching without re-render |

#### WebSocket Message Protocol

```typescript
// Client → Server
type WSMessage = {
  type: "init" | "stdin" | "eof" | "kill";
  language?: string;  // on init
  code?: string;      // on init
  data?: string;      // on stdin
};

// Server → Client
type WSResponse = {
  type: "stdout" | "stderr" | "exit" | "error";
  data?: string;
  code?: number;      // exit code
};
```

### 3.2 Backend Architecture

```go
// Core execution flow
func handleWebSocket(conn *websocket.Conn) {
    // 1. Receive init message with code
    msg := readMessage(conn)
    
    // 2. Validate input (size, language)
    if err := validate(msg); err != nil {
        sendError(conn, err)
        return
    }
    
    // 3. Spawn Docker container
    cmd := exec.Command("docker", "run", 
        "--rm", "-i",
        "--network=none",
        "--memory=256m",
        "--pids-limit=50",
        "runner-"+language)
    
    // 4. Pipe stdin/stdout bidirectionally
    stdin, _ := cmd.StdinPipe()
    stdout, _ := cmd.StdoutPipe()
    
    // 5. Stream output to WebSocket
    go streamOutput(stdout, conn)
    
    // 6. Forward WebSocket stdin to container
    go forwardStdin(conn, stdin)
    
    cmd.Wait()
}
```

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/run` | POST | Batch execution (send code, get output) |
| `/ws` | WebSocket | Streaming execution with interactive I/O |
| `/health` | GET | Health check for load balancers |

### 3.3 Docker Sandbox Design

Each language has a dedicated container image:

```dockerfile
# Example: Python runner
FROM python:3.11-alpine
RUN adduser -D runner
USER runner
WORKDIR /code
ENTRYPOINT ["python", "-u", "-c"]
```

#### Security Layers

| Layer | Protection |
|-------|------------|
| `--network=none` | No network access |
| `--memory=256m` | Memory limit prevents OOM attacks |
| `--pids-limit=50` | Prevents fork bombs |
| `--read-only` | Immutable filesystem |
| `--no-new-privileges` | No privilege escalation |
| `tmpfs /tmp` | Writable but ephemeral storage |
| `timeout 30s` | Execution time limit |
| Non-root user | Least privilege principle |

---

## 4. Data Flow

### 4.1 Code Execution Flow (WebSocket)

```
┌────────┐          ┌────────┐          ┌────────┐
│ Client │          │ Server │          │ Docker │
└───┬────┘          └───┬────┘          └───┬────┘
    │                   │                   │
    │ WS Connect        │                   │
    │──────────────────>│                   │
    │                   │                   │
    │ {type:"init",     │                   │
    │  code:"...",      │                   │
    │  language:"py"}   │                   │
    │──────────────────>│                   │
    │                   │ docker run        │
    │                   │──────────────────>│
    │                   │                   │
    │                   │ stdout: "Enter:"  │
    │                   │<──────────────────│
    │ {type:"stdout",   │                   │
    │  data:"Enter:"}   │                   │
    │<──────────────────│                   │
    │                   │                   │
    │ {type:"stdin",    │                   │
    │  data:"hello\n"}  │                   │
    │──────────────────>│ stdin: "hello\n"  │
    │                   │──────────────────>│
    │                   │                   │
    │                   │ stdout: "hello"   │
    │                   │<──────────────────│
    │ {type:"stdout",   │                   │
    │  data:"hello"}    │                   │
    │<──────────────────│                   │
    │                   │                   │
    │                   │ exit(0)           │
    │                   │<──────────────────│
    │ {type:"exit",     │                   │
    │  code:0}          │                   │
    │<──────────────────│                   │
    │                   │                   │
    └───────────────────┴───────────────────┘
```

### 4.2 Offline Fallback Flow

```
┌────────┐          ┌─────────┐          ┌─────────┐
│ Client │          │ Backend │          │ Judge0  │
└───┬────┘          └────┬────┘          └────┬────┘
    │                    │                    │
    │ Execute Code       │                    │
    │───────────────────>│                    │
    │                    │                    │
    │                    │ (Docker fails)     │
    │                    │                    │
    │                    │ Fallback to Judge0 │
    │                    │───────────────────>│
    │                    │                    │
    │                    │ Result             │
    │                    │<───────────────────│
    │ Result             │                    │
    │<───────────────────│                    │
    │                    │                    │
```

---

## 5. Scalability Considerations

### 5.1 Current Architecture (Single Server)

```
Capacity: ~50 concurrent executions
Bottleneck: Docker container spawning
```

### 5.2 Scaled Architecture

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (nginx/HAProxy)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Backend 1   │   │   Backend 2   │   │   Backend 3   │
│   (Go + Docker)│   │   (Go + Docker)│   │   (Go + Docker)│
└───────────────┘   └───────────────┘   └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Redis         │
                    │ (Rate Limiting) │
                    └─────────────────┘
```

### 5.3 Horizontal Scaling Strategy

| Component | Scaling Approach |
|-----------|------------------|
| Frontend | CDN (Cloudflare, Vercel) |
| Backend | Stateless, add more instances |
| WebSocket | Sticky sessions (IP hash) |
| Execution | Container pool, pre-warmed |
| Rate Limiting | Centralized Redis |

---

## 6. Security Analysis

### 6.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Code Injection** | Docker isolation, no shell access |
| **Resource Exhaustion** | Memory/CPU/time limits |
| **Fork Bomb** | `--pids-limit=50` |
| **Network Attack** | `--network=none` |
| **File System Access** | `--read-only`, tmpfs |
| **Container Escape** | Non-root, no-new-privileges |
| **DoS** | Rate limiting (10 req/s per IP) |
| **XSS** | React escaping, CSP headers |
| **Large Payload** | 1MB code limit, 10MB output limit |

### 6.2 Security Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        TRUST BOUNDARY                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐    ┌─────────────────────────────────────┐  │
│  │            │    │           BACKEND                   │  │
│  │   Client   │    │  ┌─────────────────────────────┐   │  │
│  │  (Trusted) │───>│  │      Input Validation       │   │  │
│  │            │    │  │  • Size limits              │   │  │
│  └────────────┘    │  │  • Language whitelist       │   │  │
│                    │  │  • Sanitization             │   │  │
│                    │  └─────────────┬───────────────┘   │  │
│                    │                │                    │  │
│                    │                ▼                    │  │
│                    │  ┌─────────────────────────────┐   │  │
│                    │  │      Rate Limiter           │   │  │
│                    │  │  • 10 req/sec per IP        │   │  │
│                    │  └─────────────┬───────────────┘   │  │
│                    │                │                    │  │
│                    └────────────────┼────────────────────┘  │
│                                     │                       │
│  ┌──────────────────────────────────┼──────────────────────┐│
│  │              SANDBOX (Docker)    ▼                      ││
│  │  ┌────────────────────────────────────────────────┐    ││
│  │  │  • No network                                   │    ││
│  │  │  • No root                                      │    ││
│  │  │  • Read-only filesystem                         │    ││
│  │  │  • 256MB memory                                 │    ││
│  │  │  • 30s timeout                                  │    ││
│  │  │  • 50 process limit                             │    ││
│  │  └────────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Performance Optimizations

### 7.1 Implemented

| Optimization | Impact |
|--------------|--------|
| **Pre-cached Go stdlib** | 17s → 0.7s first run |
| **Unbuffered Python** (`-u`) | Instant output streaming |
| **Local echo in terminal** | Zero-latency typing |
| **WebSocket compression** | 60% bandwidth reduction |

### 7.2 Future Optimizations

| Optimization | Expected Impact |
|--------------|-----------------|
| Container pooling | 500ms → 50ms cold start |
| Warm container reuse | Eliminate spawn overhead |
| Code caching | Skip compilation for same code |
| Edge deployment | <50ms global latency |

---

## 8. Trade-offs & Decisions

### 8.1 WebSocket vs HTTP Polling

| Factor | WebSocket | HTTP Polling |
|--------|-----------|--------------|
| Latency | ✅ Low (<10ms) | ❌ High (100ms+) |
| Complexity | ❌ Higher | ✅ Lower |
| Scalability | ⚠️ Sticky sessions | ✅ Stateless |
| Bidirectional | ✅ Native | ❌ Awkward |

**Decision:** WebSocket for real-time interactive I/O

### 8.2 Docker vs gVisor/Firecracker

| Factor | Docker | gVisor | Firecracker |
|--------|--------|--------|-------------|
| Security | ⚠️ Good | ✅ Better | ✅ Best |
| Performance | ✅ Fast | ⚠️ Slower | ✅ Fast |
| Complexity | ✅ Low | ⚠️ Medium | ❌ High |
| Ecosystem | ✅ Rich | ⚠️ Limited | ⚠️ Limited |

**Decision:** Docker with hardening (acceptable security for code playground)

### 8.3 Single Server vs Microservices

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Complexity | ✅ Simple | ❌ Complex |
| Latency | ✅ Low | ⚠️ Network hops |
| Deployment | ✅ Easy | ❌ Kubernetes |
| Scale | ⚠️ Limited | ✅ Independent |

**Decision:** Monolith (appropriate for current scale)

---

## 9. Monitoring & Observability

### 9.1 Key Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                     METRICS DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Execution Latency (p99)          Active WebSockets          │
│  ┌────────────────────┐           ┌────────────────────┐    │
│  │████████░░░░ 450ms  │           │  Currently: 23     │    │
│  └────────────────────┘           └────────────────────┘    │
│                                                              │
│  Success Rate                     Container Count            │
│  ┌────────────────────┐           ┌────────────────────┐    │
│  │██████████░░ 98.5%  │           │  Running: 8        │    │
│  └────────────────────┘           └────────────────────┘    │
│                                                              │
│  Executions by Language (24h)                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Python     ████████████████████████  (45%)          │    │
│  │ JavaScript ████████████████  (32%)                  │    │
│  │ Go         ████████  (15%)                          │    │
│  │ C++        ███  (5%)                                │    │
│  │ Java       ██  (3%)                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Logging Strategy

```
# Structured logging format
{
  "timestamp": "2026-02-08T10:30:00Z",
  "level": "info",
  "event": "execution_complete",
  "language": "python",
  "duration_ms": 234,
  "exit_code": 0,
  "client_ip": "192.168.1.x"
}
```

---

## 10. Interview Questions & Answers

### Q1: How do you prevent malicious code from attacking your server?

**Answer:** Defense in depth with Docker containers:
1. `--network=none` - No network access
2. `--memory=256m` - Prevents memory exhaustion
3. `--pids-limit=50` - Prevents fork bombs
4. `--read-only` - Immutable filesystem
5. Non-root user inside container
6. 30-second timeout kills long-running processes
7. Rate limiting (10 req/sec) prevents DoS

### Q2: How would you scale this to 10,000 concurrent users?

**Answer:**
1. **Frontend:** CDN (Cloudflare) for static assets
2. **Backend:** Horizontal scaling with load balancer
3. **WebSocket:** Sticky sessions (IP hash)
4. **Execution:** Container pooling with pre-warmed containers
5. **Rate limiting:** Centralized Redis
6. **Monitoring:** Prometheus + Grafana for autoscaling triggers

### Q3: Why WebSocket instead of HTTP long-polling?

**Answer:**
- Bidirectional communication for interactive stdin
- Lower latency (no HTTP overhead per message)
- Native support for streaming stdout
- Single connection vs multiple HTTP requests

### Q4: How do you handle WebSocket connection drops?

**Answer:**
1. Client detects disconnect, shows "reconnecting..."
2. Automatic reconnection with exponential backoff
3. Running process continues (orphan cleanup after timeout)
4. Client can reconnect and see buffered output (future improvement)

### Q5: What happens if Docker daemon is unavailable?

**Answer:**
1. Health check fails, LB removes server from pool
2. Fallback to Judge0 API (external service)
3. User sees "running in cloud mode" indicator
4. Graceful degradation - basic execution still works

---

## 11. Future Improvements

| Priority | Feature | Complexity |
|----------|---------|------------|
| High | Container pooling | Medium |
| High | Collaborative editing | High |
| Medium | Code autocomplete (LSP) | High |
| Medium | File sharing via URL | Low |
| Low | Vim/Emacs keybindings | Low |
| Low | Custom themes | Low |

---

## 12. Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Editor | CodeMirror 6 | Code editing |
| Terminal | xterm.js | Terminal emulation |
| Build | Vite | Fast bundling |
| Backend | Go 1.22 | HTTP/WebSocket server |
| Execution | Docker | Sandboxed code running |
| Tunnel | Cloudflare Tunnel | Public access |
| Hosting | Any VPS / Cloudflare | Production deployment |

---

*Last updated: February 2026*

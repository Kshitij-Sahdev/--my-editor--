package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"
)

/*
RunRequest defines the contract between frontend and backend.

Important design choice:
- Backend does NOT care about users, sessions, or auth.
- This endpoint is intentionally dumb: take code in, return output.
- All validation and safety happens at execution boundaries, not API boundaries.
*/
type RunRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
	Stdin    string `json:"stdin"`
}

/*
RunResponse mirrors what competitive programming platforms do.

Key idea:
- HTTP status is NOT used to signal execution failure.
- stdout + stderr are always returned.
- This keeps frontend logic dead simple and predictable.
*/
type RunResponse struct {
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

/*
Security limits.

These prevent resource exhaustion attacks.
*/
const (
	// Maximum code size (64KB should be enough for any reasonable program)
	MaxCodeSize = 64 * 1024
	// Maximum stdin size (1MB for competitive programming input)
	MaxStdinSize = 1 * 1024 * 1024
	// Maximum output size (1MB to prevent memory exhaustion)
	MaxOutputSize = 1 * 1024 * 1024
	// Rate limit: max concurrent executions per IP
	MaxConcurrentPerIP = 3
)

/*
Simple rate limiter by IP.

Not production-grade but prevents basic abuse.
*/
var (
	ipLocks   = make(map[string]int)
	ipLocksMu sync.Mutex
)

func acquireSlot(ip string) bool {
	ipLocksMu.Lock()
	defer ipLocksMu.Unlock()
	if ipLocks[ip] >= MaxConcurrentPerIP {
		return false
	}
	ipLocks[ip]++
	return true
}

func releaseSlot(ip string) {
	ipLocksMu.Lock()
	defer ipLocksMu.Unlock()
	if ipLocks[ip] > 0 {
		ipLocks[ip]--
	}
}

/*
limitedWriter wraps an io.Writer and limits total bytes written.

Prevents malicious code from exhausting memory with huge output.
*/
type limitedWriter struct {
	w         io.Writer
	limit     int
	written   int
	truncated bool
}

func (lw *limitedWriter) Write(p []byte) (int, error) {
	if lw.written >= lw.limit {
		lw.truncated = true
		return len(p), nil // Pretend we wrote it to avoid breaking pipe
	}

	remaining := lw.limit - lw.written
	if len(p) > remaining {
		p = p[:remaining]
		lw.truncated = true
	}

	n, err := lw.w.Write(p)
	lw.written += n
	return n, err
}

func runHandler(w http.ResponseWriter, r *http.Request) {

	/*
		CORS preflight handling.

		Why this exists:
		- Frontend is hosted separately (Vite, localhost, future CDN).
		- Browser sends OPTIONS before POST.
		- If you don’t answer this, frontend “mysteriously” breaks.
	*/
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Allow browser to actually read the response
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	/*
		Rate limiting by IP.

		Prevents single user from exhausting server resources.
	*/
	clientIP := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		clientIP = forwarded
	}

	if !acquireSlot(clientIP) {
		http.Error(w, "Too many concurrent requests. Please wait.", http.StatusTooManyRequests)
		return
	}
	defer releaseSlot(clientIP)

	/*
		Limit request body size.

		Prevents memory exhaustion from huge payloads.
	*/
	r.Body = http.MaxBytesReader(w, r.Body, MaxCodeSize+MaxStdinSize+1024)

	/*
		Decode request payload.
	*/
	var req RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request or payload too large", http.StatusBadRequest)
		return
	}

	/*
		Validate input sizes.
	*/
	if len(req.Code) > MaxCodeSize {
		http.Error(w, "Code too large (max 64KB)", http.StatusBadRequest)
		return
	}
	if len(req.Stdin) > MaxStdinSize {
		http.Error(w, "Input too large (max 1MB)", http.StatusBadRequest)
		return
	}

	/*
		Create a temporary execution directory.

		Critical security idea:
		- Each run gets its own isolated filesystem.
		- Directory is deleted after execution.
		- Nothing persists between runs.
	*/
	tmp, err := os.MkdirTemp("", "run-")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	/*
		Permissions are deliberately open (0777).

		Why this is safe:
		- Directory is mounted into a container, not exposed to host users.
		- Container runs as non-root.
		- Root filesystem is read-only.
	*/
	os.Chmod(tmp, 0777)
	defer os.RemoveAll(tmp)

	/*
		Map language → filename + Docker image.

		Important:
		- Filenames are fixed and predictable.
		- Java requires Main.java specifically.
		- Docker image names are hard-coded to avoid injection.
	*/
	var filename, image string

	switch req.Language {
	case "python":
		filename = "main.py"
		image = "runner-python"
	case "cpp":
		filename = "main.cpp"
		image = "runner-cpp"
	case "java":
		filename = "Main.java"
		image = "runner-java"
	case "go":
		filename = "main.go"
		image = "runner-go"
	case "javascript":
		filename = "main.js"
		image = "runner-js"
	default:
		http.Error(w, "unsupported language", 400)
		return
	}

	/*
		Write user code into the temp directory.

		Why 0644:
		- Readable by container user.
		- Not executable on host.
		- Execution happens via interpreter/compiler inside container.
	*/
	err = os.WriteFile(filepath.Join(tmp, filename), []byte(req.Code), 0644)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	/*
		Hard execution timeout.

		This is NON-NEGOTIABLE.

		Why:
		- CPU limits do NOT stop infinite loops.
		- Node, Java, Go can run forever otherwise.
		- Context cancellation guarantees docker is killed.

		Java/Go need more time for compilation.
	*/
	timeout := 5 * time.Second
	if req.Language == "java" || req.Language == "go" || req.Language == "cpp" {
		timeout = 10 * time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	/*
		Docker run command with real sandboxing.

		Each flag exists for a reason:
		- --network=none          → no data exfiltration
		- --memory / swap         → prevent host OOM
		- --cpus                  → fair scheduling
		- --pids-limit            → stop fork/thread bombs
		- --read-only             → immutable root filesystem
		- --cap-drop=ALL          → remove Linux privileges
		- no-new-privileges       → prevent privilege escalation
		- seccomp=default         → block dangerous syscalls
		- volume mount            → only /app is writable
		- tmpfs mounts            → writable temp dirs for compilers
	*/

	// Compiled languages need more CPU for compilation
	cpuLimit := "0.5"
	if req.Language == "go" || req.Language == "java" || req.Language == "cpp" {
		cpuLimit = "1.0"
	}

	args := []string{
		"run", "--rm",
		"--network=none",
		"--memory=256m",
		"--memory-swap=256m",
		"--cpus=" + cpuLimit,
		"--pids-limit=128",
		"--read-only",
		"--cap-drop=ALL",
		"--security-opt", "no-new-privileges",
		"--ulimit", "fsize=10485760:10485760", // 10MB max file size
		"--ulimit", "nofile=256:256", // Max open files (Go compiler needs ~100+)
		"--tmpfs", "/tmp:rw,exec,size=64m",
		"-v", tmp + ":/app:rw",
	}

	args = append(args, image)

	cmd := exec.CommandContext(ctx, "docker", args...)

	// Log execution details
	fmt.Printf("\n[RUN] lang=%s | timeout=%v | cpu=%s | file=%s\n", req.Language, timeout, cpuLimit, filename)

	/*
		Forward stdin to the container.

		This allows:
		- interactive problems
		- competitive programming style input
	*/
	cmd.Stdin = bytes.NewBufferString(req.Stdin)

	/*
		Limit output size to prevent memory exhaustion.

		Using io.LimitReader pattern with a buffer.
	*/
	var stdout, stderr bytes.Buffer
	stdoutLimited := &limitedWriter{w: &stdout, limit: MaxOutputSize}
	stderrLimited := &limitedWriter{w: &stderr, limit: MaxOutputSize}
	cmd.Stdout = stdoutLimited
	cmd.Stderr = stderrLimited

	/*
		Run the container.

		If it times out:
		- Context cancels
		- Docker process is killed
		- Backend survives
	*/
	err = cmd.Run()

	// Log completion status
	status := "OK"
	if err != nil {
		status = err.Error()
	}
	fmt.Printf("[DONE] lang=%s | status=%s | stdout=%d bytes | stderr=%d bytes\n",
		req.Language, status, stdout.Len(), stderr.Len())

	// Check if output was truncated
	stdoutStr := stdout.String()
	stderrStr := stderr.String()
	if stdoutLimited.truncated {
		stdoutStr += "\n... [output truncated, max 1MB]"
	}
	if stderrLimited.truncated {
		stderrStr += "\n... [output truncated, max 1MB]"
	}

	resp := RunResponse{
		Stdout: stdoutStr,
		Stderr: stderrStr,
	}

	/*
		Surface execution errors cleanly.

		If stderr is empty but error exists:
		- likely timeout or Docker-level failure
	*/
	if err != nil && resp.Stderr == "" {
		resp.Stderr = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	/*
		Health check endpoint for frontend connectivity detection.
		Simple JSON response indicating service is available.
	*/
	// Handle CORS preflight
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	/*
		Minimal HTTP server.

		Intentionally no framework:
		- Fewer dependencies
		- Predictable behavior
		- Easier to containerize and scale later
	*/
	fmt.Print("running")
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/run", runHandler)
	http.ListenAndServe(":8080", nil)
}

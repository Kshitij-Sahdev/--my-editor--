package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// =============================================================================
// CONFIGURATION
// =============================================================================

var config = struct {
	Port          string
	MaxCodeSize   int
	MaxStdinSize  int
	MaxOutputSize int
	MaxConcurrent int
	TimeoutBatch  time.Duration
	TimeoutStream time.Duration
	DockerAvail   bool
}{
	Port:          getEnv("PORT", "8080"),
	MaxCodeSize:   64 * 1024,       // 64KB
	MaxStdinSize:  1 * 1024 * 1024, // 1MB
	MaxOutputSize: 1 * 1024 * 1024, // 1MB
	MaxConcurrent: 3,
	TimeoutBatch:  10 * time.Second,
	TimeoutStream: 5 * time.Minute,
	DockerAvail:   false,
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// =============================================================================
// LANGUAGE CONFIG
// =============================================================================

type LangConfig struct {
	Filename string
	Image    string
	Compile  string // empty = interpreted
	Run      string
	Timeout  time.Duration
}

var languages = map[string]LangConfig{
	"python": {
		Filename: "main.py",
		Image:    "runner-python",
		Run:      "python3 main.py",
		Timeout:  5 * time.Second,
	},
	"javascript": {
		Filename: "main.js",
		Image:    "runner-js",
		Run:      "node main.js",
		Timeout:  5 * time.Second,
	},
	"go": {
		Filename: "main.go",
		Image:    "runner-go",
		Compile:  "go build -o /tmp/prog main.go",
		Run:      "/tmp/prog",
		Timeout:  10 * time.Second,
	},
	"cpp": {
		Filename: "main.cpp",
		Image:    "runner-cpp",
		Compile:  "g++ -O2 -o /tmp/prog main.cpp",
		Run:      "/tmp/prog",
		Timeout:  10 * time.Second,
	},
	"java": {
		Filename: "Main.java",
		Image:    "runner-java",
		Compile:  "javac -d /tmp Main.java",
		Run:      "java -cp /tmp Main",
		Timeout:  10 * time.Second,
	},
}

// =============================================================================
// RATE LIMITING
// =============================================================================

var (
	rateLimiter   = make(map[string]int)
	rateLimiterMu sync.Mutex
)

func acquireSlot(ip string) bool {
	rateLimiterMu.Lock()
	defer rateLimiterMu.Unlock()
	if rateLimiter[ip] >= config.MaxConcurrent {
		return false
	}
	rateLimiter[ip]++
	return true
}

func releaseSlot(ip string) {
	rateLimiterMu.Lock()
	defer rateLimiterMu.Unlock()
	if rateLimiter[ip] > 0 {
		rateLimiter[ip]--
	}
}

func getClientIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		return strings.Split(fwd, ",")[0]
	}
	return r.RemoteAddr
}

// =============================================================================
// CORS MIDDLEWARE
// =============================================================================

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

// =============================================================================
// BATCH EXECUTION (HTTP POST /run)
// =============================================================================

type RunRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
	Stdin    string `json:"stdin"`
}

type RunResponse struct {
	Stdout  string `json:"stdout"`
	Stderr  string `json:"stderr"`
	Success bool   `json:"success"`
}

func runHandler(w http.ResponseWriter, r *http.Request) {
	clientIP := getClientIP(r)

	// Rate limit
	if !acquireSlot(clientIP) {
		http.Error(w, "Too many requests", http.StatusTooManyRequests)
		return
	}
	defer releaseSlot(clientIP)

	// Parse request
	r.Body = http.MaxBytesReader(w, r.Body, int64(config.MaxCodeSize+config.MaxStdinSize+1024))
	var req RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Validate language
	lang, ok := languages[req.Language]
	if !ok {
		http.Error(w, "Unsupported language", http.StatusBadRequest)
		return
	}

	// Execute
	var resp RunResponse
	if config.DockerAvail {
		resp = executeDocker(req.Code, req.Stdin, lang)
	} else {
		resp = executeNative(req.Code, req.Stdin, lang)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func executeDocker(code, stdin string, lang LangConfig) RunResponse {
	// Create temp dir
	tmp, err := os.MkdirTemp("", "run-")
	if err != nil {
		return RunResponse{Stderr: err.Error()}
	}
	defer os.RemoveAll(tmp)
	os.Chmod(tmp, 0777)

	// Write code
	codePath := filepath.Join(tmp, lang.Filename)
	if err := os.WriteFile(codePath, []byte(code), 0644); err != nil {
		return RunResponse{Stderr: err.Error()}
	}

	// Build command
	runCmd := lang.Run
	if lang.Compile != "" {
		runCmd = lang.Compile + " && " + lang.Run
	}

	ctx, cancel := context.WithTimeout(context.Background(), lang.Timeout)
	defer cancel()

	args := []string{
		"run", "--rm", "-i",
		"--network=none",
		"--memory=256m",
		"--memory-swap=256m",
		"--cpus=1.0",
		"--pids-limit=128",
		"--read-only",
		"--cap-drop=ALL",
		"--security-opt", "no-new-privileges",
		"--ulimit", "fsize=10485760:10485760",
		"--ulimit", "nofile=256:256",
		"--tmpfs", "/tmp:rw,exec,size=64m",
		"-v", tmp + ":/app:rw",
		"-w", "/app",
		lang.Image,
		"sh", "-c", runCmd,
	}

	cmd := exec.CommandContext(ctx, "docker", args...)
	cmd.Stdin = strings.NewReader(stdin)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &limitedWriter{w: &stdout, limit: config.MaxOutputSize}
	cmd.Stderr = &limitedWriter{w: &stderr, limit: config.MaxOutputSize}

	err = cmd.Run()

	resp := RunResponse{
		Stdout:  stdout.String(),
		Stderr:  stderr.String(),
		Success: err == nil,
	}

	if err != nil && resp.Stderr == "" {
		resp.Stderr = err.Error()
	}

	return resp
}

func executeNative(code, stdin string, lang LangConfig) RunResponse {
	// Fallback for systems without Docker (Termux, etc.)
	// Only supports interpreted languages safely

	tmp, err := os.MkdirTemp("", "run-")
	if err != nil {
		return RunResponse{Stderr: err.Error()}
	}
	defer os.RemoveAll(tmp)

	codePath := filepath.Join(tmp, lang.Filename)
	if err := os.WriteFile(codePath, []byte(code), 0644); err != nil {
		return RunResponse{Stderr: err.Error()}
	}

	ctx, cancel := context.WithTimeout(context.Background(), lang.Timeout)
	defer cancel()

	var cmd *exec.Cmd
	switch lang.Filename {
	case "main.py":
		cmd = exec.CommandContext(ctx, "python3", codePath)
	case "main.js":
		cmd = exec.CommandContext(ctx, "node", codePath)
	default:
		return RunResponse{Stderr: "Native execution not supported for this language. Install Docker."}
	}

	cmd.Dir = tmp
	cmd.Stdin = strings.NewReader(stdin)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()

	return RunResponse{
		Stdout:  stdout.String(),
		Stderr:  stderr.String(),
		Success: err == nil,
	}
}

// =============================================================================
// INTERACTIVE TERMINAL (WebSocket /ws)
// =============================================================================

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSMessage struct {
	Type     string `json:"type"` // "init", "stdin", "eof", "kill"
	Language string `json:"language,omitempty"`
	Code     string `json:"code,omitempty"`
	Data     string `json:"data,omitempty"` // stdin data
	Cols     int    `json:"cols,omitempty"`
	Rows     int    `json:"rows,omitempty"`
}

type WSResponse struct {
	Type string `json:"type"` // "stdout", "stderr", "exit", "error"
	Data string `json:"data"`
	Code int    `json:"code,omitempty"` // exit code
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	clientIP := getClientIP(r)

	if !acquireSlot(clientIP) {
		http.Error(w, "Too many connections", http.StatusTooManyRequests)
		return
	}
	defer releaseSlot(clientIP)

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	fmt.Println("\n----------------------------------------")
	fmt.Println("NEW CONNECTION from", clientIP)

	// Read init message
	var initMsg WSMessage
	if err := conn.ReadJSON(&initMsg); err != nil || initMsg.Type != "init" {
		conn.WriteJSON(WSResponse{Type: "error", Data: "Expected init message"})
		return
	}

	lang, ok := languages[initMsg.Language]
	if !ok {
		conn.WriteJSON(WSResponse{Type: "error", Data: "Unsupported language"})
		return
	}

	fmt.Printf("RUNNING: %s\n", initMsg.Language)
	fmt.Println("----------------------------------------")

	// Create temp dir
	tmp, err := os.MkdirTemp("", "ws-run-")
	if err != nil {
		conn.WriteJSON(WSResponse{Type: "error", Data: err.Error()})
		return
	}
	defer os.RemoveAll(tmp)
	os.Chmod(tmp, 0777)

	// Write code
	codePath := filepath.Join(tmp, lang.Filename)
	if err := os.WriteFile(codePath, []byte(initMsg.Code), 0644); err != nil {
		conn.WriteJSON(WSResponse{Type: "error", Data: err.Error()})
		return
	}

	// Build run command
	runCmd := lang.Run
	if lang.Compile != "" {
		runCmd = lang.Compile + " && " + lang.Run
	}

	ctx, cancel := context.WithTimeout(context.Background(), config.TimeoutStream)
	defer cancel()

	var cmd *exec.Cmd
	if config.DockerAvail {
		args := []string{
			"run", "--rm", "-i",
			"--network=none",
			"--memory=256m",
			"--memory-swap=256m",
			"--cpus=1.0",
			"--pids-limit=128",
			"--read-only",
			"--cap-drop=ALL",
			"--security-opt", "no-new-privileges",
			"--tmpfs", "/tmp:rw,exec,size=64m",
			"-v", tmp + ":/app:rw",
			"-w", "/app",
			lang.Image,
			"sh", "-c", runCmd,
		}
		cmd = exec.CommandContext(ctx, "docker", args...)
	} else {
		// Native fallback
		switch lang.Filename {
		case "main.py":
			cmd = exec.CommandContext(ctx, "python3", codePath)
		case "main.js":
			cmd = exec.CommandContext(ctx, "node", codePath)
		default:
			conn.WriteJSON(WSResponse{Type: "error", Data: "Native execution not supported"})
			return
		}
		cmd.Dir = tmp
	}

	// Setup pipes
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		conn.WriteJSON(WSResponse{Type: "error", Data: err.Error()})
		return
	}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		conn.WriteJSON(WSResponse{Type: "error", Data: err.Error()})
		return
	}

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		conn.WriteJSON(WSResponse{Type: "error", Data: err.Error()})
		return
	}

	// Start process
	if err := cmd.Start(); err != nil {
		conn.WriteJSON(WSResponse{Type: "error", Data: err.Error()})
		return
	}

	fmt.Println("STARTED")

	var wg sync.WaitGroup
	done := make(chan struct{})

	// Stream stdout
	wg.Add(1)
	go func() {
		defer wg.Done()
		reader := bufio.NewReader(stdoutPipe)
		buf := make([]byte, 1024)
		for {
			n, err := reader.Read(buf)
			if n > 0 {
				output := string(buf[:n])
				preview := strings.ReplaceAll(output, "\n", "\\n")
				if len(preview) > 80 {
					preview = preview[:80] + "..."
				}
				fmt.Printf(">> OUT: %s\n", preview)
				conn.WriteJSON(WSResponse{Type: "stdout", Data: output})
			}
			if err != nil {
				return
			}
		}
	}()

	// Stream stderr
	wg.Add(1)
	go func() {
		defer wg.Done()
		reader := bufio.NewReader(stderrPipe)
		buf := make([]byte, 1024)
		for {
			n, err := reader.Read(buf)
			if n > 0 {
				output := string(buf[:n])
				preview := strings.ReplaceAll(output, "\n", "\\n")
				if len(preview) > 80 {
					preview = preview[:80] + "..."
				}
				fmt.Printf(">> ERR: %s\n", preview)
				conn.WriteJSON(WSResponse{Type: "stderr", Data: output})
			}
			if err != nil {
				return
			}
		}
	}()

	// Handle incoming messages (stdin)
	var inputBuffer strings.Builder
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer stdinPipe.Close()
		for {
			var msg WSMessage
			if err := conn.ReadJSON(&msg); err != nil {
				return
			}
			switch msg.Type {
			case "stdin":
				input := msg.Data
				stdinPipe.Write([]byte(input))

				// Buffer input and print on newline
				if input == "\n" || input == "\r" || input == "\r\n" {
					line := inputBuffer.String()
					inputBuffer.Reset()
					fmt.Printf(">> IN:  %s<enter>\n", line)
				} else {
					inputBuffer.WriteString(input)
				}
			case "eof":
				// Close stdin - signals EOF to the process (like Ctrl+D)
				fmt.Println(">> EOF (Ctrl+D)")
				stdinPipe.Close()
				return
			case "kill":
				fmt.Println(">> KILL")
				cancel()
				return
			}
		}
	}()

	// Wait for process
	go func() {
		cmd.Wait()
		close(done)
	}()

	<-done
	wg.Wait()

	exitCode := 0
	if cmd.ProcessState != nil {
		exitCode = cmd.ProcessState.ExitCode()
	}

	if exitCode == 0 {
		fmt.Println("DONE (exit 0)")
	} else {
		fmt.Printf("FAILED (exit %d)\n", exitCode)
	}
	fmt.Println("----------------------------------------\n")

	conn.WriteJSON(WSResponse{Type: "exit", Code: exitCode})
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"docker": config.DockerAvail,
	})
}

// =============================================================================
// UTILITIES
// =============================================================================

type limitedWriter struct {
	w       io.Writer
	limit   int
	written int
}

func (lw *limitedWriter) Write(p []byte) (int, error) {
	if lw.written >= lw.limit {
		return len(p), nil
	}
	remaining := lw.limit - lw.written
	if len(p) > remaining {
		p = p[:remaining]
	}
	n, err := lw.w.Write(p)
	lw.written += n
	return n, err
}

func checkDocker() bool {
	cmd := exec.Command("docker", "info")
	return cmd.Run() == nil
}

// =============================================================================
// STATIC FILE SERVER (for production)
// =============================================================================

func staticFileServer(distPath string) http.Handler {
	fs := http.FileServer(http.Dir(distPath))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the file
		path := filepath.Join(distPath, r.URL.Path)

		// Check if file exists
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// SPA fallback: serve index.html for non-existent paths
			http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
			return
		}

		fs.ServeHTTP(w, r)
	})
}

// =============================================================================
// MAIN
// =============================================================================

func main() {
	// Check Docker availability
	config.DockerAvail = checkDocker()

	mode := "NATIVE (no Docker)"
	if config.DockerAvail {
		mode = "DOCKER"
	}

	// Check if frontend dist exists
	distPath := "../frontend/dist"
	serveFrontend := false
	if _, err := os.Stat(distPath); err == nil {
		serveFrontend = true
	}

	frontendStatus := "NOT SERVING (use Vite dev server)"
	if serveFrontend {
		frontendStatus = "SERVING from ../frontend/dist"
	}

	fmt.Printf(`
╔═══════════════════════════════════════════╗
║          CODE RUNNER SERVER               ║
╠═══════════════════════════════════════════╣
║  Mode:   %-32s ║
║  Port:   %-32s ║
║  Batch:  POST /api/run                    ║
║  Stream: WS   /api/ws                     ║
║  Health: GET  /api/health                 ║
╠═══════════════════════════════════════════╣
║  Frontend: %-30s ║
╚═══════════════════════════════════════════╝
`, mode, config.Port, frontendStatus)

	http.HandleFunc("/api/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/run", corsMiddleware(runHandler))
	http.HandleFunc("/api/ws", wsHandler)

	// Serve frontend static files if dist exists
	if serveFrontend {
		http.Handle("/", staticFileServer(distPath))
	}

	fmt.Printf("\n🚀 Server running on http://0.0.0.0:%s\n\n", config.Port)
	if err := http.ListenAndServe(":"+config.Port, nil); err != nil {
		fmt.Fprintf(os.Stderr, "Server error: %v\n", err)
		os.Exit(1)
	}
}

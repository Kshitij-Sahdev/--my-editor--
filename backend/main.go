package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
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
		Decode request payload.

		No strict validation here on purpose.
		Why:
		- Bad code is expected.
		- Invalid programs are handled by the sandbox, not the API.
	*/
	var req RunRequest
	json.NewDecoder(r.Body).Decode(&req)

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
		Debug visibility (optional).

		Useful during development to confirm:
		- Correct filename is written.
		- Nothing extra is leaking into the directory.
	*/
	files, _ := os.ReadDir(tmp)
	for _, f := range files {
		println("TMP FILE:", f.Name())
	}

	/*
		Hard execution timeout.

		This is NON-NEGOTIABLE.

		Why:
		- CPU limits do NOT stop infinite loops.
		- Node, Java, Go can run forever otherwise.
		- Context cancellation guarantees docker is killed.
	*/
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
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
	*/
	cmd := exec.CommandContext(
		ctx,
		"docker", "run", "--rm",
		"--network=none",
		"--memory=256m",
		"--memory-swap=256m",
		"--cpus=0.5",
		"--pids-limit=32",
		"--read-only",
		"--cap-drop=ALL",
		"--security-opt", "no-new-privileges",
		"-v", tmp+":/app:rw",
		image,
	)

	println("DOCKER CMD:", cmd.String())

	/*
		Forward stdin to the container.

		This allows:
		- interactive problems
		- competitive programming style input
	*/
	cmd.Stdin = bytes.NewBufferString(req.Stdin)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	/*
		Run the container.

		If it times out:
		- Context cancels
		- Docker process is killed
		- Backend survives
	*/
	err = cmd.Run()

	resp := RunResponse{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
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

func main() {
	/*
		Minimal HTTP server.

		Intentionally no framework:
		- Fewer dependencies
		- Predictable behavior
		- Easier to containerize and scale later
	*/
	fmt.Print("running")
	http.HandleFunc("/run", runHandler)
	http.ListenAndServe(":8080", nil)
}

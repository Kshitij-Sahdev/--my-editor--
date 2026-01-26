package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
)

type RunRequest struct {
	Language string `json:"language"`
	Code     string `json:"code"`
	Stdin    string `json:"stdin"`
}

type RunResponse struct {
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

func runHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	var req RunRequest
	json.NewDecoder(r.Body).Decode(&req)

	tmp, err := os.MkdirTemp("", "run-")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	os.Chmod(tmp, 0777)
	defer os.RemoveAll(tmp)

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

	err = os.WriteFile(filepath.Join(tmp, filename), []byte(req.Code), 0644)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	files, _ := os.ReadDir(tmp)
	for _, f := range files {
		println("TMP FILE:", f.Name())
	}

	cmd := exec.Command(
		"docker", "run", "--rm",
		"--network=none",
		"--memory=256m",
		"--cpus=0.5",
		"--pids-limit=256",
		"-v", tmp+":/app",
		image,
	)

	println("DOCKER CMD:", cmd.String())

	cmd.Stdin = bytes.NewBufferString(req.Stdin)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()

	resp := RunResponse{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	if err != nil && resp.Stderr == "" {
		resp.Stderr = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	fmt.Print("running")
	http.HandleFunc("/run", runHandler)
	http.ListenAndServe(":8080", nil)
}

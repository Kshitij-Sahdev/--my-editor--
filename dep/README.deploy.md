# Code Runner — Coolify Deployment Guide

## Prerequisites

- A server running [Coolify](https://coolify.io) (v4+)
- Docker installed on the server
- A domain pointed at your server's IP
- Git repo with this codebase (GitHub, GitLab, Gitea, or self-hosted)

---

## Step 1 — Build the runner images on your server

The Go server spawns isolated Docker containers for each language. These images must exist on the **same Docker host** that Coolify uses.

SSH into your server and run:

```bash
git clone <your-repo> code-runner
cd code-runner
chmod +x build-runners.sh
./build-runners.sh
```

This builds five images: `runner-python`, `runner-javascript`, `runner-go`, `runner-cpp`, `runner-java`.

Verify they exist:

```bash
docker images --filter "label=code-runner=true"
```

---

## Step 2 — Create the service in Coolify

1. Open Coolify → **New Resource** → **Docker Compose**
2. Select your Git provider and choose this repository
3. Set **Build Pack** to `Docker Compose`
4. Set **Docker Compose location** to `docker-compose.yml`
5. Leave **Branch** as `main` (or your default branch)

---

## Step 3 — Set environment variables

In the Coolify service settings → **Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `MAX_CONCURRENT` | `3` | Max parallel executions per IP |
| `TIMEOUT_BATCH` | `10` | Seconds for `/api/run` |
| `TIMEOUT_STREAM` | `300` | Seconds for WebSocket sessions |

Coolify automatically sets `SERVICE_FQDN_APP` to your domain — you don't need to add that.

---

## Step 4 — Configure your domain

1. In Coolify → service → **Domains**, enter your domain (e.g. `coderunner.yourdomain.com`)
2. Coolify + Traefik will automatically provision a Let's Encrypt SSL certificate

---

## Step 5 — Deploy

Click **Deploy**. Coolify will:

1. Clone your repo
2. Run the multi-stage Docker build (frontend → backend → final image)
3. Start the container with Traefik routing
4. Run healthchecks on `/api/health` before marking the service live

First deploy takes ~2–3 minutes (Node + Go build). Subsequent deploys are faster due to layer caching.

---

## Updating runner images

If you modify a runner `Dockerfile`, rebuild that image on the server:

```bash
./build-runners.sh python     # rebuild only python
./build-runners.sh            # rebuild all
```

No app redeployment needed — the Go server pulls the latest image tag on each execution.

---

## Architecture on the host

```
Internet
    │  443 (HTTPS)
    ▼
Traefik (Coolify-managed)
    │  HTTP → code-runner container :8080
    ▼
code-runner container
    │  /var/run/docker.sock (read-only mount)
    ▼
Docker daemon
    │  docker run runner-python ...
    ▼
Ephemeral runner container (auto-removed after execution)
```

The app container mounts the Docker socket **read-only** so it can start runner containers but cannot modify the Docker daemon configuration or delete images.

---

## Troubleshooting

**"Unsupported language" error**
→ Runner images aren't built. Run `./build-runners.sh` on the server.

**WebSocket disconnects immediately**
→ Check that Traefik has WebSocket support enabled (it does by default in Coolify v4).
→ Verify the `TIMEOUT_STREAM` env var is set to a reasonable value (300+).

**Container starts but `/api/health` fails**
→ Check logs: Coolify UI → service → **Logs**
→ The binary expects `frontend/dist` to exist relative to the working directory — ensure the multi-stage build completed successfully.

**"Too many requests" (429)**
→ `MAX_CONCURRENT` per IP is exceeded. Increase it or add more server capacity.

**SSL certificate not provisioning**
→ Ensure your DNS A record points to the server IP and has propagated (use `dig +short yourdomain.com`).
→ Coolify uses Let's Encrypt HTTP-01 challenge — port 80 must be reachable temporarily.

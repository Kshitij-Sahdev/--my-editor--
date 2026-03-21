# =============================================================================
# Stage 1: Build the React frontend
# =============================================================================
FROM node:20-alpine AS frontend-builder

# Accept Clerk key as build arg — Vite bakes VITE_* into the JS bundle
ARG VITE_CLERK_PUBLISHABLE_KEY=""
ARG VITE_CLERK_PROXY_URL=""
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
ENV VITE_CLERK_PROXY_URL=${VITE_CLERK_PROXY_URL}

WORKDIR /frontend

# Install dependencies first (layer cache)
COPY frontend/package*.json ./
RUN npm ci

# Build production bundle
COPY frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: Build the Go backend
# =============================================================================
FROM golang:1.22-alpine AS backend-builder

WORKDIR /backend

# Download dependencies first (layer cache)
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Build binary
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /code-runner .

# =============================================================================
# Stage 3: Minimal production image
# =============================================================================
FROM alpine:3.19

# Install ca-certs (HTTPS outbound) and Docker CLI (needed to spawn runner containers)
RUN apk add --no-cache ca-certificates docker-cli

WORKDIR /app

# Copy compiled binary
COPY --from=backend-builder /code-runner .

# Copy built frontend into the expected relative path
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Bundle runner Dockerfiles so the entrypoint can build them on the host
COPY dep/runner-python/Dockerfile     ./runners/python/Dockerfile
COPY dep/runner-javascript/Dockerfile ./runners/javascript/Dockerfile
COPY dep/runner-go/Dockerfile         ./runners/go/Dockerfile
COPY dep/runner-cpp/Dockerfile        ./runners/cpp/Dockerfile
COPY dep/runner-java/Dockerfile       ./runners/java/Dockerfile

# Entrypoint: checks/builds runner images, then starts the server
COPY dep/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Run as root so we can talk to the Docker socket.
# The socket is bind-mounted from the host and is typically owned by root:docker.
# Running as non-root requires matching the host's docker GID, which varies.
# Security is enforced at the container level (runner containers are sandboxed).

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]

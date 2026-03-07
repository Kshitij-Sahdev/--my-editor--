# =============================================================================
# Stage 1: Build the React frontend
# =============================================================================
FROM node:20-alpine AS frontend-builder

# Accept Clerk key as build arg — Vite bakes VITE_* into the JS bundle
ARG VITE_CLERK_PUBLISHABLE_KEY=""
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}

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

# Non-root user for defense-in-depth.
# The user needs access to /var/run/docker.sock (mounted at runtime).
# On most hosts the socket is group-owned by GID 999 or 998 (docker group).
# We create a docker group with a common GID and add the runner user to it.
# GID 999 may already be taken in the base image, so fall back gracefully.
RUN (addgroup -g 999 -S docker || addgroup -S docker) && \
    addgroup -S runner && \
    adduser -S runner -G runner && \
    addgroup runner docker
USER runner

EXPOSE 8080

CMD ["./code-runner"]

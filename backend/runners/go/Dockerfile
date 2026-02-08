FROM golang:1.22-alpine

# Create runner user first
RUN adduser -D runner

# Set up build cache location that persists in image (in /opt which won't be overwritten)
ENV GOCACHE=/opt/go-cache
ENV GOPATH=/opt/go
ENV CGO_ENABLED=0

# Pre-compile Go standard library to populate cache
RUN mkdir -p /opt/go-cache /opt/go && chown -R runner:runner /opt/go-cache /opt/go
USER runner
RUN go build -a std

WORKDIR /app

# Build to tmpfs, run from there
CMD ["sh", "-c", "go build -o /tmp/prog main.go && /tmp/prog"]

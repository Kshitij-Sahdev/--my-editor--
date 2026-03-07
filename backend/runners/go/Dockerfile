FROM golang:1.22-alpine3.19

RUN apk add --no-cache bash && \
    addgroup -S runner && adduser -S runner -G runner

ENV GOCACHE=/tmp/go-cache \
    GOMODCACHE=/tmp/go-mod \
    CGO_ENABLED=0

RUN mkdir -p /tmp/go-cache /tmp/go-mod && \
    chown -R runner:runner /tmp/go-cache /tmp/go-mod

USER runner
WORKDIR /app

CMD ["bash", "-c", "go build -o /tmp/prog main.go && /tmp/prog"]
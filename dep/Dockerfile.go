FROM golang:1.22-alpine

RUN addgroup -S runner && adduser -S runner -G runner
USER runner
WORKDIR /app

CMD ["bash", "-c", "go build -o /tmp/prog main.go && /tmp/prog"]

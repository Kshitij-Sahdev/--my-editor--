FROM golang:1.22-alpine

RUN adduser -D runner
USER runner
WORKDIR /app

CMD ["go", "run", "main.go"]

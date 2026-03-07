FROM node:20-alpine

RUN addgroup -S runner && adduser -S runner -G runner
USER runner
WORKDIR /app

CMD ["bash", "-c", "node main.js"]

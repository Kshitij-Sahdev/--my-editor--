FROM eclipse-temurin:21-jdk-alpine

RUN addgroup -S runner && adduser -S runner -G runner
USER runner
WORKDIR /app

CMD ["bash", "-c", "javac -d /tmp Main.java && java -cp /tmp Main"]

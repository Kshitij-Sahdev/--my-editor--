FROM eclipse-temurin:21-jdk

RUN useradd -m runner
USER runner
WORKDIR /app

# Compile to /tmp (tmpfs writable), then run from there
CMD ["bash", "-c", "javac -d /tmp Main.java && java -cp /tmp Main"]

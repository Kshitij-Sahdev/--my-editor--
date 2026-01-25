FROM eclipse-temurin:21-jdk

RUN useradd -m runner
USER runner
WORKDIR /app

CMD ["bash", "-c", "javac Main.java && java Main"]

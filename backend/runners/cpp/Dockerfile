FROM gcc:13

RUN useradd -m runner
USER runner
WORKDIR /app

CMD ["bash", "-c", "g++ main.cpp -O2 -o main && ./main"]

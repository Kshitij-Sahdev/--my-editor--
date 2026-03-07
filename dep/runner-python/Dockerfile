FROM python:3.12-slim

RUN useradd -m runner
USER runner
WORKDIR /app

CMD ["bash", "-c", "python3 main.py"]

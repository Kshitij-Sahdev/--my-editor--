FROM python:3.11-slim

# Create a non-root user (security)
RUN useradd -m runner

# Switch to that user
USER runner

# Where code will be mounted
WORKDIR /app

# When container starts, do THIS
CMD ["python3", "main.py"]

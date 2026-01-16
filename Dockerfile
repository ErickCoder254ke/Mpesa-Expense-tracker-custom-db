# Use Python 3.11 slim image for smaller size and better security
# Using explicit version tag for better caching and reproducibility
FROM python:3.11.7-slim-bookworm

# Set working directory
WORKDIR /app

# Install system dependencies in a single layer to reduce image size
# Also helps with potential network timeouts by doing this early
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements first for better Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python dependencies with retry logic and increased timeout
# Using --default-timeout to handle slow connections
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    --default-timeout=100 \
    --retries 5 \
    -r backend/requirements.txt

# Copy the entire backend directory
COPY backend/ /app/backend/

# Expose the port (Railway/Render will override with $PORT)
EXPOSE 8000

# Set environment variables for Python optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    PYTHONDONTWRITEBYTECODE=1

# Change to backend directory
WORKDIR /app/backend

# Add healthcheck (Railway may override, but good for local testing)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/api/health').read()" || exit 1

# Railway/Render sets PORT environment variable, default to 8000 for local testing
# Use --timeout-keep-alive for better connection handling
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-keep-alive 75 --log-level info"]

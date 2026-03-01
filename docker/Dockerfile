# Multi-stage build for DataraAI
# Stage 1: Build Frontend
FROM node:18-alpine AS dashboard-builder

WORKDIR /build/dashboard
COPY dashboard/package*.json ./
RUN npm ci --only=production && npm run build 2>/dev/null || npm install && npm run build
COPY dashboard/ .
RUN npm run build

# Stage 2: Backend Base Image
FROM python:3.11-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libopencv-dev \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/src ./src

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "300", "src.app:app"]

# Stage 3: Frontend Stage
FROM node:18-alpine AS dashboard

WORKDIR /app/dashboard

# Copy built dashboard from builder
COPY --from=dashboard-builder /build/dashboard/dist ./dist
COPY --from=dashboard-builder /build/dashboard/package*.json ./
COPY --from=dashboard-builder /build/dashboard/vite.config.ts ./

RUN npm install --only=production

EXPOSE 8080

CMD ["npm", "run", "preview"]

# # Stage 4: Robotics Stage (if applicable)
# FROM python:3.11-slim AS robotics
#
# RUN apt-get update && apt-get install -y \
#     libgl1-mesa-glx \
#     libglib2.0-0 \
#     libsm6 \
#     libxext6 \
#     libxrender-dev \
#     libgomp1 \
#     && rm -rf /var/lib/apt/lists/*
#
# WORKDIR /app/robotics
#
# # Copy robotics requirements if they exist
# COPY backend/requirements.txt requirements.txt
# RUN pip install --no-cache-dir -r requirements.txt || true
#
# COPY robotics/ .
#
# ENV PYTHONUNBUFFERED=1
#
# EXPOSE 5002
#
# CMD ["python", "app.py"]

# Stage 5: Production Image (Combined)
FROM python:3.11-slim AS production

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libopencv-dev \
    nginx \
    supervisor \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create necessary directories
RUN mkdir -p logs uploads dataset/train/images/{good,bad} dataset/test/images models robotics

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend code
COPY --from=backend /app/backend/src ./backend/src

# Copy dashboard built files
COPY --from=dashboard-builder /build/dashboard/dist ./dashboard/dist

# Copy robotics code
COPY robotics/ ./robotics/

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy nginx config
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

# EXPOSE 5000 5002 8080 80 443
EXPOSE 5000 8080 80 443


ENTRYPOINT ["/entrypoint.sh"]

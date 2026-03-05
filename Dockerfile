# Multi-stage build for DataraAI
# Stage 1: Build Frontend
FROM node:22-alpine AS dashboard-builder

RUN npm install -g pnpm

WORKDIR /build/dashboard

COPY dashboard/ .

RUN ls -la && CI=true pnpm install

RUN pnpm run build

# Stage 2: Backend Base Image
FROM python:3.12-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libopencv-dev \
    netcat-traditional && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy requirements and
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend .

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

EXPOSE 5151

CMD ["gunicorn", "--bind", "0.0.0.0:5151", "--workers", "4", "--timeout", "300", "app:app"]

# Stage 3: Frontend Stage
FROM node:22-alpine AS dashboard

RUN npm install -g pnpm

WORKDIR /app/dashboard

# Copy built dashboard from builder
COPY --from=dashboard-builder /build/dashboard/dist ./dist
COPY --from=dashboard-builder /build/dashboard/package*.json ./
COPY --from=dashboard-builder /build/dashboard/vite.config.ts ./

RUN pnpm install --only=production

EXPOSE 8080

CMD ["pnpm", "run", "preview"]

# Stage 4: Production Image (Combined)
FROM python:3.12-slim AS production

# Install system dependencies including nginx
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libopencv-dev \
    nginx \
    supervisor \
    netcat-traditional && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create necessary directories
RUN mkdir -p logs uploads dataset/train/images/{good,bad} dataset/test/images models robotics

# Install Python dependencies
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend code
COPY --from=backend /app/backend ./backend

# Copy dashboard built files
COPY --from=dashboard-builder /build/dashboard/dist ./dashboard/dist

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

EXPOSE 5151 8080

ENTRYPOINT ["/entrypoint.sh"]

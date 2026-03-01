#!/bin/bash

# DataraAI Docker Entrypoint Script
# Orchestrates startup of all services

set -e

echo "🚀 Starting DataraAI Services..."

# Function to wait for service availability
wait_for_service() {
    local host=$1
    local port=$2
    local name=$3
    local max_attempts=30
    local attempt=1

    echo "Waiting for $name ($host:$port)..."

    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            echo "✓ $name is ready"
            return 0
        fi
        echo "  Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "⚠ Warning: $name did not become available in time"
    return 1
}

# Export Python path for imports
export PYTHONPATH="${PYTHONPATH}:/app/backend/src"

# Navigate to app directory
cd /app

# Create necessary directories
mkdir -p logs uploads dataset/train/images/{good,bad} dataset/test/images models

# ==========================================
# Start Backend Service
# ==========================================
echo "Starting Backend (Flask) Service..."
cd /app/backend
python src/app.py > /app/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Wait for backend to be ready
wait_for_service localhost 5000 "Backend API" || true

# ==========================================
# Start Robotics Service
# ==========================================
if [ -f "/app/robotics/app.py" ]; then
    echo "Starting Robotics Service..."
    cd /app/robotics
    python app.py > /app/logs/robotics.log 2>&1 &
    ROBOTICS_PID=$!
    echo "Robotics service started with PID $ROBOTICS_PID"
    wait_for_service localhost 5002 "Robotics Service" || true
else
    echo "⚠ Robotics service code not found, skipping..."
fi

# ==========================================
# Start Frontend (Static Server)
# ==========================================
if [ -d "/app/dashboard/dist" ]; then
    echo "Starting Frontend (Static Server)..."
    cd /app/dashboard/dist
    python -m http.server 8080 > /app/logs/dashboard.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend started with PID $FRONTEND_PID"
    wait_for_service localhost 8080 "Frontend" || true
else
    echo "⚠ Frontend dist directory not found"
fi

# ==========================================
# Start Nginx Reverse Proxy
# ==========================================
echo "Starting Nginx Reverse Proxy..."
nginx -g "daemon off;" &
NGINX_PID=$!
echo "Nginx started with PID $NGINX_PID"

# ==========================================
# Health Check Loop
# ==========================================
echo ""
echo "======================================"
echo "All services started!"
echo "======================================"
echo ""
echo "Service Status:"
echo "  Backend (Flask):    http://localhost:5000"
echo "  Frontend:           http://localhost:8080"
echo "  Robotics (if available): http://localhost:5002"
echo "  Nginx Proxy:        http://localhost"
echo ""
echo "Logs:"
echo "  Backend:   /app/logs/backend.log"
echo "  Frontend:  /app/logs/frontend.log"
echo "  Robotics:  /app/logs/robotics.log"
echo ""

# Keep container running and monitor services
while true; do
    sleep 10

    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "⚠ Backend process died, restarting..."
        cd /app/backend
        python src/app.py > /app/logs/backend.log 2>&1 &
        BACKEND_PID=$!
    fi

    if ! kill -0 $NGINX_PID 2>/dev/null; then
        echo "⚠ Nginx process died, restarting..."
        nginx -g "daemon off;" &
        NGINX_PID=$!
    fi
done



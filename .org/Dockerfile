# Multi-stage build for DataraAI
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/frontend
COPY newfrontend/future-robot-trainer/package*.json ./
RUN npm ci --only=production
COPY newfrontend/future-robot-trainer/ ./
RUN npm run build

# Python backend
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy robotics system
COPY robotics/ ./robotics/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p uploads dataset/train/images/good dataset/train/images/bad

# Expose ports
EXPOSE 5000 5002 8080

# Start services
CMD ["sh", "-c", "cd backend && python app.py & cd ../robotics/weld_detection_enhanced && python app.py & cd ../frontend && python -m http.server 8080 --directory dist"]
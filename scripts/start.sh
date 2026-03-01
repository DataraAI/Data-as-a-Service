#!/bin/bash

# DataraAI Application Startup Script
# Starts backend and dashboard frontend

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting DataraAI Application${NC}"
echo "======================================"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $1 is already in use"
        return 1
    else
        echo "Port $1 is available"
        return 0
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping DataraAI Application...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Application stopped${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Creating from template...${NC}"
    if [ -f "$PROJECT_ROOT/config/.env.example" ]; then
        cp "$PROJECT_ROOT/config/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✓ Created .env file. Please edit with your configuration.${NC}"
    else
        echo -e "${RED}❌ No .env template found!${NC}"
        exit 1
    fi
fi

# Check port availability
echo -e "${BLUE}Checking port availability...${NC}"
if ! check_port 5000; then
    echo -e "${RED}❌ Backend port 5000 is already in use. Please stop the existing process.${NC}"
    exit 1
fi

if ! check_port 5173; then
    echo -e "${YELLOW}⚠ Frontend port 5173 is already in use, will try next available port${NC}"
fi

# Start backend
echo -e "${BLUE}🔧 Starting backend server...${NC}"
cd "$PROJECT_ROOT/backend"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

python app.py > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Logs: $PROJECT_ROOT/backend/backend.log"

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${BLUE}🎨 Starting frontend development server...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "   Logs: $PROJECT_ROOT/frontend/frontend.log"

echo ""
echo -e "${GREEN}======================================"
echo "✅ DataraAI Application is running!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📊 Backend API:${NC}    http://127.0.0.1:5000"
echo -e "${BLUE}📊 Health Check:${NC}  http://127.0.0.1:5000/health"
echo -e "${BLUE}📊 API Stats:${NC}     http://127.0.0.1:5000/api/stats"
echo -e "${BLUE}🎨 Frontend:${NC}     http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait


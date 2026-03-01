#!/bin/bash

# DataraAI Development Startup Script
# Starts both backend and frontend development servers

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting DataraAI Development Servers${NC}"
echo "========================================"

# Check if .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠ .env file not found. Please run setup.sh first.${NC}"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${BLUE}Starting Backend...${NC}"
cd "$PROJECT_ROOT/backend"
source venv/bin/activate
python app.py > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "  Log: $PROJECT_ROOT/backend/backend.log"

# Wait for backend to start
sleep 3

# Start Frontend
echo -e "${BLUE}Starting Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "  Log: $PROJECT_ROOT/frontend/frontend.log"

# Print access info
echo -e "\n${GREEN}======================================"
echo "Servers are running! 🎉"
echo "======================================${NC}"
echo -e "\n${BLUE}Access Points:${NC}"
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:5000"
echo "API Stats: http://localhost:5000/api/stats"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for processes
wait




#!/bin/bash

# DataraAI Development Startup Script
# Starts backend + dashboard using the config/.env(.development) flow.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Starting DataraAI development servers${NC}"
echo "========================================"

if [ ! -f "$PROJECT_ROOT/config/.env" ] && [ ! -f "$PROJECT_ROOT/config/.env.development" ]; then
    echo -e "${YELLOW}Missing config/.env or config/.env.development. Run ./scripts/setup.sh first.${NC}"
    exit 1
fi

cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Starting backend...${NC}"
cd "$PROJECT_ROOT/backend"
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
python app.py > backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "  Log: $PROJECT_ROOT/backend/backend.log"

sleep 3

echo -e "${BLUE}Starting dashboard...${NC}"
cd "$PROJECT_ROOT/dashboard"
npm run dev > dashboard.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Dashboard started (PID: $FRONTEND_PID)${NC}"
echo "  Log: $PROJECT_ROOT/dashboard/dashboard.log"

echo -e "\n${GREEN}======================================"
echo "Servers are running"
echo "======================================${NC}"
echo -e "\n${BLUE}Default development URLs:${NC}"
echo "Frontend: http://localhost:5174"
echo "Backend:  http://localhost:5152"
echo ""
echo -e "${YELLOW}Ports can be overridden through config/.env.development.${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers.${NC}"

wait

#!/bin/bash

# random

# DataraAI Application Startup Script
echo "🚀 Starting DataraAI Application..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "Port $1 is already in use"
        return 1
    else
        echo "Port $1 is available"
        return 0
    fi
}

# Check if ports are available
echo "Checking port availability..."
if ! check_port 5151; then
    echo "❌ Backend port 5151 is already in use. Please stop the existing process."
    exit 1
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
python3 bmw_azure_51OS.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend development server..."
cd ../dashboard
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ DataraAI Application is starting up!"
echo ""
echo "📊 Backend API: http://127.0.0.1:5151"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping DataraAI Application..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Application stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
#!/bin/bash

# DataraAI Development Setup Script
# Initializes the project for development with all dependencies

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 DataraAI Development Setup"
echo "=============================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo -e "${GREEN}✓ Python $(python3 --version)${NC}"
echo -e "${GREEN}✓ Node $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Setup Backend
echo -e "${BLUE}\nSetting up Backend...${NC}"
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi

source venv/bin/activate
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install backend as editable package
echo "Installing backend package..."
pip install -e .
echo -e "${GREEN}✓ Backend package installed${NC}"

# Setup Frontend
echo -e "${BLUE}\nSetting up Frontend...${NC}"
cd "$PROJECT_ROOT/frontend"

echo "Installing Node dependencies..."
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

# Setup Environment Variables
echo -e "${BLUE}\nSetting up Environment Variables...${NC}"
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    if [ -f "$PROJECT_ROOT/config/.env.example" ]; then
        cp "$PROJECT_ROOT/config/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${YELLOW}⚠ Created .env file from template. Please edit with your values.${NC}"
    else
        echo -e "${YELLOW}⚠ No .env template found. Please create .env manually.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Summary
echo -e "${BLUE}\n=============================="
echo "Setup Complete! 🎉"
echo "==============================${NC}"
echo -e "\n${GREEN}Next Steps:${NC}"
echo "1. Edit .env with your configuration:"
echo "   vim $PROJECT_ROOT/.env"
echo ""
echo "2. Start the backend (Terminal 1):"
echo "   cd $PROJECT_ROOT/backend"
echo "   source venv/bin/activate"
echo "   python src/app.py"
echo ""
echo "3. Start the frontend (Terminal 2):"
echo "   cd $PROJECT_ROOT/frontend"
echo "   npm run dev"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:5000"
echo ""
echo -e "${BLUE}For more information, see docs/SETUP.md${NC}"




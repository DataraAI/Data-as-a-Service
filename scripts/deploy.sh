#!/bin/bash

# DataraAI Deployment Script
# Builds and deploys the application using Docker

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
REGISTRY="${DOCKER_REGISTRY:-}"
IMAGE_NAME="${IMAGE_NAME:-datara-ai}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${BLUE}🚀 DataraAI Deployment${NC}"
echo "======================================"

# Parse arguments
ENVIRONMENT="production"
for arg in "$@"; do
    case $arg in
        dev|development)
            ENVIRONMENT="development"
            ;;
        prod|production)
            ENVIRONMENT="production"
            ;;
        *)
            echo -e "${RED}Unknown argument: $arg${NC}"
            echo "Usage: deploy.sh [dev|prod]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker $(docker --version)${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is required but not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose $(docker-compose --version)${NC}"

# Build images
echo -e "${BLUE}\nBuilding Docker images...${NC}"
cd "$PROJECT_ROOT/docker"

if [ "$ENVIRONMENT" == "development" ]; then
    docker-compose -f docker-compose.dev.yml build
    COMPOSE_FILE="docker-compose.dev.yml"
else
    docker-compose build
    COMPOSE_FILE="docker-compose.yml"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Images built successfully${NC}"
else
    echo -e "${RED}❌ Image build failed${NC}"
    exit 1
fi

# Stop existing containers
echo -e "${BLUE}\nStopping existing containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true
echo -e "${GREEN}✓ Containers stopped${NC}"

# Start services
echo -e "${BLUE}\nStarting services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services started${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi

# Wait for services to be ready
echo -e "${BLUE}\nWaiting for services to be ready...${NC}"
sleep 5

# Check service health
echo -e "${BLUE}\nChecking service health...${NC}"

# Check backend
if curl -s http://localhost:5000/api/stats > /dev/null; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Backend health check failed (might still be starting)${NC}"
fi

# Check frontend
if curl -s http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Frontend health check failed (might still be starting)${NC}"
fi

# Summary
echo -e "\n${GREEN}======================================"
echo "Deployment Complete! 🎉"
echo "======================================${NC}"
echo -e "\n${BLUE}Access Points:${NC}"
echo "Frontend: http://localhost:8080"
echo "Backend:  http://localhost:5000"
echo "Nginx:    http://localhost:80"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "View logs:    docker-compose -f $COMPOSE_FILE logs -f"
echo "Stop:         docker-compose -f $COMPOSE_FILE down"
echo "Restart:      docker-compose -f $COMPOSE_FILE restart"
echo ""

# Optional: Push to registry
if [ -n "$REGISTRY" ]; then
    echo -e "${BLUE}\nPushing images to registry: $REGISTRY${NC}"
    FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "$FULL_IMAGE"
    docker push "$FULL_IMAGE"
    echo -e "${GREEN}✓ Images pushed to registry${NC}"
fi



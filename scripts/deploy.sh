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
REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
REGISTRY_USER="${REGISTRY_USER:-$USER}"
BACKEND_IMAGE="${BACKEND_IMAGE:-datara-backend}"
DASHBOARD_IMAGE="${DASHBOARD_IMAGE:-datara-dashboard}"
PROD_IMAGE="${PROD_IMAGE:-datara-ai}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo -e "${BLUE}🚀 DataraAI Deployment${NC}"
echo "======================================"

# Parse arguments
ENVIRONMENT="production"
BUILD_BACKEND=true
BUILD_DASHBOARD=true
PUSH_IMAGES=false

for arg in "$@"; do
    case $arg in
        dev|development)
            ENVIRONMENT="development"
            ;;
        prod|production)
            ENVIRONMENT="production"
            ;;
        --push)
            PUSH_IMAGES=true
            ;;
        --backend-only)
            BUILD_DASHBOARD=false
            ;;
        --dashboard-only)
            BUILD_BACKEND=false
            ;;
        *)
            echo -e "${RED}Unknown argument: $arg${NC}"
            echo "Usage: deploy.sh [dev|prod] [--push] [--backend-only|--dashboard-only]"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
if [ "$PUSH_IMAGES" = true ]; then
    echo -e "${BLUE}Registry: ${REGISTRY}${NC}"
fi

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
    COMPOSE_FILE="docker-compose.dev.yml"
    docker-compose -f "$COMPOSE_FILE" build
else
    COMPOSE_FILE="docker-compose.prod.yml"

    # Build backend
    if [ "$BUILD_BACKEND" = true ]; then
        echo -e "${BLUE}\nBuilding Backend image...${NC}"
        BACKEND_FULL_IMAGE="${REGISTRY}/${REGISTRY_USER}/${BACKEND_IMAGE}:${IMAGE_TAG}"
        docker build \
            -f Dockerfile.backend \
            -t "${BACKEND_IMAGE}:${IMAGE_TAG}" \
            -t "${BACKEND_FULL_IMAGE}" \
            ..

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Backend image built: ${BACKEND_FULL_IMAGE}${NC}"
        else
            echo -e "${RED}❌ Backend build failed${NC}"
            exit 1
        fi
    fi

    # Build dashboard
    if [ "$BUILD_DASHBOARD" = true ]; then
        echo -e "${BLUE}\nBuilding Dashboard image...${NC}"
        DASHBOARD_FULL_IMAGE="${REGISTRY}/${REGISTRY_USER}/${DASHBOARD_IMAGE}:${IMAGE_TAG}"
        docker build \
            -f Dockerfile.dashboard \
            -t "${DASHBOARD_IMAGE}:${IMAGE_TAG}" \
            -t "${DASHBOARD_FULL_IMAGE}" \
            ..

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Dashboard image built: ${DASHBOARD_FULL_IMAGE}${NC}"
        else
            echo -e "${RED}❌ Dashboard build failed${NC}"
            exit 1
        fi
    fi
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
if [ "$PUSH_IMAGES" = true ]; then
    echo -e "${BLUE}\nPushing images to registry: $REGISTRY${NC}"

    if [ "$BUILD_BACKEND" = true ]; then
        BACKEND_FULL_IMAGE="${REGISTRY}/${REGISTRY_USER}/${BACKEND_IMAGE}:${IMAGE_TAG}"
        echo -e "${BLUE}Pushing Backend: ${BACKEND_FULL_IMAGE}${NC}"
        docker push "$BACKEND_FULL_IMAGE"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Backend pushed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to push Backend${NC}"
            exit 1
        fi
    fi

    if [ "$BUILD_DASHBOARD" = true ]; then
        DASHBOARD_FULL_IMAGE="${REGISTRY}/${REGISTRY_USER}/${DASHBOARD_IMAGE}:${IMAGE_TAG}"
        echo -e "${BLUE}Pushing Dashboard: ${DASHBOARD_FULL_IMAGE}${NC}"
        docker push "$DASHBOARD_FULL_IMAGE"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Dashboard pushed successfully${NC}"
        else
            echo -e "${RED}❌ Failed to push Dashboard${NC}"
            exit 1
        fi
    fi
fi



#!/bin/bash

# DataraAI Deployment Script
echo "🚀 Starting DataraAI Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Please provide your domain name"
    echo "Usage: ./deploy.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
print_status "Deploying to domain: $DOMAIN"

# Update nginx configuration with domain
print_status "Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf

# Build frontend
print_status "Building frontend..."
cd newfrontend/future-robot-trainer
npm install
npm run build
cd ../..

# Create production environment file
print_status "Creating production environment..."
cat > .env << EOF
FLASK_ENV=production
MONGODB_PASSWORD=your_mongodb_password_here
DOMAIN=$DOMAIN
EOF

# Build Docker images
print_status "Building Docker images..."
docker-compose build

# Start services
print_status "Starting services..."
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check if services are running
print_status "Checking service health..."
if curl -f http://localhost:5050/health > /dev/null 2>&1; then
    print_status "✅ Backend is healthy"
else
    print_error "❌ Backend is not responding"
fi

if curl -f http://localhost:5002/ > /dev/null 2>&1; then
    print_status "✅ Robotics system is healthy"
else
    print_error "❌ Robotics system is not responding"
fi

if curl -f http://localhost:8080 > /dev/null 2>&1; then
    print_status "✅ Frontend is healthy"
else
    print_error "❌ Frontend is not responding"
fi

print_status "🎉 Deployment complete!"
print_status "Your DataraAI application should be available at:"
print_status "  - Main App: http://$DOMAIN"
print_status "  - Backend API: http://$DOMAIN/api"
print_status "  - Robotics System: http://$DOMAIN/robotics"

print_warning "Next steps:"
print_warning "1. Configure your domain's DNS to point to this server's IP"
print_warning "2. Set up SSL certificates (Let's Encrypt recommended)"
print_warning "3. Update nginx.conf with your SSL certificate paths"
print_warning "4. Restart nginx: docker-compose restart nginx"
# Docker Build & GHCR Publishing Guide

## Overview

This document explains the updated Docker build process and GitHub Actions workflow for building and publishing DataraAI images to GitHub Container Registry (GHCR).

---

## 📁 Docker Files Structure

### Separate Dockerfiles

We now have three separate Dockerfiles for better modularity:

1. **`Dockerfile.backend`** - Flask Python backend
   - Multi-stage build (development & production)
   - System dependencies for ML/CV tasks
   - Python 3.11 slim base
   - Health checks included

2. **`Dockerfile.dashboard`** - React + TypeScript frontend
   - Multi-stage build (development & production)
   - Node.js 18 alpine base
   - Optimized production builds
   - Health checks included

3. **`Dockerfile`** - Combined production image (optional)
   - Combines both backend and dashboard
   - Uses nginx as reverse proxy
   - Production-ready configuration

### Docker Compose Files

- **`docker-compose.dev.yml`** - Development setup with hot reload
- **`docker-compose.prod.yml`** - Production with separate services
- **`docker-compose.yml`** - Legacy combined setup (optional)

---

## 🏗️ Docker Stages

### Backend Dockerfile

```dockerfile
FROM python:3.11-slim

# Development stage
FROM base AS development
- Hot reload enabled
- Debug mode on
- Flask development server

# Production stage  
FROM base AS production
- Optimized dependencies
- Gunicorn with 4 workers
- Health checks
- Logging configured
```

### Dashboard Dockerfile

```dockerfile
FROM node:18-alpine

# Builder stage
FROM node:18-alpine AS builder
- Install dependencies
- Build production bundle

# Production stage
FROM node:18-alpine AS production
- Serve pre-built dist
- Lightweight image

# Development stage
FROM node:18-alpine AS development
- Live development server
- HMR enabled
```

---

## 🚀 Local Deployment

### Development Environment

```bash
cd docker
docker-compose -f docker-compose.dev.yml up
```

**Features:**
- MongoDB included with dev credentials
- Live reload for both backend and dashboard
- Mounted volumes for code changes
- Network isolation

### Production Environment

```bash
cd docker
docker-compose -f docker-compose.prod.yml up -d
```

**Features:**
- Optimized production images
- Health checks enabled
- Nginx reverse proxy
- Volume persistence

---

## 📦 Manual Build and Push

### Build Locally

```bash
# Build backend for production
cd docker
docker build -f Dockerfile.backend -t datara-backend:latest ..

# Build dashboard for production
docker build -f Dockerfile.dashboard -t datara-dashboard:latest ..
```

### Push to GHCR

```bash
# Login to GHCR
echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin

# Tag images
docker tag datara-backend:latest ghcr.io/your-username/datara-backend:latest
docker tag datara-dashboard:latest ghcr.io/your-username/datara-dashboard:latest

# Push
docker push ghcr.io/your-username/datara-backend:latest
docker push ghcr.io/your-username/datara-dashboard:latest
```

---

## 🔄 GitHub Actions Workflow

### Workflow File: `.github/workflows/docker-build.yml`

**Triggers:**
- Push to `main` or `develop` branches (with relevant file changes)
- Pull requests to `main` or `develop`
- Manual trigger via `workflow_dispatch`

**Path-based Filtering:**
- Only runs on changes to:
  - `backend/**`
  - `dashboard/**`
  - `docker/Dockerfile.*`
  - `.github/workflows/docker-build.yml`

### Jobs

#### 1. **build-backend**
Builds and publishes backend image to GHCR

**Steps:**
1. Checkout repository
2. Setup Docker Buildx (for multi-platform builds)
3. Login to GHCR
4. Extract metadata (tags, labels)
5. Build and push image

**Image naming:** `ghcr.io/{username}/datara-backend`

**Tags generated:**
- `branch-name` - For branches
- `latest` - For default branch (main)
- `sha-{hash}` - For git commits
- Semantic version tags (if using git tags)

#### 2. **build-dashboard**
Builds and publishes dashboard image to GHCR

**Same process as backend for frontend code**

**Image naming:** `ghcr.io/{username}/datara-dashboard`

#### 3. **build-production** (Optional)
Builds combined production image

**Runs only on:** Push events (not PR)
**Depends on:** Both backend and dashboard jobs
**Image naming:** `ghcr.io/{username}/datara-ai`

#### 4. **publish-release** (Optional)
Creates GitHub release with image pull commands

**Runs on:** Git tag creation (e.g., `v1.0.0`)

---

## 🔐 GitHub Secrets & Permissions

### Required Permissions

Add to your repository settings:

```yaml
permissions:
  contents: read          # Read repository
  packages: write         # Write to GHCR
```

### Automatic Authentication

GitHub Actions automatically provides `${{ secrets.GITHUB_TOKEN }}` which grants:
- Access to GHCR
- No additional secrets needed
- Scoped to repository

---

## 📝 Image Tagging Strategy

Images are tagged with:

1. **Branch name**
   ```
   ghcr.io/username/datara-backend:main
   ghcr.io/username/datara-backend:develop
   ```

2. **Latest tag**
   ```
   ghcr.io/username/datara-backend:latest  # Only for main branch
   ```

3. **Commit SHA**
   ```
   ghcr.io/username/datara-backend:main-a1b2c3d
   ```

4. **Version tags** (when using git tags)
   ```
   ghcr.io/username/datara-backend:v1.0.0
   ghcr.io/username/datara-backend:1.0
   ```

---

## 📊 Pull Images from GHCR

### Login to GHCR

```bash
# Using personal access token
echo $TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Or interactively
docker login ghcr.io
```

### Pull Images

```bash
# Latest backend
docker pull ghcr.io/your-username/datara-backend:latest

# Specific version
docker pull ghcr.io/your-username/datara-backend:v1.0.0

# From specific branch
docker pull ghcr.io/your-username/datara-backend:develop
```

### Docker Compose with GHCR Images

```yaml
version: '3.8'
services:
  backend:
    image: ghcr.io/your-username/datara-backend:latest
    # ... rest of config
  
  dashboard:
    image: ghcr.io/your-username/datara-dashboard:latest
    # ... rest of config
```

---

## 🛠️ Deploy Script Usage

The `scripts/deploy.sh` script now supports separate image builds:

### Local Production Build

```bash
# Build both backend and dashboard
./scripts/deploy.sh prod

# Build backend only
./scripts/deploy.sh prod --backend-only

# Build dashboard only
./scripts/deploy.sh prod --dashboard-only
```

### With GHCR Push

```bash
# Build and push to GHCR (requires auth)
DOCKER_REGISTRY=ghcr.io REGISTRY_USER=your-username ./scripts/deploy.sh prod --push

# Custom registry
DOCKER_REGISTRY=docker.io ./scripts/deploy.sh prod --push
```

### Development Environment

```bash
# Local development with hot reload
./scripts/deploy.sh dev
```

---

## 🏥 Health Checks

Both images include health checks:

### Backend
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/health')" || exit 1
```

### Dashboard
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080 || exit 1
```

Used by Docker Compose for service readiness checks.

---

## 📦 Image Sizes (Approximate)

| Image | Base | Size |
|-------|------|------|
| Backend (prod) | python:3.11-slim | ~400-500MB |
| Dashboard (prod) | node:18-alpine | ~100-150MB |
| Combined (prod) | python:3.11-slim | ~600-700MB |

---

## 🔍 Debugging

### Check Workflow Status

1. Go to repository → **Actions** tab
2. Select **Build and Publish to GHCR** workflow
3. Click on failed run for logs

### View Build Logs

```bash
# Watch local build
docker build -f docker/Dockerfile.backend . --progress=plain

# Check image layers
docker history datara-backend:latest
```

### Test Image Locally

```bash
# Run backend image
docker run -p 5000:5000 datara-backend:latest

# Run dashboard image
docker run -p 8080:8080 datara-dashboard:latest

# Run with docker-compose
docker-compose -f docker/docker-compose.prod.yml up
```

---

## 🚨 Troubleshooting

### Workflow Not Triggering

**Check:**
- Branch name is `main` or `develop`
- Files modified match path filters
- `.github/workflows/docker-build.yml` exists
- Workflow is enabled in Actions tab

### Build Failure

**Check logs:**
1. Go to Actions → Failed run
2. Click on failed job
3. Expand failed step for error details

**Common issues:**
- Missing files (e.g., `requirements.txt`, `package.json`)
- Syntax errors in Dockerfile
- Insufficient permissions (check secrets)

### Login Issues

**Solutions:**
```bash
# Clear Docker credentials
docker logout ghcr.io

# Re-authenticate
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Verify token permissions
# Token needs: repo (all), write:packages, read:packages
```

### Image Pull Fails

**Check:**
- Image exists in GHCR (repository → Packages)
- Registry URL is correct
- You're logged in: `docker login ghcr.io`
- Token has `read:packages` permission

---

## 📚 Reference

### Useful Links

- [GHCR Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions Docker](https://github.com/docker/build-push-action)
- [Docker Compose](https://docs.docker.com/compose/)

### Key Files

- `.github/workflows/docker-build.yml` - GitHub Actions workflow
- `docker/Dockerfile.backend` - Backend image build
- `docker/Dockerfile.dashboard` - Dashboard image build
- `docker/docker-compose.dev.yml` - Development environment
- `docker/docker-compose.prod.yml` - Production environment
- `scripts/deploy.sh` - Local deployment script

---

**Last Updated:** March 1, 2026  
**Status:** ✅ Complete and Ready


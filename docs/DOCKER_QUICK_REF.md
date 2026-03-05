# Docker Build Quick Reference

## 📁 File Structure

```
.github/
└── workflows/
    └── docker-build.yml       # GitHub Actions workflow

docker/
├── Dockerfile                 # Legacy combined build (optional)
├── Dockerfile.backend         # Backend image (NEW)
├── Dockerfile.dashboard       # Dashboard image (NEW)
├── docker-compose.dev.yml     # Development (updated)
├── docker-compose.prod.yml    # Production (NEW)
└── docker-compose.yml         # Legacy combined (optional)
```

---

## 🚀 Quick Commands

### Development (Local)

```bash
# Start dev environment with hot reload
cd docker
docker-compose -f docker-compose.dev.yml up

# Access:
# Backend: http://localhost:5000
# Frontend: http://localhost:5173
# MongoDB: localhost:27017
```

### Production (Local)

```bash
# Start production environment
cd docker
docker-compose -f docker-compose.prod.yml up -d

# Access:
# Frontend: http://localhost:8080
# Backend: http://localhost:5000
# Nginx: http://localhost:80
```

### Manual Build

```bash
# Backend
docker build -f docker/Dockerfile-backend -t datara-backend:latest .

# Dashboard
docker build -f docker/Dockerfile-dashboard -t datara-dashboard:latest .
```

### Push to GHCR

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# Tag
docker tag datara-backend:latest ghcr.io/your-username/datara-backend:latest
docker tag datara-dashboard:latest ghcr.io/your-username/datara-dashboard:latest

# Push
docker push ghcr.io/your-username/datara-backend:latest
docker push ghcr.io/your-username/datara-dashboard:latest
```

### Using Deploy Script

```bash
# Local production build
./scripts/deploy.sh prod

# Build only backend
./scripts/deploy.sh prod --backend-only

# Build and push to GHCR
DOCKER_REGISTRY=ghcr.io REGISTRY_USER=your-username ./scripts/deploy.sh prod --push

# Development
./scripts/deploy.sh dev
```

---

## 📊 Image Details

### Backend Image

| Aspect | Details |
|--------|---------|
| **Base** | python:3.11-slim |
| **Port** | 5000 |
| **Stages** | development, production |
| **Size** | ~400-500MB (prod) |
| **Health Check** | `/health` endpoint |

### Dashboard Image

| Aspect | Details |
|--------|---------|
| **Base** | node:18-alpine |
| **Port** | 8080 |
| **Stages** | builder, development, production |
| **Size** | ~100-150MB (prod) |
| **Health Check** | HTTP on port 8080 |

---

## 🔄 GitHub Actions

### Workflow Triggers

| Trigger | Condition | Result |
|---------|-----------|--------|
| Push to main | Files changed | Build & push |
| Push to develop | Files changed | Build & push |
| Pull request | To main/develop | Build only (no push) |
| Manual trigger | Any time | Build & push |
| Git tag | v* | Release notes |

### Image Tags Generated

```
# Branch
ghcr.io/username/datara-backend:main
ghcr.io/username/datara-backend:develop

# Latest
ghcr.io/username/datara-backend:latest

# Commit
ghcr.io/username/datara-backend:main-a1b2c3d

# Version (from git tags)
ghcr.io/username/datara-backend:v1.0.0
```

---

## 🛠️ Development Workflow

### Make Changes

```bash
# Edit code in backend/ or dashboard/
vim backend/app.py
vim dashboard/src/App.tsx
```

### Test Locally

```bash
# Dev environment auto-reloads
cd docker
docker-compose -f docker-compose.dev.yml up

# Changes are instant (mounted volumes)
```

### Push Changes

```bash
git add .
git commit -m "feat: description"
git push origin main
```

### Automatic Build

Workflow automatically:
1. ✅ Builds backend image
2. ✅ Builds dashboard image
3. ✅ Pushes to GHCR
4. ✅ Generates new tags

### Use New Images

```bash
# Pull latest
docker pull ghcr.io/username/datara-backend:latest
docker pull ghcr.io/username/datara-dashboard:latest

# Or use in docker-compose
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔍 Verify Setup

### Check Workflow File

```bash
# Verify file exists
ls -la .github/workflows/docker-build.yml

# Verify syntax
cat .github/workflows/docker-build.yml | head -20
```

### Check Dockerfiles

```bash
# Verify files exist
ls -la docker/Dockerfile.*

# Check for errors
docker build --dry-run -f docker/Dockerfile-backend .
```

### Enable Actions

In GitHub:
1. Settings → Actions → General
2. Allow all actions ✓
3. Workflow permissions → Read and write ✓

### Trigger First Build

```bash
# Make small change
echo "# test" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger workflow"
git push origin main

# Check Actions tab
# Should see "Build and Publish to GHCR" running
```

---

## 🐛 Troubleshooting

### Workflow Not Triggering

Check:
- Branch is `main` or `develop`
- Changed files match path filters
- Actions enabled in Settings
- Workflow file exists at `.github/workflows/docker-build.yml`

### Build Fails

1. Go to Actions tab
2. Click failed run
3. Click failed job
4. Expand step for error details
5. Common issues:
   - Missing `requirements.txt` or `package.json`
   - Syntax errors in Dockerfile
   - Invalid path in build context

### Images Not in GHCR

Check:
- Workflow completed successfully
- Changed files triggered the build
- Go to Packages tab in repository
- Images may take 30-60 seconds to appear

### Login Fails

```bash
# Check token
echo $GITHUB_TOKEN | wc -c  # Should have many chars

# Clear old credentials
docker logout ghcr.io

# Try again
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DOCKER_BUILD_GUIDE.md](DOCKER_BUILD_GUIDE.md) | Comprehensive Docker guide |
| [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md) | GitHub Actions setup |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Production deployment |
| [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) | General quick ref |

---

## 🎯 Key Points

✅ **Separate Dockerfiles** for backend and dashboard  
✅ **GitHub Actions** automates builds  
✅ **GHCR** hosts all images  
✅ **Hot reload** in development  
✅ **Health checks** included  
✅ **Multi-stage builds** optimize size  
✅ **Caching** speeds up builds  
✅ **No additional secrets** needed  

---

**Last Updated:** March 1, 2026


# Testing GitHub Actions Locally with Act

## Overview

This guide explains how to test the GitHub Actions workflow (`.github/workflows/docker-build.yml`) locally using the `act` tool before pushing to GitHub.

---

## 🔧 Installation

### macOS

```bash
# Using Homebrew
brew install act
```

### Linux

```bash
# Using curl
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash
```

### Windows (WSL2)

```bash
# Using curl in WSL2
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash
```

### Docker

If you have Docker installed but not act:

```bash
# Run act as Docker container
docker run --rm -v $(pwd):/workspace -v /var/run/docker.sock:/var/run/docker.sock \
  -w /workspace ghcr.io/nektos/act:latest
```

### Verify Installation

```bash
act --version
# Should output: act version X.X.X
```

---

## ⚙️ Configuration

### `.actrc` File (Already Created)

The `.actrc` file in the project root configures act with:

```
container-architecture: linux/amd64
network: datara-network
log-level: info
bind: true
```

**Configuration Options:**

| Option | Value | Purpose |
|--------|-------|---------|
| `container-architecture` | linux/amd64 | Build architecture |
| `network` | datara-network | Docker network for services |
| `log-level` | info | Logging verbosity |
| `bind` | true | Allow docker commands |

### Environment Variables

Create `.env` file in project root for GitHub Actions secrets:

```bash
# Create .env file
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
REGISTRY_USER=your-github-username
EOF
```

**Note:** The `GITHUB_TOKEN` is NOT needed for testing locally since act provides mock values. The `.env` is optional but can override defaults.

---

## 🚀 Running Workflows Locally

### Test All Workflows

```bash
# Run all jobs in all workflows
act

# Run with full output
act --verbose
```

### Test Specific Workflow

```bash
# Test Docker build workflow
act -j build-backend -W .github/workflows/docker-build.yml

# Test dashboard build
act -j build-dashboard -W .github/workflows/docker-build.yml

# Test production build
act -j build-production -W .github/workflows/docker-build.yml
```

### Test Specific Event

```bash
# Simulate push event (default)
act push

# Simulate pull request event
act pull_request

# Simulate manual dispatch
act workflow_dispatch

# List available events
act --list
```

### Test with Event Data

Create `.github/events/default.json` for custom event data:

```bash
# Create directory
mkdir -p .github/events

# Create default push event
cat > .github/events/default.json << 'EOF'
{
  "repository": {
    "name": "DataraAI-DAAS",
    "owner": {
      "login": "your-username"
    }
  },
  "ref": "refs/heads/main",
  "before": "0000000000000000000000000000000000000000",
  "after": "abc123def456abc123def456abc123def456abc1"
}
EOF
```

---

## 📊 Common Commands

### Backend Build Only

```bash
# Test just the backend build job
act -j build-backend

# With verbose output
act -j build-backend --verbose

# With specific platform
act -j build-backend -P ubuntu-latest=ghcr.io/catthehacker/ubuntu:full-latest
```

### Dashboard Build Only

```bash
# Test just the dashboard build job
act -j build-dashboard
```

### All Docker Jobs

```bash
# Run all docker-build workflow jobs
act -W .github/workflows/docker-build.yml
```

### List Available Jobs

```bash
# See all jobs in workflow
act --list

# Output:
# Stage  Job ID           Job name                  Workflow name                  Workflow file
# 0      build-backend    build-backend             Build and Publish to GHCR      docker-build.yml
# 0      build-dashboard  build-dashboard           Build and Publish to GHCR      docker-build.yml
# 1      build-production build-production          Build and Publish to GHCR      docker-build.yml
# 2      publish-release  publish-release           Build and Publish to GHCR      docker-build.yml
```

---

## 🔍 Debugging

### View Logs

```bash
# See detailed logs
act --verbose

# Save logs to file
act > act.log 2>&1
tail -f act.log
```

### Interactive Debugging

```bash
# Pause before step
act -j build-backend --debug

# Run single step
act -j build-backend --step build-backend
```

### Shell into Container

```bash
# Keep container running after failure
act --reuse

# Connect to container
docker ps  # Find container ID
docker exec -it <container-id> bash
```

---

## 🐳 Docker Configuration

### Check Docker Setup

```bash
# Verify Docker is running
docker ps

# Check Docker version
docker version

# Check available space
docker system df
```

### Increase Docker Resources

If builds fail due to resource limits:

```bash
# Update Docker Desktop settings
# Settings → Resources
# Increase: CPU, Memory, Disk

# Or via command line:
docker system prune -a  # Clean up unused images/containers
```

### Use Local Images

To test with locally built images:

```bash
# Build locally first
docker build -f docker/Dockerfile-backend -t datara-backend:latest .

# Then act will use the local image
act -j build-backend
```

---

## 📝 Workflow Testing Checklist

- [ ] Install act: `brew install act` (or platform equivalent)
- [ ] Create `.env` with `GITHUB_TOKEN` (optional)
- [ ] Verify Docker running: `docker ps`
- [ ] Test backend build: `act -j build-backend`
- [ ] Test dashboard build: `act -j build-dashboard`
- [ ] Test full workflow: `act`
- [ ] Check logs for errors
- [ ] Verify images created: `docker images | grep datara`

---

## ⚠️ Limitations

When testing locally with act:

| Feature | GitHub Actions | Act (Local) | Note |
|---------|---|---|---|
| Push to registry | ✅ | ❌ | Need auth token |
| Docker build | ✅ | ✅ | Works |
| Caching | ✅ | ⚠️ | Limited |
| Secrets | ✅ | ⚠️ | Mock values |
| Artifact upload | ✅ | ❌ | No artifact storage |
| Matrix builds | ✅ | ✅ | Supported |
| Service containers | ✅ | ⚠️ | Network isolation |

### To Push Images Locally

If you want to actually push to GHCR while testing:

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Create .env with your token
cat > .env << 'EOF'
GITHUB_TOKEN=ghp_your_actual_token
REGISTRY_USER=your-username
EOF

# Then run act with env vars
act --secret-file .env
```

---

## 🎯 Typical Testing Workflow

### 1. Make Code Changes

```bash
# Edit code
vim backend/app.py
```

### 2. Test Locally (Optional)

```bash
# Test backend locally
cd backend
python app.py

# Or test with docker-compose
cd docker
docker-compose -f docker-compose.dev.yml up
```

### 3. Simulate GitHub Actions

```bash
# Test the workflow locally
act -j build-backend --verbose

# Check if build succeeds
# Look for: ✓ Backend image built: ...
```

### 4. Fix Issues

```bash
# If build fails, check logs
act -j build-backend --verbose 2>&1 | grep -i error

# Fix Dockerfile or code
# Re-run act
act -j build-backend
```

### 5. Push to Repository

```bash
# Once local tests pass
git add .
git commit -m "feat: description"
git push origin main

# Then check GitHub Actions
# Go to: Repository → Actions → Build and Publish to GHCR
```

---

## 🐛 Troubleshooting

### "Docker socket is not available"

**Solution:**
```bash
# Make sure Docker is running
docker ps

# Or use Docker Desktop on macOS/Windows
```

### "Cannot connect to registry"

**Solution:**
```bash
# This is expected locally - registry push will fail
# But the image build should succeed
# Look for: Successfully tagged datara-backend:...
```

### "Out of disk space"

**Solution:**
```bash
# Clean up Docker
docker system prune -a

# Remove old images
docker rmi <image-id>

# Check space
docker system df
```

### "Act not found"

**Solution:**
```bash
# Reinstall act
brew install act

# Or use Docker version
docker run --rm -v $(pwd):/workspace ghcr.io/nektos/act:latest
```

### "Permission denied"

**Solution:**
```bash
# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock

# Or run with sudo
sudo act
```

---

## 📚 Advanced Usage

### Run Specific Step

```bash
# Run just the "Build and push Backend image" step
act -j build-backend --step "Build and push Backend image"
```

### Run with Custom Env

```bash
# Override environment variables
act -j build-backend \
  --env REGISTRY_USER=custom-user \
  --env IMAGE_TAG=v1.0.0
```

### Run with Matrix

```bash
# If workflow has matrix strategy
act -j build-backend -l

# Shows all matrix combinations
```

### Use Different Container Image

```bash
# Use different base image
act -P ubuntu-20.04=ghcr.io/catthehacker/ubuntu:full-20.04
```

---

## 📖 Example Commands

### Complete Backend Test

```bash
# Clean test of backend build
docker system prune -a
act -j build-backend --verbose --reuse

# Check result
docker images | grep datara-backend
```

### Complete Dashboard Test

```bash
# Test dashboard build
act -j build-dashboard --verbose

# Check result
docker images | grep datara-dashboard
```

### Full Pipeline Test

```bash
# Test entire docker-build.yml workflow
act --verbose 2>&1 | tee act-full.log

# Review log
less act-full.log
```

---

## 🔗 References

- **Act GitHub:** https://github.com/nektos/act
- **Act Documentation:** https://nektosact.com/
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

## ✅ Quick Checklist

- [ ] Act installed: `act --version`
- [ ] `.actrc` exists in project root
- [ ] Docker running: `docker ps`
- [ ] Tested backend build: `act -j build-backend`
- [ ] Tested dashboard build: `act -j build-dashboard`
- [ ] Reviewed workflow logs
- [ ] Ready to push to GitHub

---

**Last Updated:** March 1, 2026  
**Status:** ✅ Ready to use  
**Next:** Follow typical testing workflow above


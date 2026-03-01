# Act Quick Start - Test GitHub Actions Locally

## 🚀 Installation (One-time)

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash

# Verify
act --version
```

---

## ⚡ Essential Commands

### Test Backend Build
```bash
act -j build-backend
```

### Test Dashboard Build
```bash
act -j build-dashboard
```

### Test Full Workflow
```bash
act
```

### List All Jobs
```bash
act --list
```

### Verbose Output
```bash
act -j build-backend --verbose
```

---

## 🔍 Common Workflows

### Quick Backend Test
```bash
# Clean and test
docker system prune -a
act -j build-backend --verbose
```

### Full Pipeline Test
```bash
# Test everything
act --verbose 2>&1 | tee act.log
```

### Test with Reuse
```bash
# Keep containers for faster re-runs
act -j build-backend --reuse
```

---

## ⚙️ Configuration

The `.actrc` file in project root is pre-configured with:
- Docker architecture: `linux/amd64`
- Network: `datara-network`
- Bind mount: `true` (allows docker commands)
- Log level: `info`

---

## 📝 Testing Checklist

```bash
# 1. Install act
brew install act

# 2. Verify Docker
docker ps

# 3. Test backend
act -j build-backend

# 4. Test dashboard
act -j build-dashboard

# 5. Review logs for errors
# Should see: "✓ Build image succeeds"
```

---

## 🐛 Quick Troubleshooting

### Docker not running
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker daemon (Linux)
docker ps  # Should work
```

### Out of disk space
```bash
docker system prune -a
```

### Permission denied
```bash
sudo chmod 666 /var/run/docker.sock
# Or: sudo act -j build-backend
```

### Act not found
```bash
brew install act
# Or: brew upgrade act
```

---

## 📚 Full Documentation

→ See: `docs/TESTING_GITHUB_ACTIONS_LOCALLY.md`

---

**Quick Summary:**
- Install: `brew install act`
- Test backend: `act -j build-backend`
- Test dashboard: `act -j build-dashboard`
- Full test: `act`
- Check logs: `--verbose` flag


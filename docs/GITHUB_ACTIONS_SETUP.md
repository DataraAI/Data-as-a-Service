# GitHub Actions Setup & Configuration

## Overview

This guide explains how to set up and configure GitHub Actions for building and publishing Docker images to GitHub Container Registry (GHCR).

---

## ✅ Prerequisites

1. **GitHub Account** - With push access to repository
2. **Repository Settings** - Public or private (both work)
3. **GitHub Token** - Automatically provided by Actions
4. **No Additional Secrets Needed** - Using default `GITHUB_TOKEN`

---

## 🔧 Step-by-Step Setup

### Step 1: Enable GitHub Actions

1. Go to your repository
2. Click **Settings**
3. Go to **Actions** → **General**
4. Under "Actions permissions", select **Allow all actions and reusable workflows**
5. Click **Save**

### Step 2: Create Workflow Directory

The workflow file is already created at:
```
.github/workflows/docker-build.yml
```

If directory doesn't exist:
```bash
mkdir -p .github/workflows
```

### Step 3: Verify Workflow File

Check that `.github/workflows/docker-build.yml` exists in your repository with:

```yaml
name: Build and Publish to GHCR
on:
  push:
    branches:
      - main
      - develop
  # ... rest of config
```

### Step 4: Set Repository Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

---

## 🔐 Authentication

GitHub Actions uses the built-in `GITHUB_TOKEN` for GHCR authentication:

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

**This token is automatically provided and does NOT need to be added manually.**

### Token Permissions

The automatic `GITHUB_TOKEN`:
- ✅ Can push to GHCR
- ✅ Scoped to current repository
- ✅ Limited-time validity per workflow run
- ✅ No secrets management needed

---

## 🚀 Triggering Builds

### Automatic Triggers

The workflow runs automatically when:

1. **Push to main branch**
   ```bash
   git push origin main
   ```
   - If changes include: `backend/**`, `dashboard/**`, `docker/Dockerfile.*`

2. **Push to develop branch**
   ```bash
   git push origin develop
   ```
   - Same path filters apply

3. **Pull Requests**
   - To `main` or `develop`
   - Builds images but does NOT push to GHCR
   - Good for testing before merge

### Manual Trigger

Manually run the workflow:

1. Go to **Actions** tab
2. Select **Build and Publish to GHCR**
3. Click **Run workflow**
4. Select branch: `main` or `develop`
5. Click **Run workflow**

---

## 📊 Workflow Status

### Viewing Builds

1. Go to **Actions** tab
2. See list of recent workflow runs
3. Click on any run to see details
4. Each job shows logs and outputs

### Understanding Status

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 Green | Success | Images pushed to GHCR |
| 🔴 Red | Failed | Check logs, fix error |
| 🟡 Yellow | Running | Wait for completion |
| ⚫ Black | Skipped | Changed files didn't match filters |

---

## 📦 Accessing Built Images

### In GitHub UI

1. Go to repository
2. Click **Packages** tab
3. See all available container images
4. Click image to view versions and sizes

### View Package Details

Each package shows:
- Available tags
- Image size
- Push date
- Visibility settings

### Pull Commands

On package page, click "Copy pull command":

```bash
docker pull ghcr.io/your-username/datara-backend:latest
```

---

## 🏗️ Generated Image Names

Images are automatically named based on your GitHub user/org:

```
ghcr.io/{github-username}/datara-backend:latest
ghcr.io/{github-username}/datara-dashboard:latest
```

For organization repositories:

```
ghcr.io/{org-name}/datara-backend:latest
ghcr.io/{org-name}/datara-dashboard:latest
```

---

## 🔒 Package Visibility

### Default Behavior

Images inherit repository visibility:
- **Public repo** → Public images (discoverable)
- **Private repo** → Private images (need auth to pull)

### Change Package Visibility

1. Go to **Packages**
2. Click on image
3. Click **Package settings**
4. Change **Visibility**

Options:
- **Public** - Anyone can pull
- **Private** - Only authenticated users
- **Internal** - Only organization members

---

## 🔄 Workflow Structure

```
Trigger (Push/PR/Manual)
    ↓
Checkout Code
    ↓
├─ build-backend
│  ├─ Setup Docker Buildx
│  ├─ Login to GHCR
│  ├─ Extract metadata
│  └─ Build & Push Backend
│
├─ build-dashboard
│  ├─ Setup Docker Buildx
│  ├─ Login to GHCR
│  ├─ Extract metadata
│  └─ Build & Push Dashboard
│
└─ build-production (if push)
   ├─ Wait for both above
   ├─ Extract metadata
   └─ Build & Push Combined
```

---

## 💾 Build Cache

The workflow uses GitHub Actions cache for faster builds:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Benefits:**
- Faster rebuilds (skips unchanged layers)
- Reduces GHCR bandwidth
- Automatic cache cleanup

---

## 📝 Customization

### Change Branch Triggers

Edit `.github/workflows/docker-build.yml`:

```yaml
on:
  push:
    branches:
      - main        # Change these
      - develop     # branch names
      - release
```

### Add Path Filters

Only build on specific file changes:

```yaml
on:
  push:
    paths:
      - 'backend/**'
      - 'dashboard/**'
      - 'docker/Dockerfile.*'
```

### Add Environment Variables

Add to workflow jobs:

```yaml
jobs:
  build-backend:
    env:
      REGISTRY: ghcr.io
      IMAGE_TAG: v1.0.0
```

---

## 🐛 Common Issues & Solutions

### Workflow Not Found

**Problem:** Workflow doesn't appear in Actions tab

**Solutions:**
1. Ensure `.github/workflows/docker-build.yml` exists
2. Push changes: `git add .github && git commit -m "Add workflow" && git push`
3. Refresh Actions tab (may take 1 minute)

### "Resource not accessible by integration"

**Problem:** GITHUB_TOKEN permission error

**Solution:**
1. Go to **Settings** → **Actions** → **General**
2. Change "Workflow permissions" to **Read and write permissions**

### Images Not Pushed to GHCR

**Problem:** Workflow succeeds but no images appear

**Causes & Solutions:**
1. Using pull request (images only push on push event)
2. Changed files don't match path filters
3. Need to push to `main` or `develop` branch

### Build Fails on Backend

**Problem:** Python dependencies or build error

**Solutions:**
1. Check `backend/requirements.txt` exists
2. Verify it's valid Python dependencies
3. Check Dockerfile.backend syntax
4. Review workflow logs for specific error

### Build Fails on Dashboard

**Problem:** Node dependencies or build error

**Solutions:**
1. Check `dashboard/package.json` exists
2. Verify it's valid JSON
3. Check Dockerfile.dashboard syntax
4. Review logs for specific error

---

## 🔐 Security Best Practices

### Token Management

✅ **Do:**
- Use automatic `GITHUB_TOKEN`
- Use short-lived tokens (automatic)
- Scope tokens to necessary permissions (automatic)

❌ **Don't:**
- Hardcode personal access tokens
- Share tokens in code
- Use weak token permissions

### Image Security

✅ **Do:**
- Keep base images updated (rebuild regularly)
- Scan images for vulnerabilities
- Use private repositories for sensitive code
- Limit who can modify workflows

❌ **Don't:**
- Build from unverified base images
- Include secrets in Docker files
- Public images with private data
- Allow unsigned commits

---

## 📊 Monitoring & Logs

### View Workflow Run

1. Go to **Actions** tab
2. Click on workflow name
3. Click on specific run
4. View job logs

### Export Logs

Download workflow logs:
1. Click run
2. Click **⋯** (three dots)
3. Select **Download all logs**

### Set Up Notifications

GitHub sends notifications for:
- ✅ Successful builds
- ❌ Failed builds (by default)

Customize in repository settings:
1. Go to **Notification settings**
2. Choose: Watch, Not watching, Ignoring
3. Configure for pull requests/actions

---

## 🚀 Advanced Usage

### Manual Image Push

If you need to manually push images:

```bash
# Login (using GitHub token)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag and push
docker tag datara-backend:latest ghcr.io/username/datara-backend:latest
docker push ghcr.io/username/datara-backend:latest
```

### Scheduled Builds

Add scheduled builds (e.g., nightly):

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
```

### Matrix Builds

Build multiple Python versions:

```yaml
strategy:
  matrix:
    python-version: ['3.9', '3.10', '3.11']
```

---

## 🎯 Next Steps

1. **Verify Setup**
   - Check `.github/workflows/docker-build.yml` exists
   - Enable Actions in Settings
   - Set workflow permissions

2. **Trigger a Build**
   - Make small change to `backend/` or `dashboard/`
   - Push to `main` or `develop`
   - Check Actions tab for build progress

3. **Pull Image**
   - Wait for build to complete
   - Go to Packages
   - Copy pull command
   - Test: `docker pull ghcr.io/...`

4. **Configure Pipeline**
   - Customize branches as needed
   - Add additional checks/tests
   - Set up notifications

---

**Last Updated:** March 1, 2026  
**Status:** ✅ Ready to Use


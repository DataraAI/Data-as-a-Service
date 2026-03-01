# Migration Guide: Old Structure → Refactored Structure

This guide helps you migrate from the original scattered project structure to the new organized refactored structure.

## 📋 Overview

The refactored project consolidates:
- Python backend code into organized modules
- React frontend in a single location
- Docker configuration in dedicated folder
- Documentation in centralized docs folder
- Scripts for common tasks

## 🔄 Migration Steps

### Step 1: Backup Original Project
```bash
# Create a backup of the original structure
cd /Users/pj/Projects/python/DataraAI-DAAS
cp -r . ../DataraAI-DAAS-backup-$(date +%Y%m%d)
echo "Backup created successfully"
```

### Step 2: Copy Refactored Structure
```bash
# The refactored folder is ready at:
# /Users/pj/Projects/python/DataraAI-DAAS/refactored/

# For production use, you can replace the original structure
# (ensure backup is created first!)
```

### Step 3: Update Environment Variables
```bash
# Copy the environment template
cp refactored/config/.env.example refactored/.env

# Edit with your actual configuration
vim refactored/.env

# Key variables to update:
# - MONGODB_PASSWORD
# - Azure credentials (if using)
# - AWS credentials (if using)
# - Backend/Frontend URLs
```

### Step 4: Test the Setup
```bash
# Navigate to refactored directory
cd refactored

# Run setup script (creates virtual environment, installs deps)
chmod +x scripts/setup.sh
./scripts/setup.sh

# This will:
# ✓ Check prerequisites (Python, Node.js)
# ✓ Create Python virtual environment
# ✓ Install Python dependencies
# ✓ Install Node dependencies
# ✓ Setup environment variables
```

### Step 5: Start Development
```bash
# Use the dev script to start both backend and frontend
chmod +x scripts/dev.sh
./scripts/dev.sh

# Access at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:5000
```

### Step 6: Verify All Services
```bash
# Check backend health
curl http://localhost:5000/api/stats

# Check frontend (should return HTML)
curl http://localhost:5173

# Check database connection
# (Should be configured in .env)
```

## 📁 File Mapping: Old → New

### Backend Files

| Old Location | New Location | Purpose |
|---|---|---|
| `backend/app.py` | `refactored/backend/src/app.py` | Main Flask app |
| `backend/app_production.py` | `refactored/backend/src/app_production.py` | Production config |
| `backend/saas_config.py` | `refactored/backend/src/config/saas_config.py` | Configuration |
| `backend/routes/dashboard.py` | `refactored/backend/src/routes/dashboard.py` | API routes |
| `backend/check_dataset.py` | `refactored/backend/src/utils/check_dataset.py` | Dataset utilities |
| `backend/check.py` | `refactored/backend/src/utils/check.py` | General checks |
| `backend/deleteoldfiles.py` | `refactored/backend/src/utils/deleteoldfiles.py` | File cleanup |
| `backend/visualization.py` | `refactored/backend/src/utils/visualization.py` | Visualization |
| `backend/train_deeplab.py` | `refactored/backend/src/models/train_deeplab.py` | ML Training |
| `backend/train_resnet.py` | `refactored/backend/src/models/train_resnet.py` | ML Training |
| `backend/predict_seam_path.py` | `refactored/backend/src/models/predict_seam_path.py` | ML Inference |
| `backend/upload_frames_to_azure.py` | `refactored/backend/src/services/upload_frames_to_azure.py` | Azure service |
| `backend/call_lambda_vm.py` | `refactored/backend/src/services/call_lambda_vm.py` | AWS service |

### Frontend Files

| Old Location | New Location |
|---|---|
| `dashboard/*` | `refactored/frontend/*` |
| `dashboard/package.json` | `refactored/frontend/package.json` |
| `dashboard/src/**` | `refactored/frontend/src/**` |

### Docker Files

| Old Location | New Location |
|---|---|
| `Dockerfile` | `refactored/docker/Dockerfile` |
| `docker-compose.yml` | `refactored/docker/docker-compose.yml` |
| `nginx.conf` | `refactored/docker/nginx/nginx.conf` |
| (new) | `refactored/docker/docker-compose.dev.yml` |
| (new) | `refactored/docker/entrypoint.sh` |

### Documentation

| Old Location | New Location |
|---|---|
| `README.md` | `refactored/README.md` (updated) |
| `DEPLOYMENT_GUIDE.md` | `refactored/docs/DEPLOYMENT_GUIDE.md` |
| `INTEGRATION_README.md` | `refactored/docs/INTEGRATION_README.md` |
| `MONGODB_AND_TRAINING_GUIDE.md` | `refactored/docs/MONGODB_AND_TRAINING_GUIDE.md` |
| (new) | `refactored/PROJECT_STRUCTURE.md` |
| (new) | `refactored/docs/SETUP.md` |
| (new) | `refactored/docs/ARCHITECTURE.md` |

## 🔗 Import Path Updates

If you're updating code to reference moved files, update import paths:

### Python Imports

**Old:**
```python
from saas_config import CONFIG
import app
```

**New:**
```python
from config.saas_config import CONFIG
from app import Flask
# Or with relative imports in same package
```

### Update Paths in Docker/Scripts

**Old docker-compose.yml:**
```dockerfile
COPY backend/ ./backend/
COPY newfrontend/future-robot-trainer/ ./frontend/
```

**New docker-compose.yml:**
```dockerfile
COPY backend/src ./backend/src
COPY frontend/ ./frontend/
```

## 🐳 Docker Migration

### Old Way
```bash
docker build -t datara-ai .
docker run -p 5000:5000 -p 8080:8080 datara-ai
```

### New Way
```bash
cd docker
docker-compose up -d
# OR
docker-compose -f docker-compose.dev.yml up
```

## 🧪 Testing Checklist

After migration, verify everything works:

### Backend Tests
- [ ] Flask server starts without errors
- [ ] API endpoints respond (`/api/stats`, `/api/datasets`)
- [ ] Database connection works
- [ ] File uploads work
- [ ] Training job submission works

### Frontend Tests
- [ ] React app loads (http://localhost:5173)
- [ ] Components render without errors
- [ ] API calls to backend work
- [ ] Real-time stats update
- [ ] Navigation between pages works
- [ ] FiftyOne integration works (if configured)

### Docker Tests
- [ ] Docker images build successfully
- [ ] Containers start and run
- [ ] Services communicate with each other
- [ ] Volumes mount correctly
- [ ] Port mappings work
- [ ] Health checks pass

### Integration Tests
- [ ] Frontend ↔ Backend communication
- [ ] Backend ↔ Database communication
- [ ] Backend ↔ Cloud services (Azure/AWS if configured)
- [ ] All API endpoints accessible
- [ ] Logging works correctly

## 🆘 Troubleshooting Migration

### Issue: Import Errors
**Cause:** Python import paths changed  
**Solution:** Update `PYTHONPATH` or imports to match new structure

### Issue: Frontend Can't Reach Backend
**Cause:** API URL configuration  
**Solution:** Check `VITE_API_URL` in `.env`

### Issue: Docker Build Fails
**Cause:** File paths changed in Dockerfile  
**Solution:** Use new paths from refactored structure

### Issue: Port Already in Use
**Cause:** Old services still running  
**Solution:**
```bash
lsof -i :5000    # Find process on port 5000
kill -9 <PID>    # Kill the process
```

### Issue: Database Connection Fails
**Cause:** MongoDB not running or wrong credentials  
**Solution:**
1. Check `.env` credentials
2. Start MongoDB: `docker-compose up mongodb`
3. Verify with: `mongo --host localhost --username admin --password`

## 📊 Performance Comparison

### Old Structure
- Multiple scattered files
- Unclear module organization
- Duplicated dependencies
- Manual setup complexity

### New Structure
- ✅ Clear file organization
- ✅ Logical module grouping
- ✅ Single dependency list
- ✅ Automated setup scripts
- ✅ Professional Docker setup
- ✅ Comprehensive documentation

## ✅ Migration Completion Checklist

- [ ] Backup of original project created
- [ ] Refactored structure reviewed
- [ ] Environment variables (.env) configured
- [ ] Setup script executed successfully
- [ ] Backend starts and API responds
- [ ] Frontend starts and loads
- [ ] Database connection verified
- [ ] Cloud services (if used) configured and tested
- [ ] All integration tests pass
- [ ] Docker services run correctly
- [ ] Documentation updated for team
- [ ] Old structure can be archived/deleted

## 📞 Support During Migration

If you encounter issues:

1. **Check Documentation**
   - `refactored/PROJECT_STRUCTURE.md` - File organization
   - `refactored/docs/SETUP.md` - Setup guide
   - `refactored/docs/ARCHITECTURE.md` - System design

2. **Review Logs**
   ```bash
   # Backend logs
   tail -f refactored/backend/backend.log
   
   # Frontend logs
   tail -f refactored/frontend/frontend.log
   
   # Docker logs
   docker-compose logs -f
   ```

3. **Verify Configuration**
   ```bash
   # Check environment variables
   cat refactored/.env
   
   # Verify file structure
   ls -la refactored/backend/src/
   ```

4. **Test Individual Components**
   ```bash
   # Test backend alone
   cd refactored/backend
   source venv/bin/activate
   python src/app.py
   
   # Test frontend alone
   cd refactored/frontend
   npm run dev
   ```

## 🎯 Next Steps After Migration

1. **Update CI/CD Pipelines** - Point to new Dockerfile and docker-compose locations
2. **Update Documentation** - Team wiki, setup guides, deployment procedures
3. **Monitor Deployment** - Watch for issues after production migration
4. **Archive Old Files** - Once confirmed working, archive old project structure
5. **Team Training** - Train team on new project structure and scripts

---

**Migration Guide Version:** 1.0  
**Last Updated:** February 2026



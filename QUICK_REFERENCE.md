# DataraAI Quick Reference

Quick reference for common tasks and configurations.

## 🚀 Quick Start (Copy & Paste)

```bash
# Setup development environment
cd /Users/pj/Projects/python/DataraAI-DAAS/refactored
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start development servers
chmod +x scripts/dev.sh
./scripts/dev.sh

# Access the app
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

## 📁 Project Locations

| Component | Path |
|-----------|------|
| **Main Directory** | `/Users/pj/Projects/python/DataraAI-DAAS/refactored` |
| **Backend** | `backend/src/` |
| **Frontend** | `frontend/src/` |
| **Docker** | `docker/` |
| **Documentation** | `docs/` |
| **Scripts** | `scripts/` |
| **Config Template** | `config/.env.example` |

## 🐍 Backend Commands

```bash
# Setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run development server
python src/app.py

# Run production server
gunicorn --bind 0.0.0.0:5000 src.app:app

# Run tests
pytest

# Format code
black src/

# Check types
mypy src/
```

## 🔵 Frontend Commands

```bash
# Setup
cd frontend
npm install
# or
pnpm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format
```

## 🐳 Docker Commands

```bash
# Development environment (with hot reload)
cd docker
docker-compose -f docker-compose.dev.yml up

# Production environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild images
docker-compose build --no-cache

# Run specific service
docker-compose up backend
```

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stats` | GET | Real-time statistics |
| `/api/datasets` | GET | List all datasets |
| `/api/datasets` | POST | Create dataset |
| `/api/upload` | POST | Upload files |
| `/api/train` | POST | Start training job |
| `/api/status/<job_id>` | GET | Get job status |
| `/api/images/<path>` | GET | Get image list |
| `/api/image/<filename>` | GET | Get single image |

## 🗄️ Database

```bash
# MongoDB with Docker
docker run -d -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0

# Connect with mongo shell
mongosh mongodb://admin:password@localhost:27017/datara_db

# Using Docker Compose (included in dev setup)
docker-compose -f docker-compose.dev.yml up mongodb
```

## 📁 Key Backend Files

```
backend/src/
├── app.py                  # Main Flask app (START HERE)
├── config/
│   └── saas_config.py     # Configuration
├── routes/
│   └── dashboard.py       # API endpoints
├── utils/
│   ├── check_dataset.py   # Dataset validation
│   ├── visualization.py   # Visualization helpers
│   └── ...
├── models/
│   ├── train_deeplab.py   # Training scripts
│   ├── train_resnet.py
│   └── ...
└── services/
    ├── upload_frames_to_azure.py
    └── call_lambda_vm.py
```

## 📁 Key Frontend Files

```
frontend/src/  (from /dashboard folder)
├── main.tsx               # Entry point
├── App.tsx                # Root component (routing)
├── pages/                 # Page components
├── components/            # Reusable UI components
├── lib/                   # Utilities and helpers
└── assets/                # Static assets
```

## ⚙️ Configuration

### Edit .env File
```bash
vim refactored/.env
```

### Essential Variables
```env
# Backend
FLASK_ENV=development
BACKEND_PORT=5000

# Frontend
VITE_API_URL=http://localhost:5000
VITE_PORT=5173

# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/datara_db

# Azure (if using)
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_BLOB_CONTAINER=datasets

# AWS (if using)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## 🔍 Debugging

### Frontend Debug
```bash
# Check browser console (F12)
# Vue DevTools Extension
# Vite debug logs: npm run dev -- --debug

# Check API calls in Network tab
```

### Backend Debug
```bash
# Enable debug logging
FLASK_DEBUG=1 python src/app.py

# Check error logs
tail -f logs/backend.log

# Test API endpoint
curl http://localhost:5000/api/stats
```

### Docker Debug
```bash
# View container logs
docker-compose logs backend

# Shell into container
docker exec -it datara-backend bash

# Check container status
docker-compose ps

# Inspect image
docker inspect datara-ai:latest
```

## 📊 Monitoring

```bash
# Check running services
docker-compose ps

# View real-time logs
docker-compose logs -f

# Check specific service
docker-compose logs backend -f

# Resource usage
docker stats

# Network connectivity
docker-compose exec backend curl http://localhost:5000/api/stats
```

## 🔒 Security

### Development
- Environment variables in `.env` (local only)
- CORS enabled for localhost

### Production
- Use environment variables from secrets manager
- Enable HTTPS/TLS
- Restrict CORS origins
- Use strong database passwords
- Enable rate limiting
- Regular security updates

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview (START HERE) |
| `PROJECT_STRUCTURE.md` | File organization |
| `SETUP.md` | Development setup detailed |
| `ARCHITECTURE.md` | System design |
| `MIGRATION_GUIDE.md` | Migration from old structure |
| `REFACTORING_SUMMARY.md` | What was refactored |
| `docs/DEPLOYMENT_GUIDE.md` | Production deployment |
| `docs/INTEGRATION_README.md` | API integration |
| `config/.env.example` | Configuration template |

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -i :5000; kill -9 <PID>` |
| npm not found | Install Node.js v18+ |
| Python not found | Install Python 3.10+ |
| Database connection error | Check `.env` credentials, start MongoDB |
| Frontend can't reach backend | Check `VITE_API_URL` in `.env` |
| Docker build fails | Run `docker-compose build --no-cache` |
| Permission denied on scripts | Run `chmod +x scripts/*.sh` |

## 📞 Getting Help

1. **Check Documentation** - See docs/ folder
2. **Review Error Logs** - `docker-compose logs`
3. **Run Individual Services** - Test backend/frontend separately
4. **Verify Configuration** - Check `.env` file
5. **Check Prerequisites** - Node.js, Python, Docker versions

## 🚀 Deployment Checklist

- [ ] `.env` configured for production
- [ ] Database backup created
- [ ] Docker images built
- [ ] All tests passing
- [ ] Health checks verified
- [ ] Logs configured
- [ ] Monitoring setup
- [ ] SSL certificates ready
- [ ] CORS origins configured
- [ ] Cloud services credentials ready

## 📋 File Sizes Guide

Understanding key directories:

- `frontend/node_modules/` - ~400MB (Node packages)
- `backend/venv/` - ~200MB (Python packages)
- `.git/` - Varies (Version history)
- `models/` - Varies (ML model files)
- `dataset/` - Varies (Training data)

## 🎯 Daily Workflows

### Development Day
```bash
# Morning: Start services
cd refactored
./scripts/dev.sh

# Code your changes
vim backend/src/app.py
vim frontend/src/pages/Index.tsx

# Test changes (auto-reload)
# Frontend: http://localhost:5173
# Backend: http://localhost:5000

# Evening: Commit changes
git add .
git commit -m "feat: description"
git push origin feature-branch
```

### Deployment Day
```bash
# Test in Docker
cd docker
docker-compose build
docker-compose up

# Verify services
curl http://localhost:5000/api/stats
curl http://localhost:8080

# Push to registry (if configured)
./scripts/deploy.sh prod

# Monitor logs
docker-compose logs -f
```

---

**Quick Reference Version:** 1.0  
**Last Updated:** February 2026  
**Next:** Read `README.md` for detailed overview



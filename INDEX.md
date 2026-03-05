# 📖 DataraAI - Documentation Index

**Project Location:** `/Users/pj/Projects/python/DataraAI-DAAS/`

---

## 🚀 Start Here

### For First-Time Users
1. **[README.md](README.md)** - Project overview (5 min read)
2. **[docs/SETUP.md](docs/SETUP.md)** - Development setup guide (10 min read)
3. Run: `pip install -r backend/requirements.txt` and `cd dashboard && npm install`

### For Developers
1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Common commands
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design
3. **[backend/README.md](backend/README.md)** - Backend details

### For DevOps/Deployment
1. **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Production deployment
2. **[scripts/deploy.sh](scripts/deploy.sh)** - Automated Docker deployment
3. **[docker/docker-compose.yml](docker-compose.yml)** - Service configuration

---

## 📚 Documentation by Purpose

### Quick Reference
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Commands, ports, common tasks
- **[config/.env.example](config/.env.example)** - Configuration options

### Setup & Installation
- **[docs/SETUP.md](docs/SETUP.md)** - Development environment setup
- **[README.md](README.md)** - Project quick start
- **[backend/README.md](backend/README.md)** - Backend documentation

### Architecture & Design
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design and integration
- **[backend/README.md](backend/README.md)** - Backend services and API details

### Deployment & Operations
- **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Production deployment
- **[scripts/deploy.sh](scripts/deploy.sh)** - Docker deployment script
- **[docker/docker-compose.yml](docker-compose.yml)** - Service configuration

### API & Integration
- **[docs/INTEGRATION_README.md](docs/INTEGRATION_README.md)** - API integration guide

---

## 🔧 Scripts

### Setup & Running
```bash
./scripts/setup.sh    # One-time setup (creates venv, installs deps)
./scripts/start.sh    # Start both backend and frontend
./scripts/dev.sh      # Start just development servers
./scripts/deploy.sh   # Docker deployment
```

---

## 📂 Directory Guide

```
DataraAI-DAAS/
├── README.md                         ← START HERE (project overview)
├── QUICK_REFERENCE.md                ← Common commands & tasks
├── INDEX.md                          ← This file
│
├── backend/                          # Python Flask backend
│   ├── app.py                        # Main application
│   ├── requirements.txt              # Python dependencies
│   ├── README.md                     # Backend documentation
│   └── datara/                       # Main package
│       ├── config.py                 # Configuration
│       ├── logging.py                # Structured logging
│       ├── services/                 # Business logic services
│       │   ├── azure_service.py     
│       │   ├── dataset_service.py    
│       │   └── processing_service.py
│       └── utils/                    # Utilities
│
├── dashboard/                        # React + TypeScript frontend
│   ├── src/                          # React source
│   ├── package.json                  # Node dependencies
│   ├── vite.config.js                # Vite config
│   └── tailwind.config.js            # Tailwind config
│
├── docker/                           # Docker setup
│   ├── Dockerfile                    # Production build
│   ├── docker-compose.yml            # Services (prod)
│   ├── docker-compose.dev.yml        # Services (dev)
│   └── entrypoint.sh                 # Startup script
│
├── scripts/                          # Automation scripts
│   ├── setup.sh                      # Development setup
│   ├── start.sh                      # Application startup
│   ├── dev.sh                        # Dev server startup
│   └── deploy.sh                     # Docker deployment
│
├── docs/                             # Documentation
│   ├── SETUP.md                      # Detailed setup
│   ├── ARCHITECTURE.md               # System design
│   ├── DEPLOYMENT_GUIDE.md           # Deployment
│   └── ...                           # Other guides
│
└── config/                           # Configuration
    └── .env.example                  # Environment template
```

---

## 🚀 Workflow Guide

### For First-Time Setup
```
1. Read: README.md
2. Run: ./scripts/setup.sh
3. Edit: vim .env
4. Run: ./scripts/start.sh
5. Access: http://localhost:5173 (frontend)
```

### For Development
```
1. Read: QUICK_REFERENCE.md
2. Edit code in backend/datara/ or frontend/src/
3. Changes auto-reload (frontend) or restart (backend)
4. Test endpoints at http://127.0.0.1:5000/health
```

### For Deployment
```
1. Read: docs/DEPLOYMENT_GUIDE.md
2. Configure: vim .env (production settings)
3. Run: ./scripts/deploy.sh
4. Monitor: docker-compose logs
```

---

## 📋 Document Quick Links

### Configuration
- **Environment Variables:** [config/.env.example](config/.env.example)
- **Docker Services:** [docker/docker-compose.yml](docker-compose.yml)

### Application Code
- **Main App:** [backend/app.py](backend/app.py)
- **Settings:** [backend/datara/config.py](backend/datara/config.py)
- **Services:** [backend/datara/services/](backend/datara/services/)

### Frontend
- **Main Entry:** [dashboard/src/main.tsx](dashboard/src/main.tsx)
- **App Component:** [dashboard/src/App.tsx](dashboard/src/App.tsx)
- **Config:** [dashboard/vite.config.js](dashboard/vite.config.js)

---

## 🎯 Common Tasks

### I want to...

**Start developing**
→ Read [README.md](README.md) and run `./scripts/setup.sh`

**Understand the architecture**
→ Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

**Add a new endpoint**
→ See [docs/INTEGRATION_README.md](docs/INTEGRATION_README.md)

**Deploy to production**
→ Follow [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

**Migrate from old project**
→ Follow [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)

**Find a command**
→ Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md)


---

## 📞 Support

### Documentation
- Check the appropriate guide from the sections above
- Search in [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- Review [docs/](docs/) folder for detailed guides

### Troubleshooting
- See "Troubleshooting" section in [docs/SETUP.md](docs/SETUP.md)
- Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for port conflicts
- Review Docker logs: `docker-compose logs`

### Learning Resources
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design
- [docs/INTEGRATION_README.md](docs/INTEGRATION_README.md) - API details

---

## ✅ Verification

To verify everything is set up correctly:

1. **Run setup:** `./scripts/setup.sh`
2. **Run app:** `./scripts/start.sh`
3. **Check health:** `curl http://127.0.0.1:5000/health`
4. **Visit frontend:** http://localhost:5173

If all works, you're ready to go! ✅

---

## 📊 Project Status

| Component | Documentation | Status |
|-----------|---------------|--------|
| Backend | Complete | ✅ Ready |
| Frontend | Complete | ✅ Ready |
| Docker | Complete | ✅ Ready |
| Setup | Complete | ✅ Ready |
| API | Complete | ✅ Ready |
| Deployment | Complete | ✅ Ready |

---

**Last Updated:** March 1, 2026  
**Location:** `/Users/pj/Projects/python/DataraAI-DAAS/`

---

## 🎯 Next Step

👉 **Start with:** [README.md](README.md)


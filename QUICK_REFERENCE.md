# DataraAI Quick Reference

Quick reference for common tasks and configurations.

## 🚀 Quick Start (Copy & Paste)

```bash
# Setup development environment
cd /Users/pj/Projects/python/DataraAI-DAAS

# Backend setup
cd backend
pip install -r requirements.txt
python app.py

# Frontend setup (in new terminal)
cd dashboard
npm install
npm run dev

# Access the app
# Frontend: http://localhost:5173
# Backend:  http://localhost:5000
```

## 📁 Project Locations

| Component | Path |
|-----------|------|
| **Main Directory** | `/Users/pj/Projects/python/DataraAI-DAAS` |
| **Backend** | `backend/` |
| **Frontend** | `dashboard/` |
| **Docker** | `docker/` |
| **Documentation** | `docs/` |
| **Scripts** | `scripts/` |
| **Config Template** | `config/.env.example` |

## 🐍 Backend Commands

```bash
# Setup
cd backend
pip install -r requirements.txt

# Run development server
python app.py

# Run production server
gunicorn app:app

# Test API
curl http://localhost:5000/health
```

## 🔵 Frontend Commands

```bash
# Setup
cd dashboard
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
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
```

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/stats` | GET | System statistics |
| `/api/datasets` | GET | List all datasets |
| `/api/upload` | POST | Upload video/files |
| `/api/images/<dataset>` | GET | Get dataset images |

## 📁 Key Backend Files

```
backend/
├── app.py                     # Main Flask app (START HERE)
├── requirements.txt           # Python dependencies
├── datara/
│   ├── __init__.py
│   ├── config.py             # Configuration
│   ├── logging.py            # Logging setup
│   └── services/
│       ├── azure_service.py  # Azure integration
│       ├── dataset_service.py # Dataset operations
│       └── processing_service.py # Video processing
└── utils/
    ├── generate_orig_frames.py
    ├── upload_frames_to_azure.py
    └── upload_glb_to_azure.py
```

## 📁 Key Frontend Files

```
dashboard/src/
├── main.tsx               # Entry point
├── App.tsx                # Root component
├── pages/                 # Page components
│   ├── Home.tsx
│   └── DataViewer.tsx
├── components/            # Reusable UI components
├── lib/                   # Utilities and helpers
└── assets/                # Static assets
```

## ⚙️ Configuration

### Edit .env File
```bash
cp config/.env.example .env
vim .env
```

### Essential Variables
```env
# Backend
FLASK_ENV=development
BACKEND_PORT=5000

# Frontend
VITE_API_URL=http://localhost:5000

# Database (if using)
MONGODB_URI=mongodb://localhost:27017/datara

# Azure (if using)
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_BLOB_CONTAINER=datasets
```

## 🔍 Debugging

### Frontend Debug
```bash
# Check browser console (F12)
# Check API calls in Network tab
npm run dev  # Vite dev server with HMR
```

### Backend Debug
```bash
# Enable debug mode
FLASK_DEBUG=1 python app.py

# Test API endpoint
curl http://localhost:5000/health
```

### Docker Debug
```bash
# View container logs
docker-compose logs -f backend

# Shell into container
docker exec -it <container_id> bash

# Check container status
docker-compose ps
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

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview |
| `INDEX.md` | Documentation index |
| `docs/SETUP.md` | Development setup detailed |
| `docs/ARCHITECTURE.md` | System design |
| `docs/DEPLOYMENT_GUIDE.md` | Production deployment |
| `docs/INTEGRATION_README.md` | API integration |
| `backend/README.md` | Backend documentation |

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 5000 already in use | `kill -9 $(lsof -t -i :5000)` |
| Port 5173 already in use | `kill -9 $(lsof -t -i :5173)` |
| npm not found | Install Node.js v18+ |
| Python not found | Install Python 3.10+ |
| Frontend can't reach backend | Check `VITE_API_URL` in `.env` |
| Docker build fails | Run `docker-compose build --no-cache` |

## 🚀 Daily Workflows

### Development Day
```bash
# Start services
cd backend && python app.py &
cd dashboard && npm run dev

# Code your changes
# Files auto-reload on save

# Test in browser
# Frontend: http://localhost:5173
# Backend: http://localhost:5000
```

### Docker Day
```bash
# Build and start
cd docker
docker-compose build
docker-compose up

# Monitor
docker-compose logs -f
```

---

**Quick Reference Version:** 2.0  
**Last Updated:** March 2026



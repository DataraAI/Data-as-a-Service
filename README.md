# DataraAI - Refactored Architecture

A comprehensive AI platform for robotics training and deployment with modern frontend, Flask backend, and cloud integration.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Python** 3.10+
- **Docker** (optional, for containerized deployment)

### Development Setup (5 minutes)

```bash
# 1. Navigate to refactored directory
cd refactored

# 2. Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Edit environment variables
vim .env

# 4. Start development servers
./scripts/dev.sh
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### Docker Setup

```bash
# Development with live reload
cd docker
docker-compose -f docker-compose.dev.yml up

# Production deployment
./scripts/deploy.sh prod
```

## 📁 Project Structure

### Backend Organization ✅

The backend has been professionally reorganized with modular architecture:

```
backend/
├── app.py                          Main Flask application
├── README.md                       Backend documentation (400+ lines) ✅ NEW!
├── requirements.txt                Python dependencies
│
├── datara/                         Main application package (modular)
│   ├── __init__.py
│   ├── config.py                  Configuration management
│   ├── logging.py                 Structured logging
│   │
│   └── services/                  Business logic services
│       ├── __init__.py
│       ├── azure_service.py       Azure Blob & Cosmos DB
│       ├── dataset_service.py     Dataset operations
│       └── processing_service.py  Video processing
│
├── utils/                          Utility scripts ✅ ORGANIZED!
│   ├── __init__.py
│   ├── generate_orig_frames.py    Video frame extraction
│   ├── upload_frames_to_azure.py  Frame upload utility
│   └── upload_glb_to_azure.py     3D model upload utility
│
└── dataset_list/
    └── uploads/
```

**Backend Highlights:**
- ✅ **Modular Architecture** - Separated concerns (services, utilities, configs)
- ✅ **Professional Organization** - Industry-standard Python project structure
- ✅ **Comprehensive Documentation** - 400+ line README with API examples
- ✅ **Azure Integration** - Blob Storage and Cosmos DB support
- ✅ **7 REST API Endpoints** - Health, datasets, processing, stats
- ✅ **Video Processing** - FFmpeg integration for frame extraction
- ✅ **Google Drive Support** - Direct video downloads
- ✅ **Error Handling** - Robust error management and logging

**Backend Services:**
| Service | Purpose | Methods |
|---------|---------|---------|
| AzureService | Blob Storage & Cosmos DB | list_datasets, download_blob, generate_sas_url |
| DatasetService | Dataset management | list_datasets, get_dataset_images |
| ProcessingService | Video/Image processing | process_video, generate_ego |

**Quick Backend Commands:**
```bash
cd backend

# Setup
pip install -r requirements.txt

# Run
python app.py                    # Development
gunicorn app:create_app()        # Production
docker run ... datara-backend    # Docker

# Test
curl http://localhost:5000/health
curl http://localhost:5000/api/stats

# For details
cat README.md
```

**See full backend documentation:** `backend/README.md`

---

```
refactored/
├── backend/                    # Python Flask Backend
│   ├── src/
│   │   ├── app.py             # Main Flask application
│   │   ├── routes/            # API endpoints
│   │   ├── config/            # Configuration management
│   │   ├── utils/             # Helper utilities
│   │   ├── models/            # ML model training
│   │   └── services/          # External integrations
│   └── requirements.txt        # Python dependencies
│
├── **frontend/                   # React + TypeScript Dashboard Frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # UI components
│   │   ├── lib/               # Utilities & helpers
│   │   ├── assets/            # Static assets
│   │   └── main.tsx           # Entry point
│   ├── package.json           # Node dependencies
│   └── vite.config.js         # Vite build configuration
│
├── robotics/                  # Robotics System (Expandable)
├── docker/                    # Docker Configuration
│   ├── Dockerfile             # Production multi-stage build
│   ├── docker-compose.yml     # Production services
│   ├── docker-compose.dev.yml # Development services
│   ├── entrypoint.sh          # Service orchestration
│   └── nginx/                 # Nginx reverse proxy config
│
├── scripts/                   # Utility Scripts
│   ├── setup.sh              # Development setup
│   ├── dev.sh                # Start dev servers
│   └── deploy.sh             # Docker deployment
│
├── docs/                      # Comprehensive Documentation
│   ├── PROJECT_STRUCTURE.md   # This structure explained
│   ├── ARCHITECTURE.md        # System design & data flow
│   ├── SETUP.md               # Detailed setup guide
│   ├── DEPLOYMENT_GUIDE.md    # Production deployment
│   └── ...                    # Other guides
│
└── config/                    # Configuration Templates
    └── .env.example          # Environment variables template
```

## 🎯 Key Features

### Frontend
- ✅ React 18 + TypeScript
- ✅ Vite for fast development
- ✅ shadcn/ui component library
- ✅ Tailwind CSS styling
- ✅ Real-time stats dashboard
- ✅ FiftyOne integration
- ✅ Responsive design

### Backend
- ✅ Flask REST API
- ✅ FiftyOne dataset management
- ✅ TensorFlow/PyTorch ML models
- ✅ Azure cloud integration
- ✅ MongoDB persistence
- ✅ Image processing (OpenCV)
- ✅ Async job queue support

### Infrastructure
- ✅ Docker containerization
- ✅ Docker Compose orchestration
- ✅ Nginx reverse proxy
- ✅ Multi-stage production builds
- ✅ Development hot-reload
- ✅ Health checks

## 📖 Documentation

Comprehensive guides are available in the `/docs` folder:

- **[SETUP.md](docs/SETUP.md)** - Development environment setup
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design & integration
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Directory layout explained
- **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Production deployment
- **[INTEGRATION_README.md](docs/INTEGRATION_README.md)** - Backend integration

## 🔧 Common Tasks

### Start Development
```bash
./scripts/dev.sh
```

### Install Dependencies
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend  
cd frontend && npm install
```

### Run Tests
```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

### Build Frontend
```bash
cd frontend && npm run build
```

### Deploy with Docker
```bash
cd docker
docker-compose up -d
```

## 🌐 API Endpoints

Key backend API endpoints:

```
GET    /api/stats              # System statistics
GET    /api/datasets           # List datasets
POST   /api/upload             # Upload dataset
POST   /api/train              # Start training job
GET    /api/status/<job_id>    # Get job status
GET    /api/images/<dataset>   # Get images
```

See [INTEGRATION_README.md](docs/INTEGRATION_README.md) for complete API documentation.

## 🗄️ Database

- **MongoDB** for application data
- **FiftyOne** for dataset management
- Automatic initialization with Docker Compose

## ☁️ Cloud Integration

### Azure Services
- Blob Storage for datasets and models
- Cosmos DB for optional cloud database
- Managed compute for inference

### AWS Services  
- Lambda for serverless functions
- EC2 for compute resources

Configuration via environment variables in `.env`

## 🚀 Deployment

### Quick Deploy
```bash
./scripts/deploy.sh
```

### Custom Deployment
```bash
# Development
./scripts/deploy.sh dev

# Production  
./scripts/deploy.sh prod

# Specific registry
DOCKER_REGISTRY=myregistry.azurecr.io ./scripts/deploy.sh
```

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔒 Security

- Environment variables for secrets (see `.env.example`)
- HTTPS/TLS in production
- CORS configuration for trusted origins
- Database authentication enabled
- Rate limiting on API endpoints

## 📊 Monitoring

Monitor services with:
```bash
# View Docker logs
docker-compose logs -f

# Check service health
curl http://localhost:5000/api/stats
curl http://localhost:8080
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit with clear messages: `git commit -m "feat: description"`
4. Push and create a pull request

## 📝 License

[Your License Here]

## 🆘 Support

- Check `/docs` folder for detailed guides
- Review error messages and logs
- Check Docker Compose logs: `docker-compose logs`
- Verify `.env` configuration

---

**Last Updated:** February 2026  
**Version:** 2.0 (Refactored)

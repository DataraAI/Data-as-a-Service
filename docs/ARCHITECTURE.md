# DataraAI System Architecture

This document describes the overall architecture, data flow, and integration points of the DataraAI system.

## System Overview

DataraAI is a comprehensive AI platform for robotics training and deployment with the following major components:

1. **Backend** - Python Flask API for data management and ML operations
2. **Frontend** - React/TypeScript web interface for user interactions
3. **Database** - MongoDB for data persistence
4. **ML Models** - TensorFlow/PyTorch based models for computer vision
5. **Cloud Services** - Azure integration for data storage and processing
6. **Robotics System** - Autonomous system for training and deployment

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP/HTTPS
                         │
        ┌────────────────┼────────────────┐
        │                                  │
    ┌───▼────────┐                   ┌───▼──────────┐
    │   Nginx    │                   │ Development  │
    │  Reverse   │◄─────────────────►│   Frontend   │
    │   Proxy    │                   │   Vite Dev   │
    └───┬────────┘                   └──────────────┘
        │
        ├──────────────────┬──────────────────┐
        │                  │                  │
    ┌───▼──────┐    ┌─────▼──────┐   ┌──────▼──────┐
    │ Frontend  │    │  Backend   │   │  Robotics   │
    │ (SPA)     │    │  Flask API │   │   System    │
    │ 8080      │    │  5000      │   │    5002     │
    └───┬──────┘    └─────┬──────┘   └──────┬──────┘
        │                 │                 │
        │            ┌────┴─────────┐       │
        │            │              │       │
        │        ┌───▼───────┐  ┌──▼──────┐│
        │        │ FiftyOne  │  │ ML      ││
        │        │ Database  │  │ Models  ││
        │        └──────┬────┘  └────┬────┘│
        │               │             │    │
        │          ┌────▼─────────┬──▼────┘
        │          │              │
        │      ┌───▼──────────────▼──┐
        │      │    MongoDB          │
        │      │  (User Data)        │
        │      └────────────────────┘
        │
        └──────────────────┬──────────────────┐
                          │                  │
                    ┌─────▼─────┐      ┌────▼──────┐
                    │   Azure    │      │   AWS     │
                    │  Blob      │      │  Lambda   │
                    │ Storage    │      │   / VM    │
                    └────────────┘      └───────────┘
```

## Component Details

### Frontend (React 18 + TypeScript + Vite)

**Purpose**: User interface dashboard for data management, visualization, and system control.

**Source**: `/dashboard` folder (now at `refactored/frontend/`)

**Technology Stack:**
- React 18 for UI rendering
- TypeScript for type safety
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui for component library
- React Router for navigation (if used)

**Key Components:**
- Dashboard pages and layouts
- UI component library
- Utilities and helpers
- Asset management

**Communication:**
- REST API calls to Backend (`http://localhost:5000`)
- Websocket for real-time updates (optional)
- Static assets served by frontend

### Backend (Python Flask)

**Purpose**: Core business logic, data management, API endpoints, and ML model orchestration.

**Technology Stack:**
- Flask for HTTP API server
- Python 3.10+ for scripting and ML
- FiftyOne for dataset visualization and management
- OpenCV for image processing
- TensorFlow/PyTorch for deep learning
- Pillow for image manipulation
- MongoDB driver for database access
- Azure SDK for cloud services

**Directory Structure:**

```
backend/src/
├── app.py                    # Flask app initialization and core routes
├── routes/
│   └── dashboard.py          # API endpoints for dashboard
├── config/
│   └── saas_config.py        # Configuration management
├── utils/
│   ├── check_dataset.py      # Dataset validation
│   ├── visualization.py      # Visualization utilities
│   └── ...                   # Other utilities
├── models/
│   ├── train_deeplab.py      # DeepLab segmentation training
│   ├── train_resnet.py       # ResNet training
│   ├── predict_seam_path.py  # Seam path inference
│   └── ...                   # Other model training scripts
└── services/
    ├── upload_frames_to_azure.py  # Azure storage integration
    ├── call_lambda_vm.py          # AWS Lambda integration
    └── ...                        # Other external services
```

**API Endpoints:**

```
GET    /api/stats              # Real-time statistics
GET    /api/datasets           # List available datasets
GET    /api/images/<dataset>   # Get images from dataset
GET    /api/annotations/<id>   # Get annotations
POST   /api/train              # Start training job
GET    /api/status/<job_id>    # Get job status
POST   /api/upload             # Upload dataset files
```

### Database (MongoDB)

**Purpose**: Persistent storage for user data, configurations, and metadata.

**Collections:**
- `users`: User accounts and credentials
- `datasets`: Dataset metadata
- `annotations`: Image annotations
- `training_jobs`: ML training status and history
- `models`: Trained model metadata
- `settings`: Application settings

### ML Models & Training

**Location**: `backend/src/models/`

**Supported Models:**
- **DeepLab**: Semantic segmentation
- **ResNet**: Image classification
- **Seam Path**: Custom seam detection and path prediction
- **Segmentation**: General purpose segmentation

**Training Pipeline:**
1. Data loading and preprocessing
2. Model initialization
3. Training loop with validation
4. Model evaluation and metrics
5. Model export and storage

### Cloud Integration (Azure)

**Location**: `backend/src/services/`

**Services:**
- **Blob Storage**: Dataset and model storage
- **Cosmos DB**: Optional cloud database
- **Azure Compute**: Model inference and batch processing

**Key Files:**
- `upload_frames_to_azure.py`: Upload training frames
- `upload_glb_to_azure.py`: Upload 3D models
- `call_lambda_vm.py`: Execute cloud functions

### Robotics System

**Location**: `robotics/`

**Purpose**: Autonomous system for training and deployment.

**Components:**
- Vision system (camera integration)
- Control system (movement and actions)
- Training pipeline
- Deployment and monitoring

## Data Flow

### 1. User Uploads Dataset

```
User Interface
    ↓ (POST /api/upload)
Backend API
    ↓ (validate, process)
MongoDB (metadata)
    ↓ (store references)
Azure Blob Storage (actual files)
```

### 2. Training Process

```
User clicks "Train"
    ↓ (POST /api/train)
Backend API validates data
    ↓
Load data from MongoDB & storage
    ↓
Preprocess images
    ↓
Run training script (PyTorch/TensorFlow)
    ↓
Save model to storage
    ↓
Update MongoDB with job status
    ↓ (WebSocket event)
Frontend displays progress
```

### 3. Inference/Prediction

```
User uploads image
    ↓ (POST /api/predict)
Backend loads trained model
    ↓
Preprocess input
    ↓
Run inference
    ↓
Postprocess results
    ↓ (JSON response)
Frontend displays predictions
```

### 4. Statistics Update

```
Frontend polls every 5s
    ↓ (GET /api/stats)
Backend aggregates data
    ↓ (query MongoDB, check system status)
Returns JSON with:
   - Dataset counts
   - Training progress
   - System health
    ↓
Frontend updates UI
```

## Integration Points

### Frontend-Backend Communication

**Protocol**: REST API over HTTP/HTTPS

**Authentication**: 
- Bearer tokens in headers
- Session management in MongoDB

**CORS Configuration**: Enabled in Flask for frontend origin

### Backend-Database Communication

**Protocol**: MongoDB driver over TCP

**Connection String**: `mongodb://user:password@host:port/database`

**Pooling**: Connection pooling enabled for performance

### Backend-Azure Communication

**Protocol**: REST API via Azure SDK

**Authentication**: 
- Managed identity (Azure VMs)
- Connection strings (development)
- SAS tokens (temporary access)

### Backend-Robotics Communication

**Protocol**: HTTP/REST or WebSocket

**Message Format**: JSON

**Status Updates**: Real-time via polling or WebSocket

## Security Considerations

### Authentication & Authorization

- JWT tokens for API authentication
- Role-based access control (RBAC)
- MongoDB user credentials in environment variables

### Data Protection

- HTTPS/TLS for all network communication
- Encrypted storage for sensitive data
- MongoDB authentication enabled

### API Security

- CORS configured for trusted origins
- Rate limiting on endpoints
- Input validation and sanitization
- SQL injection prevention (using ORMs/drivers)

## Performance Optimization

### Caching

- Frontend: Browser cache, localStorage for UI state
- Backend: Redis cache for frequently accessed data
- Database: MongoDB indexing on common queries

### Database Optimization

- Indexes on frequently queried fields
- Connection pooling
- Query optimization and profiling

### API Performance

- Pagination for large datasets
- Compression (gzip) for responses
- Async operations for long-running tasks
- Job queue (Celery) for background tasks

## Deployment Architecture

### Development

```
Local Machine
├── Frontend Dev Server (Vite)
├── Backend Dev Server (Flask)
├── MongoDB (Local or Docker)
└── Azure SDK (Local configuration)
```

### Production

```
Cloud Platform (AWS/Azure)
├── Docker Container
│   ├── Nginx (Reverse Proxy)
│   ├── Frontend (Static Files)
│   ├── Backend API (Gunicorn)
│   └── Robotics Service
├── Managed Database (MongoDB)
├── Cloud Storage (Azure Blob)
└── Monitoring & Logging
```

## Scaling Considerations

### Horizontal Scaling

- Load balancer for multiple backend instances
- Containerized deployment (Docker/Kubernetes)
- Stateless API design

### Vertical Scaling

- Larger compute instances for GPU-accelerated ML
- Increased memory for large model inference
- Storage optimization and archival

### Database Scaling

- MongoDB sharding for horizontal scaling
- Read replicas for read-heavy workloads
- Archive old training data to cold storage

## Monitoring & Logging

**Tools**:
- Application logs: Python logging module
- Monitoring: Cloud provider dashboards
- Error tracking: Sentry or similar
- Performance metrics: Prometheus/Grafana

**Key Metrics**:
- API response times
- Model training progress
- Database query performance
- System resource utilization
- User activity and dataset statistics

## Future Enhancements

1. **Real-time Collaboration**: WebSocket for collaborative annotations
2. **Advanced Caching**: Redis integration for performance
3. **Job Queue**: Celery for background task management
4. **Microservices**: Split ML operations into separate services
5. **GraphQL**: Alternative API layer for flexible data fetching
6. **ML Ops**: MLflow or Kubeflow for model management




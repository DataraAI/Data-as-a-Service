# Development Setup Guide

This guide will help you set up the DataraAI project for development.

## Prerequisites

- **Node.js**: v18+ (for frontend)
- **Python**: 3.10+ (for backend)
- **Docker** (optional, for containerized development)
- **Git**: For version control

## Quick Start

### 1. Clone and Navigate to Refactored Directory

```bash
cd /Users/pj/Projects/python/DataraAI-DAAS/refactored
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python src/app.py
```

The backend will start at `http://localhost:5000`

### 3. Frontend Setup

```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install
# or with pnpm (faster)
pnpm install

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

### 4. Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```bash
# Copy the example
cp config/.env.example .env

# Edit with your configuration
vim .env
```

**Required environment variables:**
- `MONGODB_PASSWORD`: MongoDB credentials
- `FLASK_ENV`: Set to `development` or `production`
- `API_URL`: Backend API endpoint (e.g., `http://localhost:5000`)

### 5. Verify Setup

- **Backend**: Open `http://localhost:5000/api/stats`
- **Frontend**: Open `http://localhost:5173`
- **Integration**: Frontend should display real-time stats from backend

## Docker Development

### Using Docker Compose

```bash
cd docker

# Build images
docker-compose build

# Start all services
docker-compose up

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- Nginx: `http://localhost:80`

### Using Development Compose File

```bash
docker-compose -f docker-compose.dev.yml up
```

## Project Structure Quick Reference

```
frontend/
├── src/
│   ├── pages/              # Page components
│   ├── components/         # UI components
│   ├── lib/                # Utilities
│   └── main.tsx            # Entry point
├── package.json            # Dependencies
└── vite.config.js          # Build config
```

## Common Development Tasks

### Running Tests

```bash
# Backend tests
cd backend
pytest src/tests/

# Frontend tests
cd frontend
npm run test
```

### Code Linting

```bash
# Backend
cd backend
pylint src/

# Frontend
cd frontend
npm run lint
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Output will be in frontend/dist/
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Module Not Found Errors

Make sure you've activated the virtual environment:
```bash
source backend/venv/bin/activate
```

### Frontend Not Connecting to Backend

Check `frontend/vite.config.ts` proxy configuration points to correct backend URL.

### MongoDB Connection Issues

Verify `MONGODB_PASSWORD` in `.env` is correct and MongoDB service is running.

## IDE Configuration

### VS Code

Install recommended extensions:
- **Python**: ms-python.python
- **Flask**: ms-python.vscode-pylance
- **ESLint**: dbaeumer.vscode-eslint
- **TypeScript**: ms-vscode.vscode-typescript-next
- **Tailwind CSS**: bradlc.vscode-tailwindcss

### PyCharm

- Mark `backend/src` as Sources Root
- Configure Python interpreter to use virtual environment
- Enable Django/Flask support from plugins

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes, test, then commit
git add .
git commit -m "feat: description of changes"

# Push and create pull request
git push origin feature/your-feature
```

## Performance Optimization

### Backend
- Use connection pooling for database connections
- Implement caching for frequently accessed data
- Profile slow endpoints with tools like py-spy

### Frontend
- Enable production mode: `npm run build`
- Use Chrome DevTools Performance tab
- Check bundle size: `npm run analyze` (if configured)

## Useful Commands

```bash
# Backend
cd backend
source venv/bin/activate
python src/app.py                    # Run app
pip freeze > requirements.txt        # Update dependencies
python -m pytest                     # Run tests

# Frontend
cd frontend
npm start                            # Dev server
npm run build                        # Build
npm run preview                      # Preview build
npm run lint                         # Lint code

# Docker
cd docker
docker-compose up                    # Start all services
docker-compose logs -f               # View logs
docker-compose down                  # Stop services
```

## Additional Resources

- See `docs/` folder for detailed guides
- Check `docs/ARCHITECTURE.md` for system design
- See `docs/INTEGRATION_README.md` for integration details
- Check `docs/MONGODB_AND_TRAINING_GUIDE.md` for ML training

## Support

For issues or questions:
1. Check existing documentation in `/docs`
2. Review error messages carefully
3. Check `docker-compose logs` for service issues
4. Verify environment variables are set correctly




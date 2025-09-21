# Development Setup

This document explains how to run the marketplace application in development mode.

## Port Configuration

- **Backend API**: Port 3000 (`http://localhost:3000`)
- **Frontend Web App**: Port 8000 (`http://localhost:8000`)

## Quick Start

### Option 1: Using the Start Scripts

#### For macOS/Linux:
```bash
./start-dev.sh
```

#### For Windows:
```batch
start-dev.bat
```

### Option 2: Manual Start

#### 1. Start Backend Server (Port 3000)
```bash
cd appBackend
npm install
npm run dev
```

#### 2. Start Frontend Server (Port 8000)
```bash
cd appWebVersion
npm install
npm start
```

## Access URLs

- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs (if available)

## Configuration

### Frontend Configuration
The frontend is configured to run on port 8000 through:
- `package.json` script: `"start": "cross-env PORT=8000 react-scripts start"`
- Uses `cross-env` for cross-platform compatibility

### Backend Configuration
The backend runs on port 3000 (default Node.js/Express port)

### API Configuration
The frontend automatically connects to the backend API at `http://localhost:3000/api` as configured in:
- `src/config/api.ts`
- `src/api/config.ts`

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error:

1. **For Port 3000 (Backend)**:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

2. **For Port 8000 (Frontend)**:
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

### Check Running Processes
```bash
# Check what's running on specific ports
lsof -i :3000
lsof -i :8000
```

## Development Features

- **Hot Reload**: Both frontend and backend support hot reload during development
- **CORS**: Backend is configured to allow requests from `http://localhost:8000`
- **Environment Variables**: Frontend uses environment variables for API configuration
- **Cross-Platform**: Uses `cross-env` for consistent behavior across operating systems

## File Structure

```
marketplace/
├── appBackend/          # Backend API (Port 3000)
├── appWebVersion/       # Frontend Web App (Port 8000)
├── appFrontend/         # Mobile App (React Native)
├── start-dev.sh         # Start script for macOS/Linux
├── start-dev.bat        # Start script for Windows
└── DEVELOPMENT.md       # This file
```

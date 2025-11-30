#!/bin/bash

# Start Development Servers Script
# This script starts both the backend (port 3000) and frontend (port 8000)

echo "🚀 Starting Marketplace Development Servers..."
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Check if ports are available
echo "Checking port availability..."
check_port 3000
backend_port_available=$?

check_port 8000
frontend_port_available=$?

if [ $backend_port_available -ne 0 ] || [ $frontend_port_available -ne 0 ]; then
    echo ""
    echo "⚠️  Some ports are already in use. Please stop the services using these ports and try again."
    echo "   Backend should run on port 3000"
    echo "   Frontend should run on port 8000"
    exit 1
fi

echo ""
echo "📦 Starting Backend Server (Port 3000)..."
cd appBackend
npm run dev &
BACKEND_PID=$!

echo "📦 Starting Frontend Server (Port 8000)..."
cd ../appWebVersion
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "   Backend:  https://api.cloudnexus.biz:3000"
echo "   Frontend: https://api.cloudnexus.biz:8000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait

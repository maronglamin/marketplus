@echo off
echo 🚀 Starting Marketplace Development Servers...
echo.

echo 📦 Starting Backend Server (Port 3000)...
start "Backend Server" cmd /k "cd appBackend && npm run dev"

echo 📦 Starting Frontend Server (Port 8000)...
start "Frontend Server" cmd /k "cd appWebVersion && npm start"

echo.
echo ✅ Both servers are starting...
echo    Backend:  https://api.cloudnexus.biz:3000
echo    Frontend: https://api.cloudnexus.biz:8000
echo.
echo Press any key to exit...
pause > nul

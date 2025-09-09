@echo off
echo ========================================
echo 🚨 CrisisAssist - Complete System Startup
echo ========================================
echo MCP Hackathon 2024 - Genkit AI Multi-Agent System
echo.

echo [1/4] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Backend dependency installation failed
    pause
    exit /b 1
)

echo.
echo [2/4] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Frontend dependency installation failed
    pause
    exit /b 1
)

echo.
echo [3/4] Starting backend server with Genkit AI...
cd ..\backend
start "CrisisAssist Backend" cmd /k "npm run dev"
timeout /t 5 /nobreak > nul

echo.
echo [4/4] Starting frontend application...
cd ..\frontend
start "CrisisAssist Frontend" cmd /k "npm run dev"

echo.
echo ✅ Complete system startup initiated!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:3001
echo 🤖 Genkit AI: Integrated with Gemini
echo.
echo Press any key to close this window...
pause > nul

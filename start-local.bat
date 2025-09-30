@echo off
echo 🚀 Starting Telegram Payment Integration Locally
echo.

echo 📋 Pre-flight checks...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Python not found. Please install Python first.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo ✅ Python found
echo.

echo 🔧 Setting up backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)

if not exist .env (
    echo ⚠️  Backend .env file not found!
    echo Please create backend/.env file with your configuration.
    echo See LOCAL_SETUP_GUIDE.md for details.
    pause
    exit /b 1
)

echo.
echo 🐍 Setting up Telegram bot...
cd "../TG Bot Script"

if not exist .env (
    echo ⚠️  Bot .env file not found!
    echo Please create "TG Bot Script/.env" file with your bot configuration.
    echo See LOCAL_SETUP_GUIDE.md for details.
    pause
    exit /b 1
)

echo.
echo 🎨 Setting up frontend...
cd ../frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

echo.
echo 🚀 Starting all services...
echo.
echo Opening 3 terminal windows:
echo 1️⃣  Backend Server (Port 4000)
echo 2️⃣  Telegram Bot
echo 3️⃣  Frontend (Port 5173)
echo.

REM Start backend server
start "Backend Server" cmd /k "cd /d "%~dp0backend" && echo Starting Backend Server... && npm start"

REM Wait 2 seconds
timeout /t 2 >nul

REM Start Telegram bot
start "Telegram Bot" cmd /k "cd /d "%~dp0TG Bot Script" && echo Starting Telegram Bot... && python TG_Automation.py"

REM Wait 2 seconds
timeout /t 2 >nul

REM Start frontend
start "Frontend" cmd /k "cd /d "%~dp0frontend" && echo Starting Frontend... && npm run dev"

echo.
echo ✅ All services started!
echo.
echo 🌐 Access your application:
echo   • Frontend: http://localhost:5173
echo   • Backend:  http://localhost:4000
echo.
echo 📖 Check LOCAL_SETUP_GUIDE.md for testing instructions.
echo.
pause
@echo off
echo 🤖 Restarting Telegram Bot with Channel Configuration Update...
echo.

REM Navigate to bot script directory
cd "..\TG Bot Script"

REM Kill existing Python processes (if any)
echo 🛑 Stopping existing bot processes...
taskkill /f /im python.exe 2>nul
timeout /t 2 /nobreak >nul

REM Start bot with proper logging
echo 🚀 Starting enhanced bot script...
echo.
python TG_Automation_Enhanced.py

pause

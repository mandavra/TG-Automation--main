@echo off
echo Starting TG Automation Services...

echo.
echo Starting Backend on port 4000...
cd backend
start "TG Automation Backend" cmd /k "npm start"

echo.
echo Starting Frontend on port 5173...
cd ../frontend
start "TG Automation Frontend" cmd /k "npm run dev"

echo.
echo Services are starting...
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
echo.
echo Press any key to continue...
pause

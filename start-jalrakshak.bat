@echo off
REM Starts MongoDB, the backend and the frontend.
REM Starts the hybrid simulator (pressure + virtual zones). Connect ESP32 with connect-esp32.bat.

set ROOT=%~dp0

REM Start MongoDB only if it is not already running
tasklist /FI "IMAGENAME eq mongod.exe" | find /I "mongod.exe" >nul
if errorlevel 1 (
  start "MongoDB" "D:\mongodb\mongodb-win32-x86_64-windows-8.0.16\bin\mongod.exe" --dbpath "D:\mongodb\data" --bind_ip 127.0.0.1 --port 27017
  timeout /t 5 /nobreak >nul
) else (
  echo MongoDB is already running.
)

start "Backend (port 8000)" cmd /k "cd /d %ROOT%backend && .venv-local\Scripts\python -m uvicorn main:app --port 8000"
timeout /t 8 /nobreak >nul

start "Hybrid simulator (pressure + simulated zones)" cmd /k "cd /d %ROOT%backend && .venv-local\Scripts\python simulator.py"
timeout /t 3 /nobreak >nul

start "Frontend (port 5173)" cmd /k "cd /d %ROOT%frontend && npm run dev"
timeout /t 5 /nobreak >nul

start http://localhost:5173

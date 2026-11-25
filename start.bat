@echo off
REM Double-click this file to run the to-do app locally.
REM It installs dependencies the first time, starts the API server and the
REM dev server, and opens the app in your default browser. Needs a .env file.

title Tasks - dev server
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH.
  echo Install it from https://nodejs.org and try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies, this only happens the first time...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  echo No .env file found. Copy .env.example to .env and fill in
  echo DB_CONNECTION_STRING and JWT_SECRET, then run this again.
  pause
  exit /b 1
)

echo Starting the API server in a second window (port 3001)...
start "Tasks - API server" cmd /k npm run server

echo Starting the app (usually http://localhost:5173; if that port is busy,
echo Vite uses the next free one and prints it below)...
echo Close both windows to stop the app.
call npm run dev -- --port 5173 --open

pause

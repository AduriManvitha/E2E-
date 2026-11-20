@echo off
REM Double-click this file to run the to-do app locally.
REM It installs dependencies the first time, starts the dev server,
REM and opens the app in your default browser. Close this window to stop it.

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

echo Starting the app (usually http://localhost:5173; if that port is busy,
echo Vite uses the next free one and prints it below)...
echo Close this window to stop the app.
call npm run dev -- --port 5173 --open

pause

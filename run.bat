@echo off
title MedVLM - Run All
color 0A
echo.
echo  ==========================================
echo    MedVLM · AI Radiology Report Generator
echo  ==========================================
echo.

:: ── Check for .env key ──────────────────────────────────────
findstr /C:"your_key_here" "%~dp0backend\.env" >nul 2>&1
if %errorlevel%==0 (
    echo  [!] WARNING: GEMINI_API_KEY is still set to placeholder.
    echo      Edit backend\.env and add your real API key.
    echo      Get one at: https://aistudio.google.com/app/apikey
    echo.
    pause
)

:: ── Install backend dependencies ────────────────────────────
echo  [1/3] Installing backend dependencies...
pip install -q -r "%~dp0backend\requirements.txt"
echo        Done.
echo.

:: ── Install frontend dependencies ───────────────────────────
echo  [2/3] Installing frontend dependencies...
cd /d "%~dp0medvlm-frontend"
call npm install --silent
echo        Done.
echo.

:: ── Launch servers ──────────────────────────────────────────
echo  [3/3] Starting servers...
echo.
echo        Backend  : http://localhost:8000
echo        Frontend : http://localhost:5173
echo.
echo  ==========================================
echo   Press Ctrl+C in either window to stop.
echo  ==========================================
echo.

:: Start backend in a new window
start "MedVLM Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Start frontend in this window
cd /d "%~dp0medvlm-frontend"
call npm run dev

@echo off
title MedVLM Studio - Clinical AI Workstation Launcher
color 0B

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo.
echo  ==============================================================
echo       MEDVLM STUDIO - CLINICAL AI RADIOLOGY WORKSTATION
echo          TorchXRayVision DenseNet-121 + Gemini 3.8 Flash
echo  ==============================================================
echo.

REM -----------------------------------------------------------------
REM Step 1: Detect Python Environment
REM -----------------------------------------------------------------
echo  [*] Checking Python environment...
set PYTHON_CMD=
python --version >nul 2>&1
if %errorlevel%==0 (
    set PYTHON_CMD=python
) else (
    py -3.12 --version >nul 2>&1
    if %errorlevel%==0 (
        set PYTHON_CMD=py -3.12
    ) else (
        py --version >nul 2>&1
        if %errorlevel%==0 (
            set PYTHON_CMD=py
        )
    )
)

if "%PYTHON_CMD%"=="" (
    echo.
    echo  [ERROR] Python was not found in system PATH.
    echo         Please install Python 3.10+ from https://python.org
    echo.
    pause
    exit /b 1
)
echo        Python detected: %PYTHON_CMD%

REM -----------------------------------------------------------------
REM Step 2: Detect Node.js and npm
REM -----------------------------------------------------------------
echo  [*] Checking Node.js and npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js and npm were not found in system PATH.
    echo         Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo        Node.js and npm detected.

REM -----------------------------------------------------------------
REM Step 3: Check backend .env Configuration
REM -----------------------------------------------------------------
echo  [*] Checking backend environment configuration...
if not exist "%PROJECT_DIR%backend\.env" (
    if exist "%PROJECT_DIR%backend\.env.example" (
        copy "%PROJECT_DIR%backend\.env.example" "%PROJECT_DIR%backend\.env" >nul
        echo        Created backend\.env from template.
    ) else (
        echo GEMINI_API_KEY=your_key_here> "%PROJECT_DIR%backend\.env"
        echo GEMINI_MODEL=gemini-3.6-flash>> "%PROJECT_DIR%backend\.env"
        echo        Created default backend\.env file.
    )
)

findstr /C:"your_key_here" "%PROJECT_DIR%backend\.env" >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo  [!] WARNING: GEMINI_API_KEY in backend\.env is set to placeholder.
    echo      Add your real key from https://aistudio.google.com/app/apikey
    echo      for multimodal clinical findings generation.
    echo.
) else (
    echo        Gemini API configuration present.
)

REM -----------------------------------------------------------------
REM Step 4: Clean Up Previous Orphaned Processes on Ports 8000 and 5173
REM -----------------------------------------------------------------
echo  [*] Checking ports 8000 and 5173...
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
echo        Ports 8000 and 5173 are ready.

REM -----------------------------------------------------------------
REM Step 5: Verify Backend Dependencies
REM -----------------------------------------------------------------
echo  [*] Verifying backend dependencies...
%PYTHON_CMD% -c "import fastapi, uvicorn, torch, torchxrayvision, pydicom" >nul 2>&1
if %errorlevel% neq 0 (
    echo        Missing dependencies detected. Installing backend requirements...
    echo        [This may take a few minutes for PyTorch and TorchXRayVision]
    %PYTHON_CMD% -m pip install -r "%PROJECT_DIR%backend\requirements.txt"
    if %errorlevel% neq 0 (
        echo  [ERROR] Backend dependency installation failed.
        pause
        exit /b 1
    )
) else (
    echo        Backend dependencies verified.
)

REM -----------------------------------------------------------------
REM Step 6: Verify Frontend Dependencies
REM -----------------------------------------------------------------
echo  [*] Verifying frontend dependencies...
if not exist "%PROJECT_DIR%medvlm-frontend\node_modules\" (
    echo        Installing frontend packages [npm install]...
    cd /d "%PROJECT_DIR%medvlm-frontend"
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
    cd /d "%PROJECT_DIR%"
) else (
    echo        Frontend packages verified.
)

:START_SERVERS
echo.
echo  ==============================================================
echo       STARTING MEDVLM STUDIO SERVICES...
echo  ==============================================================
echo.

REM Start Backend API
start "MedVLM - Backend API (Port 8000)" /d "%PROJECT_DIR%backend" cmd /k "title MedVLM Backend && color 0A && echo Starting MedVLM FastAPI Backend on port 8000... && %PYTHON_CMD% -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 || pause"

REM Start Frontend UI
start "MedVLM - Frontend UI (Port 5173)" /d "%PROJECT_DIR%medvlm-frontend" cmd /k "title MedVLM Frontend && color 0B && echo Starting MedVLM Vite Dev Server on port 5173... && npm run dev || pause"

echo  [*] Waiting for servers to initialize...
ping 127.0.0.1 -n 4 >nul

REM Launch Browser
echo  [*] Opening MedVLM Studio in default browser...
start http://localhost:5173

:MENU
cls
echo.
echo  ==============================================================
echo       MEDVLM STUDIO IS LIVE AND ACTIVE!
echo  ==============================================================
echo.
echo    [1] Workstation UI  : http://localhost:5173
echo    [2] Backend API     : http://localhost:8000
echo    [3] API Docs (REST) : http://localhost:8000/docs
echo    [4] API Health Check: http://localhost:8000/health
echo.
echo  ==============================================================
echo    CONTROLS:
echo  ==============================================================
echo    [B] Open / Re-open Web Workstation in Browser
echo    [D] Open Swagger API Documentation
echo    [R] Restart Both Servers
echo    [Q] Quit and Stop All Servers
echo  ==============================================================
echo.

choice /c BDRQ /n /m "  Select action [B = Browser, D = Docs, R = Restart, Q = Quit]: "
if %errorlevel%==1 goto OPEN_BROWSER
if %errorlevel%==2 goto OPEN_DOCS
if %errorlevel%==3 goto RESTART
if %errorlevel%==4 goto QUIT

:OPEN_BROWSER
start http://localhost:5173
goto MENU

:OPEN_DOCS
start http://localhost:8000/docs
goto MENU

:RESTART
echo.
echo  [*] Stopping existing servers...
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
ping 127.0.0.1 -n 2 >nul
goto START_SERVERS

:QUIT
echo.
echo  [*] Shutting down MedVLM Studio servers...
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
echo  [*] All services stopped cleanly.
ping 127.0.0.1 -n 2 >nul
exit /b 0

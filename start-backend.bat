@echo off
REM Start the AI Commander FastAPI backend.
REM   start-backend.bat            = first free port from 8000
REM   start-backend.bat reload     = same, with auto-reload on code changes
REM   set PORT=8005, then start-backend.bat = search from 8005
setlocal
cd /d "%~dp0backend"

set "PY=.venv\Scripts\python.exe"
if not exist "%PY%" (
  echo [!] backend\.venv not found. Run setup.bat first.
  exit /b 1
)
"%PY%" -c "import fastapi, uvicorn, numpy" 2>nul
if errorlevel 1 (
  echo [X] Backend packages missing in backend\.venv. Run setup.bat.
  exit /b 1
)

if "%PORT%"=="" set "PORT=8000"
set "WANT=%PORT%"
for /f %%p in ('"%PY%" scripts\find_free_port.py %WANT% 2^>nul') do set "PORT=%%p"
"%PY%" scripts\find_free_port.py %PORT% 1 >nul 2>nul
if errorlevel 1 (
  echo [X] No free localhost port found starting at %WANT%.
  exit /b 1
)
if not "%PORT%"=="%WANT%" echo [!] Port %WANT% is busy or blocked (old backend still running? run stop-backend.bat). Using port %PORT%.

REM Tell the frontend dev proxy which port to use.
> "%~dp0.backend-port" echo %PORT%

set "RELOAD="
if /i "%~1"=="reload" set "RELOAD=--reload --reload-dir app"
set "TF_CPP_MIN_LOG_LEVEL=2"
echo.
echo   AI Commander API : http://127.0.0.1:%PORT%
echo   Health check     : http://127.0.0.1:%PORT%/api/health
echo   API docs         : http://127.0.0.1:%PORT%/docs
echo   (start-frontend.bat will proxy /api to this port)
echo.
"%PY%" -m uvicorn app.main:app --host 127.0.0.1 --port %PORT% %RELOAD%

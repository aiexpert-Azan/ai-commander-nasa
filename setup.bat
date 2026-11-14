@echo off
REM One-time setup: Python 3.12 venv + backend packages, model/data check, frontend npm packages.
setlocal
cd /d "%~dp0backend"
if not exist .venv (
  echo Creating Python 3.12 virtual environment...
  py -3.12 -m venv .venv
  if errorlevel 1 (
    echo [X] Python 3.12 not found. Install it from https://www.python.org/downloads/ and re-run setup.bat.
    exit /b 1
  )
)
call .venv\Scripts\python -m pip install --upgrade pip
call .venv\Scripts\python -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
call .venv\Scripts\python scripts\verify_assets.py
if errorlevel 1 exit /b 1
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 exit /b 1
echo.
echo Setup complete. Run start-backend.bat, then start-frontend.bat (two terminals).

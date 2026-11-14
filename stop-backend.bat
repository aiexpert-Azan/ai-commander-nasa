@echo off
REM Stop the backend listening on the port in .backend-port (default 8000), including --reload workers.
REM   stop-backend.bat        = port from .backend-port or 8000
REM   stop-backend.bat 8001   = explicit port
setlocal
set "PORT=8000"
if exist "%~dp0.backend-port" set /p PORT=<"%~dp0.backend-port"
if not "%~1"=="" set "PORT=%~1"
echo Stopping backend on 127.0.0.1:%PORT% ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backend\scripts\stop_backend.ps1" -Port %PORT%

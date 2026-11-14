@echo off
REM Start the Vite dev server. /api is proxied to the port written by start-backend.bat.
setlocal
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing frontend packages...
  call npm install || exit /b 1
)
set "BPORT=8000"
if exist "%~dp0.backend-port" set /p BPORT=<"%~dp0.backend-port"
echo.
echo   Game     : http://127.0.0.1:5173
echo   API via  : /api  -^>  http://127.0.0.1:%BPORT%
echo   (Start the backend first; restart this if the backend port changes.)
echo.
npm run dev

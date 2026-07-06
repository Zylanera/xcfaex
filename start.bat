@echo off
cd /d "%~dp0"
echo.
echo X Following Exporter
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found.
    echo Please install it from: https://nodejs.org
    pause
    exit /b 1
)

if not exist ".env" (
    echo Configuration file not found.
    echo Please copy .env.example to .env and fill in your settings.
    echo See README.md for details.
    pause
    exit /b 1
)

echo Installing packages...
call npm install --silent
echo.
echo Starting export...
echo.
node export.js
echo.
pause

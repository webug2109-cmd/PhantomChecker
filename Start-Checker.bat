@echo off
title Phantom Checker
color 0B
cls

echo ================================================================
echo           PHANTOM CHECKER - HIGH-CPM MAIL SUITE
echo ================================================================
echo.

:: Ensure current working directory is this script's directory
cd /d "%~dp0"
echo [*] Working directory: %CD%

:: Add Node.js to current session PATH
set "PATH=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\node;%PATH%"

:: Check if Node.js is installed
echo [*] Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js not found via where command.
    if exist "C:\Program Files\nodejs\node.exe" (
        echo [*] Found node.exe in Program Files, adding to PATH...
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo.
        echo [ERROR] Node.js is not installed on this system.
        echo Please download and install Node.js from: https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
)

:: Print Node and npm versions for diagnostics
echo [*] Node version:
call node -v
echo [*] npm version:
call npm -v
echo.

:: Check if dependencies are installed
if not exist "node_modules\" (
    echo [*] First-time setup: Installing required dependencies...
    echo [*] This will only take a moment.
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [*] Dependencies installed successfully!
    echo.
)

echo [*] Starting Phantom Checker Server...
echo [*] Local URL: http://localhost:5173/
echo [*] Your default browser will open automatically.
echo.
echo [!] Keep this window open while using the application.
echo [!] To stop the checker, close this window or press Ctrl+C.
echo ================================================================
echo.

:: Open browser after short delay in background
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5173/"

:: Launch Vite Dev Server
call npm run dev -- --open

:: If we reach here the server stopped
echo.
echo ================================================================
echo [*] Server has stopped.
echo ================================================================
echo.
pause
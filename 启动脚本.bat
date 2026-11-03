@echo off
title Senyuan Management System Launcher
cls

echo ==========================================
echo    Senyuan Management System - Startup Check
echo ==========================================
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed
    echo Please visit https://nodejs.org to download and install
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [OK] Node.js version: %NODE_VER%
echo.

:: Check pnpm
echo [2/4] Checking pnpm...
where pnpm >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] pnpm is not installed
    echo.
    choice /C YN /M "Install pnpm now"
    if errorlevel 2 (
        echo.
        echo Cancelled. Please run manually: npm install -g pnpm
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Installing pnpm...
    call npm install -g pnpm
    if errorlevel 1 (
        echo.
        echo [ERROR] pnpm installation failed
        echo.
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm --version') do set PNPM_VER=%%i
echo [OK] pnpm version: %PNPM_VER%
echo.

:: Check database file
echo [3/4] Checking database...
if not exist "prisma\dev.db" (
    echo [WARNING] Database file does not exist
    echo Database will be initialized on first run
    echo.
)

:: Check dependencies
echo [4/4] Checking project dependencies...
if not exist "node_modules" (
    echo.
    echo [WARNING] Dependencies not installed. Need to run: pnpm install
    echo.
    choice /C YN /M "Install dependencies now"
    if errorlevel 2 (
        echo.
        echo Cancelled. Please run manually: pnpm install
        echo.
        pause
        exit /b 1
    )
    echo.
    echo Installing dependencies, please wait...
    echo.
    call pnpm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Dependencies installation failed
        echo.
        pause
        exit /b 1
    )
)
echo [OK] Dependencies installed
echo.

echo ==========================================
echo    Starting Development Server
echo ==========================================
echo.
echo Access URL: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo.
echo Starting, please wait...
echo.

:: Start development server
call pnpm dev

:: Pause to view error messages if server exits unexpectedly
echo.
echo.
echo Server stopped
pause

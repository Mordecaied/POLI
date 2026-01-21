@echo off
echo === POLI Installation Test ===
echo.

cd /d "%~dp0"

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Step 2: Building package...
call npm run build
if errorlevel 1 (
    echo ERROR: build failed
    pause
    exit /b 1
)

echo.
echo Step 3: Checking dist folder...
if exist "dist" (
    echo SUCCESS: dist folder created
    dir dist
) else (
    echo ERROR: dist folder not found
    pause
    exit /b 1
)

echo.
echo Step 4: Testing CLI...
node dist/cli/index.js help

echo.
echo === Installation Test Complete ===
pause

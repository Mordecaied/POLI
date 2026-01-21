@echo off
echo === POLI npm Publish ===
echo.

cd /d "%~dp0"

echo Step 1: Checking npm login status...
npm whoami
if errorlevel 1 (
    echo.
    echo You need to login to npm first.
    echo Running: npm login
    call npm login
    if errorlevel 1 (
        echo ERROR: npm login failed
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Building package...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Step 3: Publishing to npm...
call npm publish --access public
if errorlevel 1 (
    echo.
    echo ERROR: Publish failed. The package name 'poli-qa' might be taken.
    echo Try updating package.json to use a scoped name: @mordecaied/poli-qa
    pause
    exit /b 1
)

echo.
echo === SUCCESS! ===
echo Package published to npm!
echo.
echo Install with: npm install poli-qa
echo Or: npx poli-qa init
echo.
pause

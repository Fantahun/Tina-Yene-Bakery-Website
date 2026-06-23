@echo off
REM Deployment Package Builder for Hostinger (Windows)
REM This script creates an optimized ZIP package for Hostinger deployment
REM Run from project root: build-deployment-package.bat

setlocal enabledelayedexpansion
set "DEPLOY_DIR=tina-bakery-hostinger-deploy"
set "ZIP_NAME=tina-bakery-hostinger.zip"

echo.
echo ════════════════════════════════════════════════════════════════
echo   Tina Yene Bakery - Hostinger Deployment Package Builder
echo ════════════════════════════════════════════════════════════════
echo.

REM Step 1: Pre-flight checks
echo Step 1: Pre-flight checks
echo ───────────────────────────────────────────────────────────────

if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)
echo [OK] Found package.json

if not exist ".next" (
    echo WARNING: .next directory not found
    echo Running: pnpm run build
    call pnpm run build
)
echo [OK] Found .next directory

echo.
echo Step 2: Preparing deployment directory
echo ───────────────────────────────────────────────────────────────

if exist "%DEPLOY_DIR%" (
    echo Removing old deployment directory...
    rmdir /s /q "%DEPLOY_DIR%"
)

mkdir "%DEPLOY_DIR%"
echo [OK] Created deployment directory

echo.
echo Step 3: Copying application files
echo ───────────────────────────────────────────────────────────────

echo Copying source directories...
setlocal enabledelayedexpansion

set "dirs=.next public prisma lib app components store hooks styles scripts"
for %%d in (!dirs!) do (
    if exist "%%d" (
        xcopy "%%d" "%DEPLOY_DIR%\%%d\" /E /I /Q
        echo [OK] Copied %%d
    ) else (
        echo [SKIP] %%d ^(not found^)
    )
)

echo.
echo Copying configuration files...
set "configs=package.json pnpm-lock.yaml next.config.mjs tsconfig.json tailwind.config.ts postcss.config.mjs proxy.ts"
for %%f in (!configs!) do (
    if exist "%%f" (
        copy "%%f" "%DEPLOY_DIR%\" >nul
        echo [OK] Copied %%f
    ) else (
        echo [SKIP] %%f ^(not found^)
    )
)

echo.
echo Copying documentation...
if exist "README.md" (
    copy "README.md" "%DEPLOY_DIR%\" >nul
    echo [OK] Copied README.md
)

echo.
echo Step 4: Verification
echo ───────────────────────────────────────────────────────────────

REM Check critical files
set "critical_missing=0"
set "critical=package.json .next prisma lib app components public"
for %%f in (!critical!) do (
    if not exist "%DEPLOY_DIR%\%%f" (
        echo [ERROR] Missing: %%f
        set /a "critical_missing+=1"
    ) else (
        echo [OK] Found: %%f
    )
)

if !critical_missing! gtr 0 (
    echo.
    echo [ERROR] Critical files missing. Aborting.
    rmdir /s /q "%DEPLOY_DIR%"
    pause
    exit /b 1
)

echo.
echo Step 5: Creating ZIP package
echo ───────────────────────────────────────────────────────────────

REM Check if 7-Zip installed (most reliable)
if exist "C:\Program Files\7-Zip\7z.exe" (
    "C:\Program Files\7-Zip\7z.exe" a -tzip "%ZIP_NAME%" "%DEPLOY_DIR%" >nul
    echo [OK] ZIP package created: %ZIP_NAME%
) else if exist "C:\Program Files (x86)\7-Zip\7z.exe" (
    "C:\Program Files (x86)\7-Zip\7z.exe" a -tzip "%ZIP_NAME%" "%DEPLOY_DIR%" >nul
    echo [OK] ZIP package created: %ZIP_NAME%
) else (
    REM Try PowerShell (Windows 7+)
    echo Using PowerShell to create ZIP...
    powershell -nologo -noprofile -command "Add-Type -AssemblyName 'System.IO.Compression.FileSystem'; [System.IO.Compression.ZipFile]::CreateFromDirectory('%CD%\%DEPLOY_DIR%', '%CD%\%ZIP_NAME%')" 
    if errorlevel 1 (
        echo [WARNING] Could not create ZIP via PowerShell
        echo Install 7-Zip or use manual compression tool
        pause
        exit /b 1
    )
    echo [OK] ZIP package created: %ZIP_NAME%
)

REM Display file size
for %%A in ("%ZIP_NAME%") do set "zip_size=%%~zA"
echo Package size: %zip_size% bytes

echo.
echo Cleaning up temporary deployment directory...
rmdir /s /q "%DEPLOY_DIR%"
echo [OK] Removed temporary deployment directory

echo.
echo Step 6: Creating deployment guide
echo ───────────────────────────────────────────────────────────────

(
echo ═══════════════════════════════════════════════════════════════════
echo   HOSTINGER DEPLOYMENT INSTRUCTIONS
echo   Tina Yene Bakery Website
echo ═══════════════════════════════════════════════════════════════════
echo.
echo DEPLOYMENT PACKAGE CONTENTS:
echo   ✓ .next/              - Pre-built Next.js application
echo   ✓ public/             - Static assets and images
echo   ✓ prisma/             - Database schema and migrations
echo   ✓ app/, components/   - Application source code
echo   ✓ lib/, store/, etc.  - Utilities and libraries
echo   ✓ Configuration files - next.config.mjs, tsconfig.json, etc.
echo   ✓ package.json        - Dependencies manifest
echo   ✓ pnpm-lock.yaml      - Locked dependency versions
echo.
echo NOT INCLUDED:
echo   ✗ node_modules/       - Will be installed on server
echo   ✗ .env                - Must be created on server
echo   ✗ .git/               - Version control not needed
echo.
echo ═══════════════════════════════════════════════════════════════════
echo QUICK DEPLOYMENT STEPS:
echo ═══════════════════════════════════════════════════════════════════
echo.
echo 1. Upload %ZIP_NAME% to Hostinger (cPanel File Manager or FTP^)
echo.
echo 2. Extract ZIP file in public_html/
echo.
echo 3. SSH to server and run:
echo    cd ~/public_html/tina-bakery-hostinger-deploy
echo    pnpm install --prod
echo    npx prisma generate
echo    npx prisma migrate deploy
echo.
echo 4. Create .env file with your environment variables
echo    nano .env
echo    [Paste values from ENVIRONMENT_VARIABLES_TEMPLATE.txt]
echo.
echo 5. Start application:
echo    npm start
echo    Or use cPanel Node.js App setup
echo.
echo 6. Verify: https://yourdomain.com
echo.
echo For detailed instructions, see HOSTINGER_DEPLOYMENT_ASSESSMENT.md
echo ═══════════════════════════════════════════════════════════════════
) > DEPLOYMENT_INSTRUCTIONS.txt

echo [OK] Created DEPLOYMENT_INSTRUCTIONS.txt

echo.
echo Step 7: Summary
echo ───────────────────────────────────────────────────────────────
echo.
echo [SUCCESS] Deployment package created successfully!
echo.
echo Package Information:
echo   File: %ZIP_NAME%
echo   Size: %zip_size% bytes
echo.
echo Files Created:
echo   - %ZIP_NAME% ^(ready to upload^)
echo   - DEPLOYMENT_INSTRUCTIONS.txt ^(step-by-step guide^)
echo.
echo Next Steps:
echo   1. Read DEPLOYMENT_INSTRUCTIONS.txt
echo   2. Prepare all environment variables from template
echo   3. Upload %ZIP_NAME% to Hostinger
echo   4. Follow deployment steps
echo   5. Test thoroughly before going live
echo.
echo For detailed guidance, see:
echo   HOSTINGER_DEPLOYMENT_ASSESSMENT.md
echo.
echo ════════════════════════════════════════════════════════════════
echo Ready for deployment! ✨
echo ════════════════════════════════════════════════════════════════
echo.

pause

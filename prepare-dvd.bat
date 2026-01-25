@echo off
title MediVault - DVD Preparation Tool
color 0B
setlocal EnableDelayedExpansion

echo.
echo  ============================================================
echo       MediVault DVD Preparation Tool
echo       Prepares project for burning to DVD
echo  ============================================================
echo.

:: Set paths
set "PROJECT_PATH=%~dp0"
set "OUTPUT_PATH=%PROJECT_PATH%DVD_READY"
set "MEDIVAULT_PATH=%OUTPUT_PATH%\MediVault"

echo  [INFO] Project Path: %PROJECT_PATH%
echo  [INFO] Output Path: %OUTPUT_PATH%
echo.

:: Clean previous build
echo  [STEP 1/6] Cleaning previous DVD build...
if exist "%OUTPUT_PATH%" (
    rmdir /s /q "%OUTPUT_PATH%" 2>nul
)
mkdir "%OUTPUT_PATH%"
mkdir "%MEDIVAULT_PATH%"
mkdir "%OUTPUT_PATH%\Installers"
mkdir "%OUTPUT_PATH%\Documentation"
echo  [OK] Clean complete.
echo.

:: Copy main project files (excluding unnecessary files)
echo  [STEP 2/6] Copying project files...
echo  [INFO] This will exclude node_modules, .git, and other large folders

:: Create list of items to copy
set "COPY_ITEMS=client server shared scripts docs hardware attached_assets uploads"
set "COPY_FILES=package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.ts postcss.config.js drizzle.config.ts components.json README.md favicon.png"

:: Copy folders
for %%i in (%COPY_ITEMS%) do (
    if exist "%PROJECT_PATH%%%i" (
        echo    Copying %%i...
        xcopy "%PROJECT_PATH%%%i" "%MEDIVAULT_PATH%\%%i\" /E /H /C /I /Y /Q >nul 2>&1
    )
)

:: Copy individual files
for %%f in (%COPY_FILES%) do (
    if exist "%PROJECT_PATH%%%f" (
        copy "%PROJECT_PATH%%%f" "%MEDIVAULT_PATH%\" /Y >nul 2>&1
    )
)

:: Copy .env.example (NOT .env with real credentials!)
if exist "%PROJECT_PATH%.env.example" (
    copy "%PROJECT_PATH%.env.example" "%MEDIVAULT_PATH%\.env.example" /Y >nul 2>&1
)

:: Copy migration files
for %%f in ("%PROJECT_PATH%migration_*.sql") do (
    copy "%%f" "%MEDIVAULT_PATH%\" /Y >nul 2>&1
)

echo  [OK] Project files copied.
echo.

:: Copy DVD setup files
echo  [STEP 3/6] Copying DVD setup files...
copy "%PROJECT_PATH%DVD_SETUP\INSTALL.bat" "%OUTPUT_PATH%\" /Y >nul
copy "%PROJECT_PATH%DVD_SETUP\autorun.inf" "%OUTPUT_PATH%\" /Y >nul
copy "%PROJECT_PATH%DVD_SETUP\README_DVD.txt" "%OUTPUT_PATH%\" /Y >nul
echo  [OK] Setup files copied.
echo.

:: Create documentation folder content
echo  [STEP 4/6] Preparing documentation...
if exist "%PROJECT_PATH%docs\medivault-system-overview.md" (
    copy "%PROJECT_PATH%docs\*.md" "%OUTPUT_PATH%\Documentation\" /Y >nul 2>&1
)
copy "%MEDIVAULT_PATH%\README.md" "%OUTPUT_PATH%\Documentation\README.md" /Y >nul 2>&1
echo  [OK] Documentation prepared.
echo.

:: Check DVD size
echo  [STEP 5/6] Calculating total size...
set size=0
for /r "%OUTPUT_PATH%" %%a in (*) do (
    set /a "size+=%%~za" 2>nul
)
set /a "sizeMB=size/1048576"
echo  [INFO] Total size: approximately !sizeMB! MB
echo.

:: Check if it fits on DVD
if !sizeMB! GTR 4700 (
    echo  [WARNING] Size exceeds single-layer DVD capacity (4.7 GB)!
    echo  [INFO] Consider using a dual-layer DVD (8.5 GB) or removing some files.
) else if !sizeMB! GTR 700 (
    echo  [INFO] Size is suitable for DVD (4.7 GB capacity)
) else (
    echo  [INFO] Size is suitable for CD (700 MB capacity)
)
echo.

:: Final instructions
echo  [STEP 6/6] Creating burn instructions...
(
    echo ================================================================================
    echo                    DVD BURNING INSTRUCTIONS
    echo ================================================================================
    echo.
    echo CONTENTS OF THIS FOLDER:
    echo -------------------------
    echo DVD_READY\
    echo ├── INSTALL.bat         ^(One-click installer - main entry point^)
    echo ├── autorun.inf         ^(AutoPlay configuration^)
    echo ├── README_DVD.txt      ^(Instructions for users^)
    echo ├── MediVault\          ^(Main project files^)
    echo ├── Installers\         ^(Add Node.js/PostgreSQL installers here^)
    echo └── Documentation\      ^(Additional documentation^)
    echo.
    echo BURNING INSTRUCTIONS:
    echo ---------------------
    echo.
    echo METHOD 1: Windows Built-in ^(Windows 10/11^)
    echo -----------------------------------------
    echo 1. Insert a blank DVD into your DVD drive
    echo 2. Open File Explorer and navigate to this DVD_READY folder
    echo 3. Select ALL contents ^(Ctrl+A^)
    echo 4. Right-click and select "Send to" ^> "DVD RW Drive"
    echo 5. Choose "With a CD/DVD player" option
    echo 6. Click "Burn" or "Burn to disc"
    echo 7. Wait for the burning process to complete
    echo 8. Verify the disc by ejecting and re-inserting
    echo.
    echo METHOD 2: Using ImgBurn ^(Recommended for reliability^)
    echo -------------------------------------------------------
    echo 1. Download ImgBurn from: https://www.imgburn.com/
    echo 2. Install and open ImgBurn
    echo 3. Select "Write files/folders to disc"
    echo 4. Drag the DVD_READY folder contents to the source panel
    echo 5. Insert blank DVD
    echo 6. Click the Write button
    echo 7. Wait for completion
    echo.
    echo METHOD 3: Using CDBurnerXP
    echo --------------------------
    echo 1. Download from: https://cdburnerxp.se/
    echo 2. Open CDBurnerXP, select "Data Disc"
    echo 3. Drag DVD_READY contents to the disc layout
    echo 4. Click "Burn" and follow prompts
    echo.
    echo OPTIONAL: Adding Installers
    echo ---------------------------
    echo To make the DVD more complete, add these installers to the Installers\ folder:
    echo.
    echo 1. Node.js: Download from https://nodejs.org/
    echo    - Get: node-v20.x.x-x64.msi
    echo.
    echo 2. PostgreSQL: Download from https://www.postgresql.org/download/windows/
    echo    - Get: postgresql-15.x-windows-x64.exe
    echo.
    echo IMPORTANT NOTES:
    echo ----------------
    echo - Use a good quality DVD for reliability
    echo - Burn at slower speed ^(4x-8x^) for better compatibility
    echo - Test the DVD on another computer before final submission
    echo - Keep a backup copy of the DVD_READY folder
    echo.
    echo ================================================================================
) > "%OUTPUT_PATH%\BURN_INSTRUCTIONS.txt"
echo  [OK] Burn instructions created.
echo.

echo  ============================================================
echo.
echo  [SUCCESS] DVD preparation complete!
echo.
echo  Output Location: %OUTPUT_PATH%
echo  Total Size: approximately !sizeMB! MB
echo.
echo  NEXT STEPS:
echo  -----------
echo  1. (Optional) Add Node.js installer to: %OUTPUT_PATH%\Installers\
echo  2. (Optional) Add PostgreSQL installer to: %OUTPUT_PATH%\Installers\
echo  3. Read BURN_INSTRUCTIONS.txt for burning guide
echo  4. Burn the DVD_READY folder contents to a blank DVD
echo.
echo  ============================================================
echo.
echo  Press any key to open the DVD_READY folder...
pause >nul
explorer "%OUTPUT_PATH%"
exit /b 0

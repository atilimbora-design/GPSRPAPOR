@echo off
echo ========================================
echo GPS RAPOR - Windows Build Script
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Building Windows Release...
flutter build windows --release

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Windows build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Creating Desktop Shortcut...

set "BUILD_DIR=%CD%\build\windows\x64\runner\Release"
set "EXE_PATH=%BUILD_DIR%\frontend.exe"
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\GPS RAPOR (PC).lnk"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%EXE_PATH%'; $s.WorkingDirectory = '%BUILD_DIR%'; $s.IconLocation = '%EXE_PATH%'; $s.Description = 'GPS RAPOR - Yönetim Paneli'; $s.Save()"

if exist "%SHORTCUT%" (
    echo SUCCESS: Shortcut created at Desktop
) else (
    echo WARNING: Could not create shortcut
)

echo.
echo [3/3] Build Complete!
echo.
echo Windows EXE: %EXE_PATH%
echo Desktop Shortcut: %SHORTCUT%
echo.
echo ========================================
echo Build completed successfully!
echo ========================================
pause

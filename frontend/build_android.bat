@echo off
echo ========================================
echo GPS RAPOR - Android Build Script
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Building Android APK...
flutter build apk --release

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Android build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Copying APK to Desktop...

set "APK_SOURCE=%CD%\build\app\outputs\flutter-apk\app-release.apk"
set "DESKTOP=%USERPROFILE%\Desktop"
set "APK_DEST=%DESKTOP%\GPS_RAPOR.apk"

copy /Y "%APK_SOURCE%" "%APK_DEST%"

if exist "%APK_DEST%" (
    echo SUCCESS: APK copied to Desktop
) else (
    echo WARNING: Could not copy APK
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo APK Location: %APK_DEST%
echo.
pause

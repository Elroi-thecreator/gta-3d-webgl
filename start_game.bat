@echo off
title GTA: Vice & Liberty 3D Launcher
echo ========================================================
echo        STARTING GTA: VICE & LIBERTY 3D (WebGL)
echo ========================================================
echo.
echo Launching local game server on port 8000...
start /b py -m http.server 8000
timeout /t 2 /nobreak >nul
echo.
echo Opening Google Chrome at http://localhost:8000 ...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "http://localhost:8000"
echo.
echo Game is running! Keep this window open while playing.
echo Press Ctrl+C to stop the game server.
pause

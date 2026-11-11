@echo off
rem Double-click to start the Psyflo demo. Needs Node.js 20+ (nodejs.org).
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org ^(LTS^), then double-click this again. & pause & exit /b 1)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:4000"
echo Psyflo demo running. Keep this window open; close it to stop.
node server\index.js
pause

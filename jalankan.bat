@echo off
cd /d "%~dp0"
echo Menjalankan Money Tracker...
py server.py
if errorlevel 1 python server.py
pause

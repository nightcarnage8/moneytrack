@echo off
cd /d "%~dp0"
echo ========================================
echo   Money Tracking
echo   Database: localStorage (browser)
echo ========================================
echo.
echo Membuka aplikasi...
echo Data tersimpan di localStorage perangkat.
echo.
start "" "index.html"
echo Jika ingin mode server lokal, jalankan: py server.py
pause

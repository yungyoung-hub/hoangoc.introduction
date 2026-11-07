@echo off
rem Double-click to open the portfolio: starts the local server, then opens it in your browser.
rem Keep the server window open while viewing; close it to stop.
cd /d "%~dp0"
start "Portfolio server - dong cua so nay de tat" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
timeout /t 2 /nobreak >nul
start "" http://localhost:8080/

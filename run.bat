@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0kankanews-bypass.ps1"
pause

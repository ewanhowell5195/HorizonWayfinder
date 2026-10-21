@echo off
node "%~dp0import.js" remove %*
python "%~dp0..\tools\depth\views.py"
pause

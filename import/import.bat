@echo off
node "%~dp0import.js"
python "%~dp0..\tools\depth\views.py"
pause

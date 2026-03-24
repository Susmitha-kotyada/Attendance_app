@echo off
title Attendance App Server
color 0B
echo ===================================================
echo     Student Attendance App - Server Manager
echo ===================================================
echo.

:loop
echo [%time%] Starting the Node.js Server...
node server.js

echo.
echo ===================================================
echo [!] SERVER CRASHED OR STOPPED!
echo [!] Restarting automatically in 3 seconds...
echo ===================================================
timeout /t 3 /nobreak >nul
goto loop

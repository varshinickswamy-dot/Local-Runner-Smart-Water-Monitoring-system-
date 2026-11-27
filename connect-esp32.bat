@echo off
REM Uploads the JalRakshak code to the USB-connected ESP32 and
REM connects it to the website. The website must already be
REM running (start-jalrakshak.bat).
powershell -ExecutionPolicy Bypass -File "%~dp0esp32\connect-esp32.ps1" %*
pause
